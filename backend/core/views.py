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


@api_view(["GET"])
def health_check(request):
    return Response({
        "success": True,
        "message": "Qiosk API is running successfully.",
    })


@api_view(["GET"])
def restaurant_list(request):
    restaurants = Restaurant.objects.filter(is_active=True)

    serializer = RestaurantSerializer(
        restaurants,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["GET"])
def menu_category_list(request):
    restaurant_id = request.query_params.get("restaurant_id")

    categories = MenuCategory.objects.filter(is_active=True)

    if restaurant_id:
        categories = categories.filter(restaurant_id=restaurant_id)

    serializer = MenuCategorySerializer(
        categories,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["GET"])
def menu_item_list(request):
    items = MenuItem.objects.filter(
        is_active=True
    ).select_related("category")

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
    # Find the existing menu item.
    menu_item = get_object_or_404(MenuItem, pk=pk)

    # Validate and update only the submitted fields.
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


@api_view(["GET"])
def menu_item_list(request):
    # Admin can request inactive items too.
    include_inactive = (
        request.query_params.get("include_inactive") == "true"
    )

    if include_inactive:
        items = MenuItem.objects.all().select_related("category")
    else:
        # Customer-facing menu shows active items only.
        items = MenuItem.objects.filter(
            is_active=True
        ).select_related("category")

    category_id = request.query_params.get("category_id")

    if category_id:
        items = items.filter(category_id=category_id)

    serializer = MenuItemSerializer(
        items,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)
