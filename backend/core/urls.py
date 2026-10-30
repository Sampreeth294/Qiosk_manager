from django.urls import path
from .views import (
    health_check,
    restaurant_list,
    menu_category_list,
    menu_item_list,
    create_menu_item,
)  # importing the views from the views.py file

urlpatterns = [
    path('health-check/', health_check, name='health_check'),  # this line defines a URL pattern for the health_check view, which can be accessed in helath check
    path('restaurants/', restaurant_list, name='restaurant_list'),  # this line defines a URL pattern for the restaurant_list view, which can be accessed in restaurants
    path('categories/', menu_category_list, name='category_list'),
    path('menu-items/', menu_item_list, name='menu_item_list'),
    path('menu-items/create/', create_menu_item, name='create_menu_item'),
]