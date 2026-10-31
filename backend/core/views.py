
from datetime import date, datetime, timedelta
import hashlib
import uuid
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core import signing
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    FoodRating,
    Ingredient,
    MenuCategory,
    MenuItem,
    MenuVote,
    Order,
    OrderItem,
    PurchaseOrder,
    Restaurant,
    RestaurantMembership,
    RestaurantNotification,
    RestaurantSetting,
)

from .serializers import (
    FoodRatingSerializer,
    MenuVoteSerializer,
    RestaurantNotificationSerializer,
    RestaurantSerializer,
    RestaurantSettingSerializer,
    MenuCategorySerializer,
    MenuItemSerializer,
    OrderSerializer,
    OrderCreateSerializer,
)

from .order_events import broadcast_order_event
from .restaurant_permissions import (
    accessible_restaurant_ids,
    has_restaurant_role,
)


MANAGER_ROLES = [RestaurantMembership.Role.MANAGER]
OPERATIONAL_ROLES = [
    RestaurantMembership.Role.STAFF,
    RestaurantMembership.Role.MANAGER,
]
MENU_VOTE_COOKIE = "qiosk_menu_voter"
MENU_VOTE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365


def _anonymous_voter_key(request, create=False):
    signed_key = request.COOKIES.get(MENU_VOTE_COOKIE)
    if signed_key:
        try:
            return hashlib.sha256(
                signing.loads(
                    signed_key,
                    salt="core.menu-vote",
                    max_age=MENU_VOTE_COOKIE_MAX_AGE,
                ).encode("ascii")
            ).hexdigest(), None
        except signing.BadSignature:
            pass

    if not create:
        return None, None

    voter_id = uuid.uuid4().hex
    cookie_value = signing.dumps(voter_id, salt="core.menu-vote")
    return hashlib.sha256(voter_id.encode("ascii")).hexdigest(), cookie_value


def _membership_denial(request, restaurant_id, roles=None):
    if has_restaurant_role(request.user, restaurant_id, roles):
        return None
    return Response(
        {"detail": "You do not have access to this restaurant."},
        status=status.HTTP_403_FORBIDDEN,
    )


def _membership_restaurants(user):
    restaurant_ids = accessible_restaurant_ids(user)
    if restaurant_ids is None:
        return Restaurant.objects.all()
    return Restaurant.objects.filter(pk__in=restaurant_ids)


def _restaurant_filter_for_user(request, roles=None):
    restaurant_id = request.query_params.get("restaurant_id") or request.data.get("restaurant_id")
    if restaurant_id is None:
        if request.user.is_superuser:
            return Restaurant.objects.all(), None
        restaurant_ids = accessible_restaurant_ids(request.user, roles)
        if not restaurant_ids:
            return Restaurant.objects.none(), Response(
                {"detail": "You do not have access to any restaurants."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Restaurant.objects.filter(pk__in=restaurant_ids), None

    if not str(restaurant_id).isdigit():
        return Restaurant.objects.none(), Response(
            {"detail": "restaurant_id must be a positive integer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    restaurant_id = int(restaurant_id)
    if not has_restaurant_role(request.user, restaurant_id, roles):
        return Restaurant.objects.none(), Response(
            {"detail": "You do not have access to this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return Restaurant.objects.filter(pk=restaurant_id), None


def _ensure_restaurant_setting(restaurant):
    return RestaurantSetting.objects.get_or_create(
        restaurant=restaurant,
        defaults={
            "restaurant_name": restaurant.name,
            "contact_email": "",
            "phone": "",
            "address": restaurant.address,
            "currency": "INR",
            "timezone": "UTC",
        },
    )[0]


def _create_restaurant_notification(restaurant_id, event_type, title, message, reference_id=None):
    if RestaurantNotification.objects.filter(
        restaurant_id=restaurant_id,
        event_type=event_type,
        reference_id=reference_id,
        is_read=False,
    ).exists():
        return None

    return RestaurantNotification.objects.create(
        restaurant_id=restaurant_id,
        event_type=event_type,
        title=title,
        message=message,
        reference_id=reference_id,
    )


# -------------------------
# HEALTH CHECK
# -------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        "success": True,
        "message": "Qiosk API is running successfully.",
    })


# -------------------------
# RESTAURANT MANAGEMENT
# -------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def restaurant_list(request):
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )
    if include_inactive:
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication is required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        restaurants = _membership_restaurants(request.user)
    else:
        restaurants = Restaurant.objects.filter(is_active=True)

    serializer = RestaurantSerializer(
        restaurants,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def public_restaurant_list(request):
    restaurants = Restaurant.objects.filter(is_active=True).order_by("name")
    return Response(
        [{"id": restaurant.pk, "name": restaurant.name} for restaurant in restaurants]
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def public_live_display(request):
    restaurant_id = request.query_params.get("restaurant_id")
    if not restaurant_id or not str(restaurant_id).isdigit():
        return Response(
            {"detail": "A valid restaurant_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    restaurant = get_object_or_404(
        Restaurant,
        pk=int(restaurant_id),
        is_active=True,
    )
    public_statuses = [
        Order.OrderStatus.CONFIRMED,
        Order.OrderStatus.PREPARING,
        Order.OrderStatus.READY,
    ]
    orders = Order.objects.filter(
        restaurant=restaurant,
        status__in=public_statuses,
    ).order_by("-created_at")[:50]
    return Response(
        {
            "restaurant": {"id": restaurant.pk, "name": restaurant.name},
            "orders": [
                {
                    "public_number": str(order.order_number).replace("-", "")[:8].upper(),
                    "status": order.status,
                    "created_at": order.created_at,
                }
                for order in orders
            ],
        }
    )


@api_view(["POST"])
def create_restaurant(request):
    if not request.user.is_superuser:
        return Response(
            {"detail": "Only a superuser can create restaurants."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = RestaurantSerializer(
        data=request.data,
        context={"request": request},
    )

    if serializer.is_valid():
        restaurant = serializer.save()

        return Response(
            RestaurantSerializer(
                restaurant,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PATCH"])
def update_restaurant(request, pk):
    restaurant = get_object_or_404(Restaurant, pk=pk)
    denied = _membership_denial(
        request,
        restaurant.pk,
        MANAGER_ROLES,
    )
    if denied:
        return denied

    serializer = RestaurantSerializer(
        restaurant,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
        updated_restaurant = serializer.save()

        return Response(
            RestaurantSerializer(
                updated_restaurant,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


# -------------------------
# CATEGORY MANAGEMENT
# -------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def menu_category_list(request):
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )

    if include_inactive:
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication is required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        categories = MenuCategory.objects.filter(
            restaurant__in=_membership_restaurants(request.user),
        ).select_related("restaurant")
    else:
        categories = MenuCategory.objects.filter(
            is_active=True,
            restaurant__is_active=True,
        ).select_related("restaurant")

    restaurant_id = request.query_params.get("restaurant_id")

    if restaurant_id:
        categories = categories.filter(
            restaurant_id=restaurant_id
        )

    serializer = MenuCategorySerializer(
        categories,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["POST"])
def create_category(request):
    serializer = MenuCategorySerializer(
        data=request.data,
        context={"request": request},
    )

    if serializer.is_valid():
        denied = _membership_denial(
            request,
            serializer.validated_data["restaurant"].pk,
            MANAGER_ROLES,
        )
        if denied:
            return denied

        category = serializer.save()

        return Response(
            MenuCategorySerializer(
                category,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PATCH"])
def update_category(request, pk):
    category = get_object_or_404(
        MenuCategory,
        pk=pk,
    )
    denied = _membership_denial(
        request,
        category.restaurant_id,
        MANAGER_ROLES,
    )
    if denied:
        return denied

    serializer = MenuCategorySerializer(
        category,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
        target_restaurant = serializer.validated_data.get(
            "restaurant",
            category.restaurant,
        )
        denied = _membership_denial(
            request,
            target_restaurant.pk,
            MANAGER_ROLES,
        )
        if denied:
            return denied

        updated_category = serializer.save()

        return Response(
            MenuCategorySerializer(
                updated_category,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


# -------------------------
# MENU ITEM MANAGEMENT
# -------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def menu_item_list(request):
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )

    if include_inactive:
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication is required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        items = MenuItem.objects.all().select_related(
            "category",
            "category__restaurant",
        ).filter(
            category__restaurant__in=_membership_restaurants(request.user)
        )
    else:
        items = MenuItem.objects.filter(
            is_active=True,
            category__is_active=True,
            category__restaurant__is_active=True,
        ).select_related(
            "category",
            "category__restaurant",
        )

    category_id = request.query_params.get("category_id")

    if category_id:
        items = items.filter(category_id=category_id)

    serializer = MenuItemSerializer(
        items,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["POST"])
def create_menu_item(request):
    serializer = MenuItemSerializer(
        data=request.data,
        context={"request": request},
    )

    if serializer.is_valid():
        category = serializer.validated_data["category"]
        denied = _membership_denial(
            request,
            category.restaurant_id,
            MANAGER_ROLES,
        )
        if denied:
            return denied

        menu_item = serializer.save()

        return Response(
            MenuItemSerializer(
                menu_item,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PATCH"])
def update_menu_item(request, pk):
    menu_item = get_object_or_404(
        MenuItem,
        pk=pk,
    )
    denied = _membership_denial(
        request,
        menu_item.category.restaurant_id,
        MANAGER_ROLES,
    )
    if denied:
        return denied

    serializer = MenuItemSerializer(
        menu_item,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
        target_category = serializer.validated_data.get(
            "category",
            menu_item.category,
        )
        denied = _membership_denial(
            request,
            target_category.restaurant_id,
            MANAGER_ROLES,
        )
        if denied:
            return denied

        updated_item = serializer.save()

        return Response(
            MenuItemSerializer(
                updated_item,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


# -------------------------
# ORDER MANAGEMENT
# -------------------------

@api_view(["GET"])
def order_list(request):
    orders = Order.objects.select_related(
        "restaurant"
    ).prefetch_related(
        "items"
    )

    restaurant_id = request.query_params.get("restaurant_id")
    order_status = request.query_params.get("status")

    if restaurant_id:
        denied = _membership_denial(
            request,
            restaurant_id,
            OPERATIONAL_ROLES,
        )
        if denied:
            return denied
        orders = orders.filter(restaurant_id=restaurant_id)
    elif not request.user.is_superuser:
        orders = orders.filter(
            restaurant_id__in=accessible_restaurant_ids(
                request.user,
                OPERATIONAL_ROLES,
            )
        )

    if order_status:
        valid_statuses = [
            choice[0]
            for choice in Order.OrderStatus.choices
        ]

        if order_status not in valid_statuses:
            return Response(
                {"error": "Invalid order status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = orders.filter(status=order_status)

    serializer = OrderSerializer(
        orders,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([AllowAny])
def create_order(request):
    serializer = OrderCreateSerializer(data=request.data)

    if serializer.is_valid():
        order = serializer.save()

        order_data = OrderSerializer(
            order,
            context={"request": request},
        ).data

        transaction.on_commit(
            lambda: broadcast_order_event(
                "order.created",
                order_data,
            )
        )

        return Response(
            order_data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["PATCH"])
@transaction.atomic
def update_order_status(request, pk):
    """
    Update an order's status safely and broadcast the change.

    The database row lock prevents simultaneous requests from
    validating against the same stale order status.
    """

    # Lock this order until the transaction completes.
    order = get_object_or_404(
        Order.objects.select_for_update(),
        pk=pk,
    )
    denied = _membership_denial(
        request,
        order.restaurant_id,
        OPERATIONAL_ROLES,
    )
    if denied:
        return denied

    new_status = request.data.get("status")

    valid_statuses = [
        choice[0]
        for choice in Order.OrderStatus.choices
    ]

    if new_status not in valid_statuses:
        return Response(
            {
                "error": "Invalid status.",
                "valid_statuses": valid_statuses,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    allowed_transitions = {
        "PENDING": ["CONFIRMED", "CANCELLED"],
        "CONFIRMED": ["PREPARING", "CANCELLED"],
        "PREPARING": ["READY"],
        "READY": ["COMPLETED"],
        "COMPLETED": [],
        "CANCELLED": [],
    }

    if new_status not in allowed_transitions[order.status]:
        return Response(
            {
                "error": (
                    f"Cannot change status from "
                    f"{order.status} to {new_status}."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    order.status = new_status
    order.save(update_fields=["status", "updated_at"])

    order_data = OrderSerializer(
        order,
        context={"request": request},
    ).data

    # Broadcast only after the database transaction commits.
    transaction.on_commit(
        lambda: broadcast_order_event(
            "order.updated",
            order_data,
        )
    )

    _create_restaurant_notification(
        order.restaurant_id,
        RestaurantNotification.EventType.ORDER,
        f"Order {order.order_number}",
        f"Order status updated to {order.status}.",
        order.pk,
    )

    return Response(
        order_data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def analytics_summary(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication is required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    restaurant_queryset, error = _restaurant_filter_for_user(
        request,
        OPERATIONAL_ROLES,
    )
    if error:
        return error

    sales_orders = Order.objects.filter(restaurant__in=restaurant_queryset)
    qs = sales_orders
    report_timezone = timezone.get_current_timezone()
    requested_restaurant_id = request.query_params.get("restaurant_id")
    if requested_restaurant_id:
        configured_timezone = RestaurantSetting.objects.filter(
            restaurant_id=int(requested_restaurant_id),
        ).values_list("timezone", flat=True).first()
        if configured_timezone:
            try:
                report_timezone = ZoneInfo(configured_timezone)
            except ZoneInfoNotFoundError:
                return Response(
                    {"detail": "The restaurant timezone setting is invalid."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")
    today = timezone.now().astimezone(report_timezone).date()

    if start_date:
        try:
            parsed_start_date = date.fromisoformat(start_date)
        except (TypeError, ValueError):
            return Response(
                {"detail": "start_date must be in YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if parsed_start_date.isoformat() != start_date:
            return Response(
                {"detail": "start_date must be in YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        start_bound = timezone.make_aware(
            datetime.combine(parsed_start_date, datetime.min.time()),
            report_timezone,
        )
        qs = qs.filter(created_at__gte=start_bound)
    if end_date:
        try:
            parsed_end_date = date.fromisoformat(end_date)
        except (TypeError, ValueError):
            return Response(
                {"detail": "end_date must be in YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if parsed_end_date.isoformat() != end_date:
            return Response(
                {"detail": "end_date must be in YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        end_bound = timezone.make_aware(
            datetime.combine(parsed_end_date + timedelta(days=1), datetime.min.time()),
            report_timezone,
        )
        qs = qs.filter(created_at__lt=end_bound)

    if start_date and end_date and parsed_start_date > parsed_end_date:
        return Response(
            {"detail": "start_date must be on or before end_date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not start_date and not end_date:
        qs = qs.filter(
            created_at__gte=timezone.make_aware(
                datetime.combine(today - timedelta(days=30), datetime.min.time()),
                report_timezone,
            )
        )

    total_revenue = qs.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
    order_count = qs.count()
    avg_order_value = (total_revenue / order_count) if order_count else Decimal("0.00")

    status_counts = {
        status: qs.filter(status=status).count()
        for status, _ in Order.OrderStatus.choices
    }

    series_start_value = request.query_params.get("series_start_date")
    series_end_value = request.query_params.get("series_end_date")
    if bool(series_start_value) != bool(series_end_value):
        return Response(
            {"detail": "series_start_date and series_end_date must be provided together."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if series_start_value:
        try:
            series_start_date = date.fromisoformat(series_start_value)
            series_end_date = date.fromisoformat(series_end_value)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Sales series dates must use YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            series_start_date.isoformat() != series_start_value
            or series_end_date.isoformat() != series_end_value
        ):
            return Response(
                {"detail": "Sales series dates must use YYYY-MM-DD format."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if series_start_date > series_end_date:
            return Response(
                {"detail": "series_start_date must be on or before series_end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (series_end_date - series_start_date).days > 30:
            return Response(
                {"detail": "Sales series ranges cannot exceed 31 days."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        series_start_date = today - timedelta(days=6)
        series_end_date = today

    sales_series = []
    for offset in range((series_end_date - series_start_date).days + 1):
        day = series_start_date + timedelta(days=offset)
        day_start = timezone.make_aware(
            datetime.combine(day, datetime.min.time()),
            report_timezone,
        )
        next_day_start = timezone.make_aware(
            datetime.combine(day + timedelta(days=1), datetime.min.time()),
            report_timezone,
        )
        day_total = sales_orders.filter(
            created_at__gte=day_start,
            created_at__lt=next_day_start,
        ).aggregate(
            value=Sum("total_amount")
        )["value"] or Decimal("0.00")
        sales_series.append({
            "date": day.isoformat(),
            "label": day.strftime("%a" if (series_end_date - series_start_date).days <= 6 else "%d %b"),
            "value": float(day_total),
        })

    best_sellers = (
        OrderItem.objects.filter(order__in=qs)
        .values("menu_item__name", "menu_item__category__name")
        .annotate(
            sold=Sum("quantity"),
            revenue=Sum(F("unit_price") * F("quantity")),
        )
        .order_by("-sold")[:5]
    )

    ingredient_queryset = Ingredient.objects.filter(
        restaurant__in=restaurant_queryset,
        is_active=True,
    )
    low_stock_count = ingredient_queryset.filter(
        current_quantity__lte=F("minimum_quantity")
    ).count()
    purchase_queryset = PurchaseOrder.objects.filter(
        restaurant__in=restaurant_queryset,
    )
    purchase_status_counts = {
        purchase_status: purchase_queryset.filter(status=purchase_status).count()
        for purchase_status, _ in PurchaseOrder.Status.choices
    }
    vote_options = MenuItem.objects.filter(
        category__restaurant__in=restaurant_queryset,
        category__is_active=True,
        is_active=True,
    )

    payload = {
        "restaurant_id": int(
            request.query_params.get("restaurant_id")
            or (
                restaurant_queryset.first().pk
                if restaurant_queryset.exists()
                else 0
            )
        ),
        "period": {
            "start_date": start_date or (today - timedelta(days=30)).isoformat(),
            "end_date": end_date or today.isoformat(),
        },
        "summary": {
            "revenue": float(total_revenue),
            "orders": order_count,
            "average_order_value": float(avg_order_value),
            "completed_orders": qs.filter(status=Order.OrderStatus.COMPLETED).count(),
            "cancelled_orders": qs.filter(status=Order.OrderStatus.CANCELLED).count(),
            "pending_orders": qs.filter(status=Order.OrderStatus.PENDING).count(),
        },
        "status_counts": status_counts,
        "sales_series": sales_series,
        "best_sellers": [
            {
                "name": item["menu_item__name"],
                "category": item["menu_item__category__name"],
                "sold": item["sold"],
                "revenue": float(item["revenue"] or Decimal("0.00")),
            }
            for item in best_sellers
        ],
        "inventory_summary": {
            "low_stock_items": low_stock_count,
            "total_items": ingredient_queryset.count(),
        },
        "menu_summary": {
            "active_items": vote_options.count(),
        },
        "purchase_summary": {
            "orders": purchase_queryset.count(),
            "receipts": purchase_status_counts[PurchaseOrder.Status.RECEIVED],
            "pending": purchase_queryset.filter(
                status__in=[
                    PurchaseOrder.Status.PENDING,
                    PurchaseOrder.Status.APPROVED,
                    PurchaseOrder.Status.PARTIALLY_RECEIVED,
                ]
            ).count(),
            "status_counts": purchase_status_counts,
        },
        "voting_summary": {
            "eligible_options": vote_options.count(),
            "votes_today": MenuVote.objects.filter(
                restaurant__in=restaurant_queryset,
                vote_date=today,
            ).count(),
        },
    }
    return Response(payload)


@api_view(["GET", "POST", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def menu_vote_view(request):
    restaurant_id = (
        request.query_params.get("restaurant_id")
        or request.data.get("restaurant_id")
    )
    if not restaurant_id:
        return Response({"detail": "restaurant_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not str(restaurant_id).isdigit():
        return Response({"detail": "restaurant_id must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

    restaurant_id = int(restaurant_id)
    restaurant = get_object_or_404(Restaurant, pk=restaurant_id, is_active=True)
    manage = request.query_params.get("manage") == "true"

    if manage or request.method in {"PATCH", "DELETE"}:
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication is required for voting administration."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        denied = _membership_denial(
            request,
            restaurant_id,
            (
                MANAGER_ROLES
                if request.method in {"PATCH", "DELETE"}
                else OPERATIONAL_ROLES
            ),
        )
        if denied:
            return denied

    setting = _ensure_restaurant_setting(restaurant)
    try:
        poll_timezone = ZoneInfo(setting.timezone)
    except ZoneInfoNotFoundError:
        return Response(
            {"detail": "The restaurant timezone setting is invalid."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    vote_date = timezone.now().astimezone(poll_timezone).date()
    voting_is_open = setting.menu_voting_enabled
    options = MenuItem.objects.filter(
        category__restaurant=restaurant,
        category__is_active=True,
        is_active=True,
    ).select_related("category").order_by("category__name", "name")

    if request.method == "GET":
        if manage:
            votes = MenuVote.objects.filter(
                restaurant=restaurant,
                vote_date=vote_date,
            ).select_related("menu_item")
            return Response(
                {
                    "restaurant": {"id": restaurant.pk, "name": restaurant.name},
                    "vote_date": vote_date,
                    "is_open": voting_is_open,
                    "total_votes": votes.count(),
                    "options": [
                        {
                            "id": item.pk,
                            "name": item.name,
                            "category": item.category.name,
                            "votes": votes.filter(menu_item=item).count(),
                        }
                        for item in options
                    ],
                }
            )

        voter_key = None
        cookie_value = None
        user = request.user if request.user.is_authenticated else None
        if user is None:
            voter_key, cookie_value = _anonymous_voter_key(request, create=True)
        existing_vote = MenuVote.objects.filter(
            restaurant=restaurant,
            vote_date=vote_date,
            **({"user": user} if user else {"anonymous_key": voter_key}),
        ).first()
        response = Response(
            {
                "restaurant": {"id": restaurant.pk, "name": restaurant.name},
                "period": {
                    "vote_date": vote_date,
                    "starts_at": timezone.make_aware(
                        datetime.combine(vote_date, datetime.min.time()),
                        poll_timezone,
                    ),
                    "ends_at": timezone.make_aware(
                        datetime.combine(vote_date + timedelta(days=1), datetime.min.time()),
                        poll_timezone,
                    ),
                    "is_open": voting_is_open,
                },
                "results_visible": not voting_is_open,
                "total_votes": (
                    MenuVote.objects.filter(
                        restaurant=restaurant,
                        vote_date=vote_date,
                    ).count()
                    if not voting_is_open
                    else None
                ),
                "my_vote": existing_vote.menu_item_id if existing_vote else None,
                "options": [
                    {
                        "id": item.pk,
                        "name": item.name,
                        "description": item.description,
                        "category": item.category.name,
                        "price": item.price,
                        **(
                            {
                                "votes": MenuVote.objects.filter(
                                    restaurant=restaurant,
                                    vote_date=vote_date,
                                    menu_item=item,
                                ).count()
                            }
                            if not voting_is_open
                            else {}
                        ),
                    }
                    for item in options
                ],
            }
        )
        if cookie_value:
            response.set_cookie(
                MENU_VOTE_COOKIE,
                cookie_value,
                max_age=MENU_VOTE_COOKIE_MAX_AGE,
                httponly=True,
                secure=request.is_secure(),
                samesite="Lax",
            )
        return response

    if request.method == "DELETE":
        deleted, _ = MenuVote.objects.filter(
            restaurant=restaurant,
            vote_date=vote_date,
        ).delete()
        return Response({"deleted": deleted})

    if request.method == "PATCH":
        is_open = request.data.get("is_open")
        if not isinstance(is_open, bool):
            return Response(
                {"detail": "is_open must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        setting.menu_voting_enabled = is_open
        setting.save(update_fields=["menu_voting_enabled", "updated_at"])
        return Response({"is_open": setting.menu_voting_enabled})

    menu_item_id = request.data.get("menu_item_id")
    if not menu_item_id:
        return Response({"detail": "menu_item_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not str(menu_item_id).isdigit():
        return Response(
            {"detail": "menu_item_id must be a positive integer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    menu_item = options.filter(pk=menu_item_id).first()
    if menu_item is None:
        return Response(
            {"detail": "This menu item is not eligible for the active voting period."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not voting_is_open:
        return Response(
            {"detail": "Voting is closed for this period."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user if request.user.is_authenticated else None
    voter_key = None
    cookie_value = None
    if user is None:
        voter_key, cookie_value = _anonymous_voter_key(request, create=True)
    identity = {"user": user} if user else {"anonymous_key": voter_key}
    try:
        with transaction.atomic():
            vote = MenuVote.objects.create(
                restaurant=restaurant,
                menu_item=menu_item,
                vote_date=vote_date,
                **identity,
            )
    except IntegrityError:
        if not MenuVote.objects.filter(
            restaurant=restaurant,
            vote_date=vote_date,
            **identity,
        ).exists():
            raise
        return Response(
            {"detail": "You have already voted in this restaurant's active poll."},
            status=status.HTTP_409_CONFLICT,
        )

    response = Response(
        {
            "id": vote.pk,
            "menu_item": vote.menu_item_id,
            "menu_item_name": vote.menu_item.name,
            "vote_date": vote.vote_date,
            "detail": "Your vote has been recorded.",
        },
        status=status.HTTP_201_CREATED,
    )
    if cookie_value:
        response.set_cookie(
            MENU_VOTE_COOKIE,
            cookie_value,
            max_age=MENU_VOTE_COOKIE_MAX_AGE,
            httponly=True,
            secure=request.is_secure(),
            samesite="Lax",
        )
    return response


@api_view(["GET", "POST"])
def food_rating_view(request):
    if not request.user.is_authenticated:
        return Response(
            {"detail": "Authentication is required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    restaurant_id = request.query_params.get("restaurant_id") or request.data.get("restaurant_id")
    if not restaurant_id:
        return Response({"detail": "restaurant_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not str(restaurant_id).isdigit():
        return Response({"detail": "restaurant_id must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

    restaurant_id = int(restaurant_id)
    if not has_restaurant_role(request.user, restaurant_id, OPERATIONAL_ROLES):
        return Response({"detail": "You do not have access to this restaurant."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        ratings = FoodRating.objects.filter(restaurant_id=restaurant_id).select_related("menu_item", "order", "user")
        return Response(FoodRatingSerializer(ratings, many=True).data)

    order_id = request.data.get("order") or request.data.get("order_id")
    menu_item_id = request.data.get("menu_item") or request.data.get("menu_item_id")
    rating_value = request.data.get("rating")
    if order_id is None or menu_item_id is None or rating_value is None:
        return Response({"detail": "order, menu_item and rating are required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        rating_value = int(rating_value)
    except (TypeError, ValueError):
        return Response({"detail": "rating must be an integer between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)
    if not 1 <= rating_value <= 5:
        return Response({"detail": "rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)

    order = get_object_or_404(Order.objects.select_related("restaurant"), pk=order_id, restaurant_id=restaurant_id)
    menu_item = get_object_or_404(MenuItem.objects.select_related("category__restaurant"), pk=menu_item_id)
    if menu_item.category.restaurant_id != restaurant_id:
        return Response({"detail": "This menu item does not belong to the selected restaurant."}, status=status.HTTP_400_BAD_REQUEST)
    if not order.items.filter(menu_item_id=menu_item_id).exists():
        return Response({"detail": "This item was not part of the selected order."}, status=status.HTTP_400_BAD_REQUEST)

    rating, created = FoodRating.objects.get_or_create(
        restaurant_id=restaurant_id,
        order_id=order_id,
        user=request.user,
        defaults={
            "menu_item": menu_item,
            "rating": rating_value,
            "comment": request.data.get("comment", ""),
        },
    )
    if not created:
        rating.menu_item = menu_item
        rating.rating = rating_value
        rating.comment = request.data.get("comment", rating.comment)
        rating.save(update_fields=["menu_item", "rating", "comment"])

    return Response(
        FoodRatingSerializer(rating).data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["GET", "PATCH"])
def restaurant_settings_view(request, restaurant_id=None):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication is required."}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant_id = (
        restaurant_id
        or request.query_params.get("restaurant_id")
        or request.data.get("restaurant_id")
    )
    if not restaurant_id:
        return Response({"detail": "restaurant_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not str(restaurant_id).isdigit():
        return Response({"detail": "restaurant_id must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

    restaurant = get_object_or_404(Restaurant, pk=int(restaurant_id))
    if not has_restaurant_role(request.user, restaurant.pk, MANAGER_ROLES):
        return Response({"detail": "Manager access is required for this restaurant."}, status=status.HTTP_403_FORBIDDEN)

    setting = _ensure_restaurant_setting(restaurant)
    if request.method == "GET":
        return Response(RestaurantSettingSerializer(setting).data)

    payload = dict(request.data)
    payload.pop("restaurant_id", None)
    serializer = RestaurantSettingSerializer(setting, data=payload, partial=True)
    if serializer.is_valid():
        updated = serializer.save()
        return Response(RestaurantSettingSerializer(updated).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PATCH"])
def restaurant_notifications_view(request, notification_id=None):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication is required."}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant_id = request.query_params.get("restaurant_id") or request.data.get("restaurant_id")
    if not restaurant_id:
        return Response({"detail": "restaurant_id is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not str(restaurant_id).isdigit():
        return Response({"detail": "restaurant_id must be a positive integer."}, status=status.HTTP_400_BAD_REQUEST)

    restaurant = get_object_or_404(Restaurant, pk=int(restaurant_id))
    if not has_restaurant_role(request.user, restaurant.pk, OPERATIONAL_ROLES):
        return Response({"detail": "You do not have access to this restaurant."}, status=status.HTTP_403_FORBIDDEN)

    qs = RestaurantNotification.objects.filter(restaurant=restaurant)
    if notification_id is not None:
        notification = get_object_or_404(qs, pk=notification_id)
        if request.method == "PATCH":
            notification.is_read = True
            notification.save(update_fields=["is_read"])
        return Response(RestaurantNotificationSerializer(notification).data)

    if request.query_params.get("unread_only") == "true":
        qs = qs.filter(is_read=False)
    return Response(RestaurantNotificationSerializer(qs, many=True).data)
