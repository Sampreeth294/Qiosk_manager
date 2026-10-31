
from django.urls import path

from .views import (
    health_check,
    restaurant_list,
    create_restaurant,
    update_restaurant,
    menu_category_list,
    create_category,
    update_category,
    menu_item_list,
    create_menu_item,
    update_menu_item,
    order_list,
    create_order,
    update_order_status,
   
)


urlpatterns = [
    path(
        "health-check/",
        health_check,
        name="health_check",
    ),
    path(
        "restaurants/",
        restaurant_list,
        name="restaurant_list",
    ),
    path(
        "restaurants/create/",
        create_restaurant,
        name="create_restaurant",
    ),
    path(
        "restaurants/<int:pk>/update/",
        update_restaurant,
        name="update_restaurant",
    ),
    # Category management
    path(
        "categories/",
        menu_category_list,
        name="category_list",
    ),
    path(
        "categories/create/",
        create_category,
        name="create_category",
    ),
    path(
        "categories/<int:pk>/update/",
        update_category,
        name="update_category",
    ),

    # Menu item management
    path(
        "menu-items/",
        menu_item_list,
        name="menu_item_list",
    ),
    path(
        "menu-items/create/",
        create_menu_item,
        name="create_menu_item",
    ),
    path(
        "menu-items/<int:pk>/update/",
        update_menu_item,
        name="update_menu_item",
    ),
    # Order management
    path("orders/", order_list, name="order_list"),
    path("orders/create/", create_order, name="create_order"),
    path(
    "orders/<int:pk>/status/",
    update_order_status,
    name="update_order_status",
),
    
]
