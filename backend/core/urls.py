
from django.urls import path

from .views import (
    health_check,
    restaurant_list,
    menu_category_list,
    menu_item_list,
    create_menu_item,
    update_menu_item,
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
        "categories/",
        menu_category_list,
        name="category_list",
    ),
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
]
