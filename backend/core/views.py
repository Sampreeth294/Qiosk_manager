
from datetime import date, datetime, timedelta
import hashlib
import uuid
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from decimal import Decimal

from django.db.models import Avg, Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core import signing
from django.core.cache import cache
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Expense,
    FoodRating,
    Ingredient,
    MenuCategory,
    MenuItem,
    MenuVote,
    MenuVotingPeriod,
    Order,
    OrderItem,
    PurchaseOrder,
    Restaurant,
    RestaurantMembership,
    RestaurantNotification,
    RestaurantSetting,
)

from .serializers import (
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


MANAGER_ROLES = [
    RestaurantMembership.Role.OWNER,
    RestaurantMembership.Role.MANAGER,
]
OPERATIONAL_ROLES = [
    RestaurantMembership.Role.STAFF,
    RestaurantMembership.Role.MANAGER,
    RestaurantMembership.Role.OWNER,
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


def _request_rate_limited(request, scope, limit=120, window=3600):
    ip_address = request.META.get("REMOTE_ADDR", "unknown")
    key = f"qiosk-rate:{scope}:{hashlib.sha256(ip_address.encode()).hexdigest()}"
    if cache.add(key, 1, timeout=window):
        return False
    try:
        return cache.incr(key) > limit
    except ValueError:
        cache.add(key, 1, timeout=window)
        return False


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
        "message": "Kiosk API is running successfully.",
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
                    "public_number": order.display_order_number
                    or str(order.order_number).replace("-", "")[:8].upper(),
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
@csrf_protect
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
    if request.query_params.get("range") == "today" and not start_date and not end_date:
        start_date = end_date = today.isoformat()

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

    revenue_orders = qs.exclude(status=Order.OrderStatus.CANCELLED)
    order_count = qs.count()
    total_revenue = revenue_orders.aggregate(total=Sum("total_amount"))["total"] or Decimal("0.00")
    revenue_order_count = revenue_orders.count()
    avg_order_value = (total_revenue / revenue_order_count) if revenue_order_count else Decimal("0.00")

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
        ).exclude(status=Order.OrderStatus.CANCELLED).aggregate(
            value=Sum("total_amount")
        )["value"] or Decimal("0.00")
        sales_series.append({
            "date": day.isoformat(),
            "label": day.strftime("%a" if (series_end_date - series_start_date).days <= 6 else "%d %b"),
            "value": float(day_total),
        })

    best_sellers = (
        OrderItem.objects.filter(order__in=revenue_orders)
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
    voting_target_date = today + timedelta(days=1)
    ratings = FoodRating.objects.filter(restaurant__in=restaurant_queryset)
    rating_summary = ratings.aggregate(average=Avg("rating"), count=Count("id"))
    expense_start = date.fromisoformat(start_date) if start_date else today - timedelta(days=30)
    expense_end = date.fromisoformat(end_date) if end_date else today
    expenses = Expense.objects.filter(
        restaurant__in=restaurant_queryset,
        date__gte=expense_start,
        date__lte=expense_end,
    )
    expense_summary = expenses.aggregate(total=Sum("amount"), count=Count("id"))
    expenses_by_category = expenses.values("category").annotate(
        total=Sum("amount"),
        count=Count("id"),
    ).order_by("category")

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
        "current_status_counts": {
            order_status: sales_orders.filter(status=order_status).count()
            for order_status, _ in Order.OrderStatus.choices
        },
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
            "target_date": voting_target_date.isoformat(),
            "votes_for_tomorrow": MenuVote.objects.filter(
                restaurant__in=restaurant_queryset,
                vote_date=voting_target_date,
                menu_item__isnull=False,
            ).count(),
        },
        "rating_summary": {
            "average": float(rating_summary["average"] or 0),
            "count": rating_summary["count"],
        },
        "expense_summary": {
            "total": float(expense_summary["total"] or Decimal("0.00")),
            "count": expense_summary["count"],
            "by_category": [
                {
                    "category": item["category"],
                    "total": float(item["total"]),
                    "count": item["count"],
                }
                for item in expenses_by_category
            ],
        },
    }
    return Response(payload)


