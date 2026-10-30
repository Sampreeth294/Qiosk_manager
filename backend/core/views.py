
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Restaurant, MenuCategory, MenuItem
from .serializers import (
    RestaurantSerializer,
    MenuCategorySerializer,
    MenuItemSerializer,
)
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer



@api_view(["GET"])
def health_check(request):
    return Response({
        "success": True,
        "message": "Qiosk API is running successfully.",
    })


# -------------------------
# RESTAURANT MANAGEMENT
# -------------------------

@api_view(["GET"])
def restaurant_list(request):
    restaurants = Restaurant.objects.filter(is_active=True)

    serializer = RestaurantSerializer(
        restaurants,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


# -------------------------
# CATEGORY MANAGEMENT
# -------------------------

@api_view(["GET"])
def menu_category_list(request):
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )

    if include_inactive:
        categories = MenuCategory.objects.all().select_related(
            "restaurant"
        )
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

    serializer = MenuCategorySerializer(
        category,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
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
def menu_item_list(request):
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )

    if include_inactive:
        items = MenuItem.objects.all().select_related(
            "category",
            "category__restaurant",
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

    serializer = MenuItemSerializer(
        menu_item,
        data=request.data,
        partial=True,
        context={"request": request},
    )

    if serializer.is_valid():
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



@api_view(["POST"])
def create_restaurant(request):
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

    @api_view(["GET"])
def restaurant_list(request):
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )

    if include_inactive:
        restaurants = Restaurant.objects.all()
    else:
        restaurants = Restaurant.objects.filter(is_active=True)

    serializer = RestaurantSerializer(
        restaurants,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)



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
        orders = orders.filter(restaurant_id=restaurant_id)

    if order_status:
        valid_statuses = [
            choice[0] for choice in Order.OrderStatus.choices
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
def create_order(request):
    serializer = OrderCreateSerializer(data=request.data)

    if serializer.is_valid():
        order = serializer.save()

        return Response(
            OrderSerializer(
                order,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )

