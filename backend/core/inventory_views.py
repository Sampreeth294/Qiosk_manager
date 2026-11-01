from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .inventory_serializers import (
    IngredientSerializer,
    StockAdjustmentSerializer,
    StockChangeSerializer,
    StockMovementSerializer,
)
from .models import (
    Ingredient,
    PurchaseOrder,
    PurchaseOrderLine,
    Restaurant,
    RestaurantMembership,
    RestaurantNotification,
    StockMovement,
    Supplier,
)
from .procurement_serializers import (
    PurchaseOrderCreateSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderStatusSerializer,
    PurchaseReceiptSerializer,
    SupplierSerializer,
)
from .restaurant_permissions import (
    accessible_restaurant_ids,
    has_restaurant_role,
)


MANAGER_ROLES = [
    RestaurantMembership.Role.OWNER,
    RestaurantMembership.Role.MANAGER,
]
OPERATIONAL_ROLES = [
    RestaurantMembership.Role.STAFF,
    RestaurantMembership.Role.MANAGER,
    RestaurantMembership.Role.OWNER,
]


def _restaurant_queryset(user):
    restaurant_ids = accessible_restaurant_ids(user)
    if restaurant_ids is None:
        return Restaurant.objects.all()
    return Restaurant.objects.filter(pk__in=restaurant_ids)


def _restaurant_filter(request, queryset, lookup="restaurant_id"):
    restaurant_id = request.query_params.get("restaurant_id")
    if restaurant_id:
        if not restaurant_id.isdigit():
            return queryset.none(), Response(
                {"detail": "restaurant_id must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not has_restaurant_role(
            request.user,
            int(restaurant_id),
            OPERATIONAL_ROLES,
        ):
            return queryset.none(), Response(
                {"detail": "You do not have access to this restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )
        queryset = queryset.filter(**{lookup: int(restaurant_id)})
    else:
        queryset = queryset.filter(
            **{f"{lookup}__in": _restaurant_queryset(request.user)}
        )
    return queryset, None


def _conflict(message):
    return Response(
        {"detail": message},
        status=status.HTTP_409_CONFLICT,
    )


def _create_low_stock_notification(ingredient):
    if getattr(ingredient, "restaurant", None) and hasattr(ingredient.restaurant, "settings"):
        if not ingredient.restaurant.settings.low_stock_notifications:
            return None
    if RestaurantNotification.objects.filter(
        restaurant_id=ingredient.restaurant_id,
        event_type=RestaurantNotification.EventType.LOW_STOCK,
        reference_id=ingredient.pk,
        is_read=False,
    ).exists():
        return None
    return RestaurantNotification.objects.create(
        restaurant=ingredient.restaurant,
        event_type=RestaurantNotification.EventType.LOW_STOCK,
        title=f"Low stock: {ingredient.name}",
        message=(
            f"{ingredient.name} is at {ingredient.current_quantity} {ingredient.unit}, "
            f"below the minimum quantity of {ingredient.minimum_quantity}."
        ),
        reference_id=ingredient.pk,
    )


def _movement_matches(movement, ingredient, movement_type, delta, data):
    return (
        movement.ingredient_id == ingredient.pk
        and movement.movement_type == movement_type
        and movement.quantity_delta == delta
        and movement.reason == data["reason"]
        and movement.reference == data.get("reference", "")
    )


def _record_stock_change(
    request,
    ingredient_id,
    movement_type,
    quantity_delta,
    data,
    roles,
):
    key = data["idempotency_key"]
    try:
        with transaction.atomic():
            ingredient = get_object_or_404(
                Ingredient.objects.select_for_update().filter(
                    restaurant__in=_restaurant_queryset(request.user)
                ),
                pk=ingredient_id,
                is_active=True,
            )
            if not has_restaurant_role(
                request.user,
                ingredient.restaurant_id,
                roles,
            ):
                return Response(
                    {"detail": "You do not have access to this restaurant."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            existing = StockMovement.objects.filter(
                idempotency_key=key,
            ).first()
            if existing:
                if _movement_matches(
                    existing,
                    ingredient,
                    movement_type,
                    quantity_delta,
                    data,
                ):
                    return Response(
                        StockMovementSerializer(existing).data,
                        status=status.HTTP_200_OK,
                    )
                return _conflict(
                    "This idempotency key was already used for another movement."
                )

            before = ingredient.current_quantity
            after = before + quantity_delta
            if after < 0:
                return Response(
                    {"detail": "Stock cannot be reduced below zero."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ingredient.current_quantity = after
            ingredient.save(
                update_fields=["current_quantity", "updated_at"]
            )
            if ingredient.current_quantity <= ingredient.minimum_quantity:
                _create_low_stock_notification(ingredient)
            movement = StockMovement.objects.create(
                ingredient=ingredient,
                movement_type=movement_type,
                quantity_delta=quantity_delta,
                quantity_before=before,
                quantity_after=after,
                reason=data["reason"],
                reference=data.get("reference", ""),
                idempotency_key=key,
                created_by=request.user,
            )
    except IntegrityError:
        existing = StockMovement.objects.filter(
            idempotency_key=key,
        ).first()
        if existing and _movement_matches(
            existing,
            ingredient,
            movement_type,
            quantity_delta,
            data,
        ):
            return Response(
                StockMovementSerializer(existing).data,
                status=status.HTTP_200_OK,
            )
        return _conflict(
            "This idempotency key was already used for another movement."
        )

    return Response(
        StockMovementSerializer(movement).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "POST"])
def ingredient_list(request):
    if request.method == "GET":
        ingredients, error = _restaurant_filter(
            request,
            Ingredient.objects.select_related("restaurant", "supplier"),
        )
        if error:
            return error
        if request.query_params.get("include_inactive") != "true":
            ingredients = ingredients.filter(is_active=True)
        if request.query_params.get("low_stock") == "true":
            ingredients = ingredients.filter(
                current_quantity__lte=F("minimum_quantity")
            )
        return Response(IngredientSerializer(ingredients, many=True).data)

    serializer = IngredientSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    values = dict(serializer.validated_data)
    opening_quantity = values.pop("opening_quantity")
    restaurant = values["restaurant"]
    if not has_restaurant_role(
        request.user,
        restaurant.pk,
        MANAGER_ROLES,
    ):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )

    with transaction.atomic():
        ingredient = Ingredient.objects.create(
            **values,
            current_quantity=Decimal("0.000"),
        )
        if opening_quantity:
            ingredient.current_quantity = opening_quantity
            ingredient.save(update_fields=["current_quantity", "updated_at"])
            StockMovement.objects.create(
                ingredient=ingredient,
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                quantity_delta=opening_quantity,
                quantity_before=Decimal("0.000"),
                quantity_after=opening_quantity,
                reason="Opening balance",
                created_by=request.user,
            )
        if ingredient.current_quantity <= ingredient.minimum_quantity:
            _create_low_stock_notification(ingredient)

    return Response(
        IngredientSerializer(ingredient).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
def ingredient_detail(request, pk):
    ingredient = get_object_or_404(
        Ingredient.objects.select_related("restaurant", "supplier"),
        pk=pk,
        restaurant__in=_restaurant_queryset(request.user),
    )

    if request.method == "GET":
        return Response(IngredientSerializer(ingredient).data)

    if not has_restaurant_role(
        request.user,
        ingredient.restaurant_id,
        MANAGER_ROLES,
    ):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "DELETE":
        ingredient.is_active = False
        ingredient.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = IngredientSerializer(
        ingredient,
        data=request.data,
        partial=True,
    )
    if serializer.is_valid():
        updated = serializer.save()
        if updated.current_quantity <= updated.minimum_quantity:
            _create_low_stock_notification(updated)
        return Response(IngredientSerializer(updated).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def low_stock_ingredients(request):
    ingredients, error = _restaurant_filter(
        request,
        Ingredient.objects.select_related("restaurant", "supplier"),
    )
    if error:
        return error
    ingredients = ingredients.filter(
        is_active=True,
        current_quantity__lte=F("minimum_quantity"),
    )
    return Response(IngredientSerializer(ingredients, many=True).data)


@api_view(["GET"])
def stock_movement_list(request):
    movements, error = _restaurant_filter(
        request,
        StockMovement.objects.select_related(
            "ingredient",
            "ingredient__restaurant",
            "created_by",
            "purchase_order_line",
            "order",
        ),
        lookup="ingredient__restaurant_id",
    )
    if error:
        return error
    ingredient_id = request.query_params.get("ingredient_id")
    if ingredient_id:
        if not ingredient_id.isdigit():
            return Response(
                {"detail": "ingredient_id must be a positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        movements = movements.filter(ingredient_id=int(ingredient_id))
    return Response(StockMovementSerializer(movements, many=True).data)


@api_view(["POST"])
def receive_stock(request, pk):
    serializer = StockChangeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    return _record_stock_change(
        request,
        pk,
        StockMovement.MovementType.RECEIPT,
        data["quantity"],
        data,
        OPERATIONAL_ROLES,
    )


@api_view(["POST"])
def adjust_stock(request, pk):
    serializer = StockAdjustmentSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    return _record_stock_change(
        request,
        pk,
        StockMovement.MovementType.ADJUSTMENT,
        data["quantity"],
        data,
        MANAGER_ROLES,
    )


@api_view(["POST"])
def record_wastage(request, pk):
    serializer = StockChangeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    return _record_stock_change(
        request,
        pk,
        StockMovement.MovementType.WASTAGE,
        -data["quantity"],
        data,
        OPERATIONAL_ROLES,
    )


@api_view(["GET", "POST"])
def supplier_list(request):
    if request.method == "GET":
        suppliers, error = _restaurant_filter(
            request,
            Supplier.objects.select_related("restaurant"),
        )
        if error:
            return error
        if request.query_params.get("include_inactive") != "true":
            suppliers = suppliers.filter(is_active=True)
        return Response(SupplierSerializer(suppliers, many=True).data)

    serializer = SupplierSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    restaurant = serializer.validated_data["restaurant"]
    if not has_restaurant_role(
        request.user,
        restaurant.pk,
        MANAGER_ROLES,
    ):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )
    supplier = serializer.save()
    return Response(
        SupplierSerializer(supplier).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "DELETE"])
def supplier_detail(request, pk):
    supplier = get_object_or_404(
        Supplier.objects.select_related("restaurant"),
        pk=pk,
        restaurant__in=_restaurant_queryset(request.user),
    )
    if not has_restaurant_role(
        request.user,
        supplier.restaurant_id,
        MANAGER_ROLES,
    ):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == "DELETE":
        supplier.is_active = False
        supplier.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SupplierSerializer(
        supplier,
        data=request.data,
        partial=True,
    )
    if serializer.is_valid():
        updated = serializer.save()
        return Response(SupplierSerializer(updated).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
def purchase_order_list(request):
    if request.method == "GET":
        orders, error = _restaurant_filter(
            request,
            PurchaseOrder.objects.select_related(
                "restaurant",
                "supplier",
                "created_by",
            ).prefetch_related("lines__ingredient"),
        )
        if error:
            return error
        order_status = request.query_params.get("status")
        if order_status:
            if order_status not in PurchaseOrder.Status.values:
                return Response(
                    {"detail": "Invalid purchase order status."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            orders = orders.filter(status=order_status)
        return Response(PurchaseOrderSerializer(orders, many=True).data)

    serializer = PurchaseOrderCreateSerializer(
        data=request.data,
        context={"request": request},
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    restaurant = serializer.validated_data["restaurant"]
    if not has_restaurant_role(
        request.user,
        restaurant.pk,
        MANAGER_ROLES,
    ):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )
    order = serializer.save()
    return Response(
        PurchaseOrderSerializer(order).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH"])
def purchase_order_detail(request, pk):
    order = get_object_or_404(
        PurchaseOrder.objects.select_related(
            "restaurant",
            "supplier",
            "created_by",
        ).prefetch_related("lines__ingredient"),
        pk=pk,
        restaurant__in=_restaurant_queryset(request.user),
    )
    if request.method == "GET":
        return Response(PurchaseOrderSerializer(order).data)

    if not has_restaurant_role(
        request.user,
        order.restaurant_id,
        MANAGER_ROLES,
    ):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = PurchaseOrderStatusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    target_status = serializer.validated_data["status"]
    allowed = {
        PurchaseOrder.Status.DRAFT: [
            PurchaseOrder.Status.PENDING,
            PurchaseOrder.Status.CANCELLED,
        ],
        PurchaseOrder.Status.PENDING: [
            PurchaseOrder.Status.APPROVED,
            PurchaseOrder.Status.CANCELLED,
        ],
        PurchaseOrder.Status.APPROVED: [
            PurchaseOrder.Status.CANCELLED,
        ],
        PurchaseOrder.Status.PARTIALLY_RECEIVED: [],
        PurchaseOrder.Status.RECEIVED: [],
        PurchaseOrder.Status.CANCELLED: [],
    }
    if target_status not in allowed[order.status]:
        return Response(
            {"detail": f"Cannot change {order.status} to {target_status}."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if (
        target_status == PurchaseOrder.Status.CANCELLED
        and order.lines.filter(received_quantity__gt=0).exists()
    ):
        return Response(
            {"detail": "A purchase order with received stock cannot be cancelled."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    order.status = target_status
    order.save(update_fields=["status", "updated_at"])
    return Response(PurchaseOrderSerializer(order).data)


@api_view(["POST"])
def receive_purchase_order_line(request, pk):
    serializer = PurchaseReceiptSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    key = data["idempotency_key"]
    try:
        with transaction.atomic():
            line = get_object_or_404(
                PurchaseOrderLine.objects.select_for_update().select_related(
                    "purchase_order",
                    "ingredient",
                ),
                pk=pk,
                purchase_order__restaurant__in=_restaurant_queryset(
                    request.user
                ),
            )
            order = PurchaseOrder.objects.select_for_update().get(
                pk=line.purchase_order_id
            )
            if not has_restaurant_role(
                request.user,
                order.restaurant_id,
                OPERATIONAL_ROLES,
            ):
                return Response(
                    {"detail": "You do not have access to this restaurant."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            existing = StockMovement.objects.filter(
                idempotency_key=key,
            ).first()
            if existing:
                if (
                    existing.purchase_order_line_id == line.pk
                    and existing.quantity_delta == data["quantity"]
                    and existing.reason == data["reason"]
                ):
                    return Response(
                        StockMovementSerializer(existing).data,
                        status=status.HTTP_200_OK,
                    )
                return _conflict(
                    "This idempotency key was already used for another movement."
                )

            if order.status not in (
                PurchaseOrder.Status.APPROVED,
                PurchaseOrder.Status.PARTIALLY_RECEIVED,
            ):
                return Response(
                    {"detail": "Only approved purchase orders can be received."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            remaining = line.ordered_quantity - line.received_quantity
            if data["quantity"] > remaining:
                return Response(
                    {"detail": "Received quantity exceeds the remaining order quantity."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ingredient = Ingredient.objects.select_for_update().get(
                pk=line.ingredient_id,
            )
            before = ingredient.current_quantity
            after = before + data["quantity"]
            ingredient.current_quantity = after
            ingredient.save(
                update_fields=["current_quantity", "updated_at"]
            )
            line.received_quantity += data["quantity"]
            line.save(update_fields=["received_quantity"])
            movement = StockMovement.objects.create(
                ingredient=ingredient,
                purchase_order_line=line,
                movement_type=StockMovement.MovementType.RECEIPT,
                quantity_delta=data["quantity"],
                quantity_before=before,
                quantity_after=after,
                reason=data["reason"],
                reference=str(order.order_number),
                idempotency_key=key,
                created_by=request.user,
            )

            if order.lines.filter(
                received_quantity__lt=F("ordered_quantity")
            ).exists():
                order.status = PurchaseOrder.Status.PARTIALLY_RECEIVED
            else:
                order.status = PurchaseOrder.Status.RECEIVED
            order.save(update_fields=["status", "updated_at"])
    except IntegrityError:
        existing = StockMovement.objects.filter(
            idempotency_key=key,
        ).first()
        if (
            existing
            and existing.purchase_order_line_id == pk
            and existing.quantity_delta == data["quantity"]
            and existing.reason == data["reason"]
        ):
            return Response(
                StockMovementSerializer(existing).data,
                status=status.HTTP_200_OK,
            )
        return _conflict(
            "This idempotency key was already used for another movement."
        )

    return Response(
        StockMovementSerializer(movement).data,
        status=status.HTTP_201_CREATED,
    )