@api_view(["GET", "POST", "PATCH", "DELETE"])
@permission_classes([AllowAny])
@csrf_protect
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
            MANAGER_ROLES,
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
    local_now = timezone.now().astimezone(poll_timezone)
    target_date = local_now.date() + timedelta(days=1)
    period, _ = MenuVotingPeriod.objects.get_or_create(
        restaurant=restaurant,
        target_date=target_date,
    )
    scheduled_open = period.starts_at <= local_now.time().replace(tzinfo=None) < period.ends_at
    voting_is_open = setting.menu_voting_enabled and period.is_open and scheduled_open
    eligible_options = MenuItem.objects.filter(
        category__restaurant=restaurant,
        category__is_active=True,
        is_active=True,
    ).select_related("category").order_by("category__name", "name")
    options = (
        eligible_options
        if period.use_all_active_items
        else eligible_options.filter(voting_periods=period)
    )

    if request.method == "GET":
        if manage:
            votes = MenuVote.objects.filter(
                restaurant=restaurant,
                vote_date=target_date,
            ).select_related("menu_item")
            dish_votes = votes.filter(menu_item__isnull=False)
            return Response(
                {
                    "restaurant": {"id": restaurant.pk, "name": restaurant.name},
                    "vote_date": target_date,
                    "is_open": voting_is_open,
                    "starts_at": period.starts_at.strftime("%H:%M"),
                    "ends_at": period.ends_at.strftime("%H:%M"),
                    "publish_results": period.publish_results,
                    "use_all_active_items": period.use_all_active_items,
                    "total_votes": dish_votes.count(),
                    "abstentions": votes.filter(menu_item__isnull=True).count(),
                    "options": [
                        {
                            "id": item.pk,
                            "name": item.name,
                            "category": item.category.name,
                            "image_url": request.build_absolute_uri(item.image.url) if item.image else None,
                            "eligible": options.filter(pk=item.pk).exists(),
                            "votes": votes.filter(menu_item=item).count(),
                            "likes": votes.filter(
                                menu_item=item,
                                sentiment=MenuVote.Sentiment.LIKE,
                            ).count(),
                            "dislikes": votes.filter(
                                menu_item=item,
                                sentiment=MenuVote.Sentiment.DISLIKE,
                            ).count(),
                        }
                        for item in eligible_options
                    ],
                }
            )

        voter_key = None
        cookie_value = None
        user = request.user if request.user.is_authenticated else None
        if user is None:
            voter_key, cookie_value = _anonymous_voter_key(request, create=True)
        response = Response(
            {
                "restaurant": {"id": restaurant.pk, "name": restaurant.name},
                "period": {
                    "vote_date": target_date,
                    "start_time": period.starts_at.strftime("%H:%M"),
                    "end_time": period.ends_at.strftime("%H:%M"),
                    "starts_at": timezone.make_aware(
                        datetime.combine(target_date - timedelta(days=1), period.starts_at),
                        poll_timezone,
                    ),
                    "ends_at": timezone.make_aware(
                        datetime.combine(target_date - timedelta(days=1), period.ends_at),
                        poll_timezone,
                    ),
                    "is_open": voting_is_open,
                },
                "results_visible": period.publish_results and not voting_is_open,
                "total_votes": (
                    MenuVote.objects.filter(
                        restaurant=restaurant,
                        vote_date=target_date,
                        menu_item__isnull=False,
                    ).count()
                    if period.publish_results and not voting_is_open
                    else None
                ),
                "options": [
                    {
                        "id": item.pk,
                        "name": item.name,
                        "description": item.description,
                        "category": item.category.name,
                        "image_url": request.build_absolute_uri(item.image.url) if item.image else None,
                        "price": item.price,
                        **(
                            {
                                "votes": MenuVote.objects.filter(
                                    restaurant=restaurant,
                                    vote_date=target_date,
                                    menu_item=item,
                                ).count()
                            }
                            if period.publish_results and not voting_is_open
                            else {}
                        ),
                        **(
                            {
                                "likes": MenuVote.objects.filter(
                                    restaurant=restaurant,
                                    vote_date=target_date,
                                    menu_item=item,
                                    sentiment=MenuVote.Sentiment.LIKE,
                                ).count(),
                                "dislikes": MenuVote.objects.filter(
                                    restaurant=restaurant,
                                    vote_date=target_date,
                                    menu_item=item,
                                    sentiment=MenuVote.Sentiment.DISLIKE,
                                ).count(),
                            }
                            if period.publish_results and not voting_is_open
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
            vote_date=target_date,
        ).delete()
        return Response({"deleted": deleted})

    if request.method == "PATCH":
        if "eligible_menu_item_ids" in request.data and "use_all_active_items" in request.data:
            return Response(
                {"detail": "Choose either an explicit dish list or all active dishes, not both."},
                status=400,
            )
        selected_items = None
        if "is_open" in request.data:
            is_open = request.data["is_open"]
            if not isinstance(is_open, bool):
                return Response({"detail": "is_open must be a boolean."}, status=400)
            period.is_open = is_open

        for field in ("starts_at", "ends_at"):
            if field in request.data:
                try:
                    setattr(period, field, datetime.strptime(request.data[field], "%H:%M").time())
                except (TypeError, ValueError):
                    return Response({field: ["Use 24-hour HH:MM time."]}, status=400)

        if "publish_results" in request.data:
            if not isinstance(request.data["publish_results"], bool):
                return Response({"publish_results": ["Expected a boolean."]}, status=400)
            period.publish_results = request.data["publish_results"]

        if "eligible_menu_item_ids" in request.data:
            item_ids = request.data["eligible_menu_item_ids"]
            if not isinstance(item_ids, list) or any(
                not isinstance(item_id, int) or isinstance(item_id, bool)
                for item_id in item_ids
            ):
                return Response({"eligible_menu_item_ids": ["Expected a list of menu item IDs."]}, status=400)
            if len(item_ids) != len(set(item_ids)):
                return Response({"eligible_menu_item_ids": ["Duplicate dish IDs are not allowed."]}, status=400)
            valid_items = eligible_options.filter(pk__in=item_ids)
            if valid_items.count() != len(set(item_ids)):
                return Response({"eligible_menu_item_ids": ["All selected dishes must be active in this restaurant."]}, status=400)
            period.use_all_active_items = False
            selected_items = valid_items

        if "use_all_active_items" in request.data:
            use_all = request.data["use_all_active_items"]
            if not isinstance(use_all, bool):
                return Response({"use_all_active_items": ["Expected a boolean."]}, status=400)
            period.use_all_active_items = use_all
            if use_all:
                period.eligible_items.clear()

        if period.ends_at <= period.starts_at:
            return Response({"detail": "Voting end time must be after its start time."}, status=400)
        period.save()
        if selected_items is not None:
            period.eligible_items.set(selected_items)
        return Response({
            "is_open": period.is_open,
            "starts_at": period.starts_at.strftime("%H:%M"),
            "ends_at": period.ends_at.strftime("%H:%M"),
            "publish_results": period.publish_results,
            "use_all_active_items": period.use_all_active_items,
        })

    abstain = request.data.get("abstain", False)
    if not isinstance(abstain, bool):
        return Response({"detail": "abstain must be a boolean."}, status=status.HTTP_400_BAD_REQUEST)
    if abstain:
        menu_item = None
        sentiment = None
    else:
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
        sentiment = request.data.get("sentiment", MenuVote.Sentiment.LIKE)
        if sentiment not in MenuVote.Sentiment.values:
            return Response(
                {"detail": "sentiment must be LIKE or DISLIKE."},
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
    vote = MenuVote.objects.create(
        restaurant=restaurant,
        menu_item=menu_item,
        sentiment=sentiment,
        vote_date=target_date,
        **identity,
    )

    response = Response(
        {
            "id": vote.pk,
            "menu_item": vote.menu_item_id,
            "menu_item_name": vote.menu_item.name if vote.menu_item_id else None,
            "sentiment": vote.sentiment,
            "vote_date": vote.vote_date,
            "detail": (
                "Your response has been recorded."
                if abstain
                else f"Your {vote.sentiment.lower()} has been recorded."
            ),
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
@permission_classes([AllowAny])
@csrf_protect
def food_rating_view(request):
    if request.method == "GET":
        restaurant_id = request.query_params.get("restaurant_id")
        if not restaurant_id or not str(restaurant_id).isdigit():
            return Response({"detail": "A valid restaurant_id is required."}, status=400)
        restaurant_id = int(restaurant_id)
        if not request.user.is_authenticated or not has_restaurant_role(
            request.user,
            restaurant_id,
            OPERATIONAL_ROLES,
        ):
            return Response({"detail": "Restaurant staff access is required."}, status=403)
        ratings = FoodRating.objects.filter(
            restaurant_id=restaurant_id,
        ).select_related("menu_item").order_by("-created_at")
        aggregate = ratings.aggregate(average=Avg("rating"), count=Count("id"))
        per_dish = (
            ratings.values("menu_item_id", "menu_item__name")
            .annotate(average=Avg("rating"), count=Count("id"))
            .order_by("menu_item__name")
        )
        return Response({
            "average_rating": aggregate["average"] or 0,
            "rating_count": aggregate["count"],
            "dishes": list(per_dish),
            "recent": [
                {
                    "id": item.pk,
                    "menu_item": item.menu_item_id,
                    "menu_item_name": item.menu_item.name,
                    "rating": item.rating,
                    "comment": item.comment,
                    "created_at": item.created_at,
                }
                for item in ratings[:100]
            ],
        })

    if _request_rate_limited(request, "food-rating-submit", limit=60):
        return Response({"detail": "Too many rating attempts. Please try again later."}, status=429)
    order_number = request.data.get("order_number")
    order_item_id = request.data.get("order_item_id")
    rating_value = request.data.get("rating")
    comment = request.data.get("comment", "")
    if not isinstance(order_number, str) or not order_number.strip():
        return Response({"detail": "Enter your order number."}, status=400)
    if not str(order_item_id or "").isdigit():
        return Response({"detail": "A valid order item is required."}, status=400)
    if isinstance(rating_value, bool):
        return Response({"detail": "rating must be an integer between 1 and 5."}, status=400)
    try:
        rating_value = int(rating_value)
        normalized_order_number = str(uuid.UUID(order_number.strip()))
    except (TypeError, ValueError, AttributeError):
        return Response({"detail": "We couldn't find an eligible order with that number."}, status=404)
    if not 1 <= rating_value <= 5:
        return Response({"detail": "rating must be between 1 and 5."}, status=400)
    if not isinstance(comment, str) or len(comment) > 1000:
        return Response({"detail": "Feedback must be 1000 characters or fewer."}, status=400)

    order = Order.objects.select_related("restaurant").filter(
        order_number=normalized_order_number,
    ).first()
    if order is None:
        return Response({"detail": "We couldn't find an eligible order with that number."}, status=404)
    if order.status != Order.OrderStatus.COMPLETED:
        return Response(
            {"detail": "This order is not complete yet. Please try again after pickup."},
            status=409,
        )
    order_item = order.items.select_related("menu_item").filter(pk=int(order_item_id)).first()
    if order_item is None:
        return Response({"detail": "This dish is not eligible for this order."}, status=400)

    try:
        with transaction.atomic():
            rating = FoodRating.objects.create(
                restaurant_id=order.restaurant_id,
                order=order,
                order_item=order_item,
                menu_item=order_item.menu_item,
                rating=rating_value,
                comment=comment.strip(),
            )
    except IntegrityError:
        return Response({"detail": "This order item has already been rated."}, status=409)

    return Response(
        {
            "id": rating.pk,
            "menu_item_name": order_item.item_name,
            "rating": rating.rating,
            "comment": rating.comment,
            "created_at": rating.created_at,
        },
        status=201,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def verify_rating_order_view(request):
    if _request_rate_limited(request, "food-rating-verify", limit=30):
        return Response({"detail": "Too many order lookups. Please try again later."}, status=429)
    order_number = request.data.get("order_number")
    if (
        not isinstance(order_number, str)
        or not order_number.strip()
    ):
        return Response({"detail": "Enter your order number."}, status=400)
    try:
        normalized_order_number = str(uuid.UUID(order_number.strip()))
    except (TypeError, ValueError, AttributeError):
        return Response({"detail": "We couldn't find an eligible order with that number."}, status=404)

    order = Order.objects.select_related("restaurant").filter(
        order_number=normalized_order_number,
    ).first()
    if order is None:
        return Response({"detail": "We couldn't find an eligible order with that number."}, status=404)
    if order.status != Order.OrderStatus.COMPLETED:
        return Response(
            {"detail": "This order is not complete yet. Please try again after pickup."},
            status=409,
        )
    eligible_items = order.items.exclude(food_ratings__isnull=False)
    already_rated = not eligible_items.exists() and order.items.exists()
    return Response({
        "order_number": str(order.order_number),
        "display_order_number": order.display_order_number,
        "items": [
            {
                "order_item_id": item.pk,
                "name": item.item_name,
            }
            for item in eligible_items
        ],
        "already_rated": already_rated,
    })


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
