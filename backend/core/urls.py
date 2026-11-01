
from django.urls import path

from .auth_views import (
    current_user_view,
    login_view,
    logout_view,
)
from .account_views import (
    initial_setup_view,
    invitation_accept_view,
    password_change_view,
    password_reset_confirm_view,
    password_reset_request_view,
    restaurant_user_detail_view,
    restaurant_users_view,
)
from .views import (
    analytics_summary,
    food_rating_view,
    verify_rating_order_view,
    health_check,
    menu_vote_view,
    public_live_display,
    public_restaurant_list,
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
    restaurant_notifications_view,
    restaurant_settings_view,
)
from .inventory_views import (
    adjust_stock,
    ingredient_detail,
    ingredient_list,
    low_stock_ingredients,
    purchase_order_detail,
    purchase_order_list,
    receive_purchase_order_line,
    receive_stock,
    record_wastage,
    stock_movement_list,
    supplier_detail,
    supplier_list,
)
from .expense_views import expense_detail, expense_list


urlpatterns = [
    path("auth/setup/", initial_setup_view, name="initial_setup"),
    path("auth/login/", login_view, name="auth_login"),
    path("auth/logout/", logout_view, name="auth_logout"),
    path("auth/me/", current_user_view, name="auth_me"),
    path("auth/password/change/", password_change_view, name="password_change"),
    path("auth/password/reset/", password_reset_request_view, name="password_reset_request"),
    path("auth/password/reset/confirm/", password_reset_confirm_view, name="password_reset_confirm"),
    path("auth/invitations/accept/", invitation_accept_view, name="invitation_accept"),
    path("users/", restaurant_users_view, name="restaurant_users"),
    path("users/<int:membership_id>/", restaurant_user_detail_view, name="restaurant_user_detail"),
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
        "public/restaurants/",
        public_restaurant_list,
        name="public_restaurant_list",
    ),
    path(
        "public/live-display/",
        public_live_display,
        name="public_live_display",
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
    path(
        "reports/summary/",
        analytics_summary,
        name="analytics_summary",
    ),
    path("expenses/", expense_list, name="expense_list"),
    path("expenses/<int:pk>/", expense_detail, name="expense_detail"),
    path(
        "settings/",
        restaurant_settings_view,
        name="restaurant_settings",
    ),
    path(
        "settings/<int:restaurant_id>/",
        restaurant_settings_view,
        name="restaurant_settings_by_id",
    ),
    path(
        "notifications/",
        restaurant_notifications_view,
        name="restaurant_notifications",
    ),
    path(
        "notifications/<int:notification_id>/",
        restaurant_notifications_view,
        name="mark_notification_read",
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
    path(
    "menu-votes/",
    menu_vote_view,
    name="menu_vote_view",
),
path(
    "food-ratings/",
    food_rating_view,
    name="food_rating_view",
),
path(
    "food-ratings/verify/",
    verify_rating_order_view,
    name="verify_rating_order",
),
path(
    "inventory/ingredients/",
        ingredient_list,
        name="ingredient_list",
    ),
    path(
        "inventory/ingredients/<int:pk>/",
        ingredient_detail,
        name="ingredient_detail",
    ),
    path(
        "inventory/ingredients/<int:pk>/receive/",
        receive_stock,
        name="receive_stock",
    ),
    path(
        "inventory/ingredients/<int:pk>/adjust/",
        adjust_stock,
        name="adjust_stock",
    ),
    path(
        "inventory/ingredients/<int:pk>/wastage/",
        record_wastage,
        name="record_wastage",
    ),
    path(
        "inventory/low-stock/",
        low_stock_ingredients,
        name="low_stock_ingredients",
    ),
    path(
        "inventory/movements/",
        stock_movement_list,
        name="stock_movement_list",
    ),
    path(
        "suppliers/",
        supplier_list,
        name="supplier_list",
    ),
    path(
        "suppliers/<int:pk>/",
        supplier_detail,
        name="supplier_detail",
    ),
    path(
        "purchase-orders/",
        purchase_order_list,
        name="purchase_order_list",
    ),
    path(
        "purchase-orders/lines/<int:pk>/receive/",
        receive_purchase_order_line,
        name="receive_purchase_order_line",
    ),
    path(
        "purchase-orders/<int:pk>/",
        purchase_order_detail,
        name="purchase_order_detail",
    ),
    
]
