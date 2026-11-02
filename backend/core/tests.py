
import json
import re
import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from django.db import IntegrityError, transaction
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from channels.layers import get_channel_layer
from channels.routing import URLRouter
from channels.testing import WebsocketCommunicator

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
    PurchaseOrderLine,
    Restaurant,
    RestaurantMembership,
    RestaurantNotification,
    RestaurantInvitation,
    RestaurantSetupState,
    RestaurantSetting,
    StockMovement,
    Supplier,
)


class RestaurantMembershipModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="multi-restaurant-user",
            password="test-password",
        )
        self.restaurant_a = Restaurant.objects.create(
            name="Restaurant A",
            address="1 A Street",
        )
        self.restaurant_b = Restaurant.objects.create(
            name="Restaurant B",
            address="2 B Street",
        )

    def test_user_can_have_memberships_with_different_roles(self):
        staff_membership = RestaurantMembership.objects.create(
            user=self.user,
            restaurant=self.restaurant_a,
            role=RestaurantMembership.Role.STAFF,
        )
        manager_membership = RestaurantMembership.objects.create(
            user=self.user,
            restaurant=self.restaurant_b,
            role=RestaurantMembership.Role.MANAGER,
        )

        self.assertEqual(
            self.user.restaurant_memberships.count(),
            2,
        )
        self.assertEqual(
            staff_membership.role,
            RestaurantMembership.Role.STAFF,
        )
        self.assertEqual(
            manager_membership.role,
            RestaurantMembership.Role.MANAGER,
        )

    def test_duplicate_user_restaurant_membership_is_rejected(self):
        RestaurantMembership.objects.create(
            user=self.user,
            restaurant=self.restaurant_a,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RestaurantMembership.objects.create(
                    user=self.user,
                    restaurant=self.restaurant_a,
                    role=RestaurantMembership.Role.MANAGER,
                )

    def test_inactive_membership_is_retained_but_inactive(self):
        membership = RestaurantMembership.objects.create(
            user=self.user,
            restaurant=self.restaurant_a,
            is_active=False,
        )

        self.assertFalse(membership.is_active)
        self.assertTrue(
            RestaurantMembership.objects.filter(pk=membership.pk).exists()
        )


class RestaurantMembershipAdminTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.manager = user_model.objects.create_user(
            username="restaurant-manager",
            password="test-password",
            is_staff=True,
        )
        self.staff = user_model.objects.create_user(
            username="restaurant-staff",
            password="test-password",
            is_staff=True,
        )
        self.other_staff = user_model.objects.create_user(
            username="other-restaurant-staff",
            password="test-password",
            is_staff=True,
        )
        self.restaurant = Restaurant.objects.create(
            name="Managed Restaurant",
            address="1 Managed Street",
        )
        self.other_restaurant = Restaurant.objects.create(
            name="Other Restaurant",
            address="2 Other Street",
        )
        self.manager_membership = RestaurantMembership.objects.create(
            user=self.manager,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )
        self.staff_membership = RestaurantMembership.objects.create(
            user=self.staff,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.STAFF,
        )
        self.other_membership = RestaurantMembership.objects.create(
            user=self.other_staff,
            restaurant=self.other_restaurant,
            role=RestaurantMembership.Role.STAFF,
        )
        self.client.force_login(self.manager)

    def test_manager_admin_is_limited_to_staff_in_managed_restaurant(self):
        response = self.client.get(
            reverse("admin:core_restaurantmembership_changelist")
        )

        self.assertEqual(response.status_code, 200)
        visible_ids = {
            membership.pk
            for membership in response.context["cl"].result_list
        }
        self.assertEqual(visible_ids, {self.staff_membership.pk})

    def test_inactive_manager_membership_does_not_grant_admin_access(self):
        self.manager_membership.is_active = False
        self.manager_membership.save(update_fields=["is_active"])

        response = self.client.get(
            reverse("admin:core_restaurantmembership_changelist")
        )

        self.assertEqual(response.status_code, 403)

    def test_staff_membership_does_not_grant_membership_admin_access(self):
        self.client.force_login(self.staff)

        response = self.client.get(
            reverse("admin:core_restaurantmembership_changelist")
        )

        self.assertEqual(response.status_code, 403)

    def test_manager_cannot_create_manager_membership(self):
        response = self.client.post(
            reverse("admin:core_restaurantmembership_add"),
            {
                "user": self.other_staff.pk,
                "restaurant": self.restaurant.pk,
                "role": RestaurantMembership.Role.MANAGER,
                "is_active": "on",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            RestaurantMembership.objects.filter(
                user=self.other_staff,
                restaurant=self.restaurant,
            ).exists()
        )

    def test_manager_cannot_change_own_or_other_restaurant_membership(self):
        own_response = self.client.get(
            reverse(
                "admin:core_restaurantmembership_change",
                args=[self.manager_membership.pk],
            )
        )
        other_response = self.client.get(
            reverse(
                "admin:core_restaurantmembership_change",
                args=[self.other_membership.pk],
            )
        )

        self.assertEqual(own_response.status_code, 302)
        self.assertEqual(other_response.status_code, 302)

    def test_manager_can_add_staff_membership_in_managed_restaurant(self):
        new_staff = get_user_model().objects.create_user(
            username="new-restaurant-staff",
            password="test-password",
            is_staff=True,
        )

        response = self.client.post(
            reverse("admin:core_restaurantmembership_add"),
            {
                "user": new_staff.pk,
                "restaurant": self.restaurant.pk,
                "role": RestaurantMembership.Role.STAFF,
                "is_active": "on",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            RestaurantMembership.objects.filter(
                user=new_staff,
                restaurant=self.restaurant,
                role=RestaurantMembership.Role.STAFF,
                is_active=True,
            ).exists()
        )

    def test_manager_cannot_promote_staff_by_posting_role(self):
        response = self.client.post(
            reverse(
                "admin:core_restaurantmembership_change",
                args=[self.staff_membership.pk],
            ),
            {
                "user": self.staff.pk,
                "restaurant": self.restaurant.pk,
                "role": RestaurantMembership.Role.MANAGER,
                "is_active": "on",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.staff_membership.refresh_from_db()
        self.assertEqual(
            self.staff_membership.role,
            RestaurantMembership.Role.STAFF,
        )

    def test_superuser_can_create_manager_membership_in_admin(self):
        user_model = get_user_model()
        superuser = user_model.objects.create_superuser(
            username="system-superuser",
            password="test-password",
        )
        new_manager = user_model.objects.create_user(
            username="new-restaurant-manager",
            password="test-password",
            is_staff=True,
        )
        self.client.force_login(superuser)

        response = self.client.post(
            reverse("admin:core_restaurantmembership_add"),
            {
                "user": new_manager.pk,
                "restaurant": self.other_restaurant.pk,
                "role": RestaurantMembership.Role.MANAGER,
                "is_active": "on",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(
            RestaurantMembership.objects.filter(
                user=new_manager,
                restaurant=self.other_restaurant,
                role=RestaurantMembership.Role.MANAGER,
            ).exists()
        )


class AuthenticationApiTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.password = "valid-test-password"
        self.user = self.user_model.objects.create_user(
            username="active-user",
            password=self.password,
            is_staff=True,
        )

    def test_login_returns_safe_profile_and_establishes_session(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user.username,
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "user": {
                    "id": self.user.id,
                    "username": self.user.username,
                    "is_staff": True,
                    "is_superuser": False,
                }
            },
        )
        self.assertNotIn("password", response.json()["user"])
        self.assertIsNotNone(self.client.session.get("_auth_user_id"))

    def test_login_accepts_json_with_charset_parameter(self):
        response = self.client.post(
            "/api/auth/login/",
            json.dumps({
                "username": self.user.username,
                "password": self.password,
            }),
            content_type="application/json; charset=UTF-8",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["username"], self.user.username)

    def test_login_rejects_invalid_credentials_generically(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user.username,
                "password": "incorrect-password",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"detail": "Invalid username or password."},
        )

    def test_login_rejects_inactive_user(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            "/api/auth/login/",
            {
                "username": self.user.username,
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"detail": "Invalid username or password."},
        )

    def test_current_user_returns_authenticated_profile(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "user": {
                    "id": self.user.id,
                    "username": self.user.username,
                    "is_staff": True,
                    "is_superuser": False,
                }
            },
        )

    def test_current_user_rejects_anonymous_client(self):
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json(),
            {"detail": "Authentication is required."},
        )

    def test_logout_invalidates_session(self):
        self.client.force_login(self.user)

        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"detail": "Logged out successfully."},
        )
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertEqual(
            self.client.get("/api/auth/me/").status_code,
            401,
        )

    def test_authentication_endpoint_methods_are_restricted(self):
        self.assertEqual(
            self.client.get("/api/auth/login/").status_code,
            405,
        )
        self.assertEqual(
            self.client.get("/api/auth/logout/").status_code,
            405,
        )
        self.assertEqual(
            self.client.post("/api/auth/me/").status_code,
            405,
        )

    def test_login_and_logout_enforce_csrf_checks(self):
        client = Client(enforce_csrf_checks=True)
        login_data = json.dumps({
            "username": self.user.username,
            "password": self.password,
        })

        missing_login_csrf = client.post(
            "/api/auth/login/",
            data=login_data,
            content_type="application/json",
        )
        self.assertEqual(missing_login_csrf.status_code, 403)

        client.get("/api/auth/me/")
        login_csrf = client.cookies["csrftoken"].value
        login_response = client.post(
            "/api/auth/login/",
            data=login_data,
            content_type="application/json",
            HTTP_X_CSRFTOKEN=login_csrf,
        )
        self.assertEqual(login_response.status_code, 200)

        missing_logout_csrf = client.post("/api/auth/logout/")
        self.assertEqual(missing_logout_csrf.status_code, 403)

        client.get("/api/auth/me/")
        logout_csrf = client.cookies["csrftoken"].value
        logout_response = client.post(
            "/api/auth/logout/",
            HTTP_X_CSRFTOKEN=logout_csrf,
        )
        self.assertEqual(logout_response.status_code, 200)


class InventoryApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.manager = user_model.objects.create_user(
            username="inventory-manager",
            password="test-password",
        )
        self.staff = user_model.objects.create_user(
            username="inventory-staff",
            password="test-password",
        )
        self.other_user = user_model.objects.create_user(
            username="other-inventory-staff",
            password="test-password",
        )
        self.restaurant = Restaurant.objects.create(
            name="Inventory Restaurant",
            address="1 Stock Street",
        )
        self.other_restaurant = Restaurant.objects.create(
            name="Other Inventory Restaurant",
            address="2 Stock Street",
        )
        RestaurantMembership.objects.create(
            user=self.manager,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )
        RestaurantMembership.objects.create(
            user=self.staff,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.STAFF,
        )
        RestaurantMembership.objects.create(
            user=self.other_user,
            restaurant=self.other_restaurant,
            role=RestaurantMembership.Role.STAFF,
        )
        self.ingredient = Ingredient.objects.create(
            restaurant=self.restaurant,
            name="Rice",
            unit=Ingredient.Unit.KILOGRAM,
            current_quantity="5.000",
            minimum_quantity="2.000",
        )
        self.other_ingredient = Ingredient.objects.create(
            restaurant=self.other_restaurant,
            name="Oil",
            unit=Ingredient.Unit.LITER,
            current_quantity="3.000",
        )

    def test_inventory_requires_authenticated_user(self):
        response = self.client.get("/api/inventory/ingredients/")
        self.assertEqual(response.status_code, 401)

    def test_staff_inventory_list_is_restaurant_scoped(self):
        self.client.force_login(self.staff)
        response = self.client.get("/api/inventory/ingredients/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.data],
            [self.ingredient.pk],
        )

    def test_staff_cannot_view_another_restaurants_ingredient(self):
        self.client.force_login(self.staff)
        response = self.client.get(
            f"/api/inventory/ingredients/{self.other_ingredient.pk}/"
        )
        self.assertEqual(response.status_code, 404)

    def test_staff_can_receive_stock_once_with_idempotency_key(self):
        self.client.force_login(self.staff)
        payload = {
            "quantity": "2.250",
            "reason": "Supplier delivery",
            "idempotency_key": str(uuid.uuid4()),
        }

        first = self.client.post(
            f"/api/inventory/ingredients/{self.ingredient.pk}/receive/",
            payload,
            format="json",
        )
        retry = self.client.post(
            f"/api/inventory/ingredients/{self.ingredient.pk}/receive/",
            payload,
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(retry.status_code, 200)
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.current_quantity, Decimal("7.250"))
        self.assertEqual(
            StockMovement.objects.filter(
                idempotency_key=payload["idempotency_key"]
            ).count(),
            1,
        )

    def test_staff_cannot_adjust_stock_or_modify_other_restaurant(self):
        self.client.force_login(self.staff)
        adjustment = self.client.post(
            f"/api/inventory/ingredients/{self.ingredient.pk}/adjust/",
            {
                "quantity": "-1.000",
                "reason": "Correction",
                "idempotency_key": str(uuid.uuid4()),
            },
            format="json",
        )
        foreign_receipt = self.client.post(
            f"/api/inventory/ingredients/{self.other_ingredient.pk}/receive/",
            {
                "quantity": "1.000",
                "reason": "Delivery",
                "idempotency_key": str(uuid.uuid4()),
            },
            format="json",
        )

        self.assertEqual(adjustment.status_code, 403)
        self.assertEqual(foreign_receipt.status_code, 404)
        self.ingredient.refresh_from_db()
        self.other_ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.current_quantity, Decimal("5.000"))
        self.assertEqual(self.other_ingredient.current_quantity, Decimal("3.000"))

    def test_manager_cannot_make_stock_negative(self):
        self.client.force_login(self.manager)
        response = self.client.post(
            f"/api/inventory/ingredients/{self.ingredient.pk}/adjust/",
            {
                "quantity": "-6.000",
                "reason": "Correction",
                "idempotency_key": str(uuid.uuid4()),
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.ingredient.refresh_from_db()
        self.assertEqual(self.ingredient.current_quantity, Decimal("5.000"))

    def test_low_stock_endpoint_includes_threshold_boundary(self):
        self.ingredient.current_quantity = self.ingredient.minimum_quantity
        self.ingredient.save(update_fields=["current_quantity"])
        self.client.force_login(self.staff)

        response = self.client.get("/api/inventory/low-stock/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data], [
            self.ingredient.pk,
        ])

    def test_purchase_receipt_updates_stock_and_is_idempotent(self):
        self.client.force_login(self.manager)
        supplier = Supplier.objects.create(
            restaurant=self.restaurant,
            name="Stock Supplier",
        )
        purchase_order = PurchaseOrder.objects.create(
            restaurant=self.restaurant,
            supplier=supplier,
            status=PurchaseOrder.Status.APPROVED,
            order_date="2026-11-01",
            created_by=self.manager,
        )
        line = PurchaseOrderLine.objects.create(
            purchase_order=purchase_order,
            ingredient=self.ingredient,
            ordered_quantity="4.000",
            unit_price="12.50",
        )
        payload = {
            "quantity": "4.000",
            "reason": "Delivery received",
            "idempotency_key": str(uuid.uuid4()),
        }

        first = self.client.post(
            f"/api/purchase-orders/lines/{line.pk}/receive/",
            payload,
            format="json",
        )
        retry = self.client.post(
            f"/api/purchase-orders/lines/{line.pk}/receive/",
            payload,
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(retry.status_code, 200)
        self.ingredient.refresh_from_db()
        line.refresh_from_db()
        purchase_order.refresh_from_db()
        self.assertEqual(self.ingredient.current_quantity, Decimal("9.000"))
        self.assertEqual(line.received_quantity, Decimal("4.000"))
        self.assertEqual(purchase_order.status, PurchaseOrder.Status.RECEIVED)
        self.assertEqual(
            StockMovement.objects.filter(
                purchase_order_line=line,
            ).count(),
            1,
        )


class OrderApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff = user_model.objects.create_user(
            username="order-staff",
            password="test-password",
        )
        self.restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            address="1 Test Street",
        )
        RestaurantMembership.objects.create(
            user=self.staff,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.STAFF,
        )

        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Test Category",
        )

        self.menu_item = MenuItem.objects.create(
            category=self.category,
            name="Test Item",
            price="12.50",
        )

    def test_create_order_saves_items_and_list_returns_them(self):
        response = self.client.post(
            "/api/orders/create/",
            {
                "restaurant": self.restaurant.id,
                "order_type": "TAKEAWAY",
                "items": [
                    {
                        "menu_item": self.menu_item.id,
                        "quantity": 2,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(response.data["display_order_number"], "A-01")
        self.assertEqual(response.data["total_amount"], "25.00")
        self.assertEqual(
            response.data["items"][0]["item_name"],
            "Test Item",
        )

        self.client.force_login(self.staff)
        list_response = self.client.get("/api/orders/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(
            list_response.data[0]["items"][0]["menu_item"],
            self.menu_item.id,
        )
        self.assertEqual(
            list_response.data[0]["items"][0]["quantity"],
            2,
        )

    def test_guest_order_numbers_increment_per_restaurant_and_day(self):
        order_payload = {
            "restaurant": self.restaurant.pk,
            "order_type": "TAKEAWAY",
            "items": [{"menu_item": self.menu_item.pk, "quantity": 1}],
        }

        first = self.client.post(
            "/api/orders/create/",
            order_payload,
            format="json",
        )
        second = self.client.post(
            "/api/orders/create/",
            order_payload,
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(first.data["display_order_number"], "A-01")
        self.assertEqual(second.data["display_order_number"], "A-02")
        self.assertNotEqual(first.data["order_number"], second.data["order_number"])

    def test_guest_order_creation_requires_csrf(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            "/api/orders/create/",
            data=json.dumps({
                "restaurant": self.restaurant.pk,
                "order_type": "TAKEAWAY",
                "items": [{"menu_item": self.menu_item.pk, "quantity": 1}],
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Order.objects.exists())

    def test_order_status_update_persists(self):
        self.client.force_login(self.staff)
        order = Order.objects.create(
            restaurant=self.restaurant,
        )

        response = self.client.patch(
            f"/api/orders/{order.id}/status/",
            {"status": "CONFIRMED"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            Order.OrderStatus.CONFIRMED,
        )

    def test_anonymous_order_listing_is_rejected(self):
        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 401)

    def test_staff_cannot_read_another_restaurants_orders(self):
        other_restaurant = Restaurant.objects.create(
            name="Other Restaurant",
            address="2 Test Street",
        )
        other_order = Order.objects.create(restaurant=other_restaurant)
        self.client.force_login(self.staff)

        response = self.client.get(
            f"/api/orders/?restaurant_id={other_restaurant.pk}"
        )

        self.assertEqual(response.status_code, 403)
        self.assertNotIn(str(other_order.pk), str(response.data))

    def test_staff_cannot_update_another_restaurants_order(self):
        other_restaurant = Restaurant.objects.create(
            name="Other Restaurant",
            address="2 Test Street",
        )
        other_order = Order.objects.create(restaurant=other_restaurant)
        self.client.force_login(self.staff)

        response = self.client.patch(
            f"/api/orders/{other_order.pk}/status/",
            {"status": "CONFIRMED"},
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        other_order.refresh_from_db()
        self.assertEqual(other_order.status, Order.OrderStatus.PENDING)

    def test_rejects_menu_item_from_another_restaurant(self):
        other_restaurant = Restaurant.objects.create(
            name="Other Restaurant",
            address="2 Test Street",
        )

        other_category = MenuCategory.objects.create(
            restaurant=other_restaurant,
            name="Other Category",
        )

        other_item = MenuItem.objects.create(
            category=other_category,
            name="Other Item",
            price="5.00",
        )

        response = self.client.post(
            "/api/orders/create/",
            {
                "restaurant": self.restaurant.id,
                "order_type": "TAKEAWAY",
                "items": [
                    {
                        "menu_item": other_item.id,
                        "quantity": 1,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(OrderItem.objects.count(), 0)

    def test_rejects_invalid_order_status(self):
        self.client.force_login(self.staff)
        order = Order.objects.create(
            restaurant=self.restaurant,
            status=Order.OrderStatus.PENDING,
        )

        response = self.client.patch(
            f"/api/orders/{order.id}/status/",
            {"status": "INVALID_STATUS"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            Order.OrderStatus.PENDING,
        )

    def test_rejects_skipping_order_status(self):
        self.client.force_login(self.staff)
        order = Order.objects.create(
            restaurant=self.restaurant,
            status=Order.OrderStatus.CONFIRMED,
        )

        response = self.client.patch(
            f"/api/orders/{order.id}/status/",
            {"status": "COMPLETED"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        order.refresh_from_db()

        self.assertEqual(
            order.status,
            Order.OrderStatus.CONFIRMED,
        )


class ReportsAndEngagementApiTests(APITestCase):
    def setUp(self):
        self.manager = get_user_model().objects.create_user(
            username="analytics-manager",
            email="manager@example.com",
            password="strong-password",
        )
        self.other_user = get_user_model().objects.create_user(
            username="other-user",
            email="other@example.com",
            password="strong-password",
        )
        self.restaurant = Restaurant.objects.create(
            name="Metrics Restaurant",
            address="2 Metrics Street",
        )
        self.other_restaurant = Restaurant.objects.create(
            name="Other Metrics Restaurant",
            address="3 Metrics Street",
        )
        RestaurantMembership.objects.create(
            user=self.manager,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )
        RestaurantMembership.objects.create(
            user=self.other_user,
            restaurant=self.other_restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Popular",
        )
        self.item_a = MenuItem.objects.create(
            category=self.category,
            name="Burger",
            price="120.00",
        )
        self.item_b = MenuItem.objects.create(
            category=self.category,
            name="Wrap",
            price="90.00",
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            status=Order.OrderStatus.COMPLETED,
            total_amount="210.00",
        )
        OrderItem.objects.create(
            order=self.order,
            menu_item=self.item_a,
            item_name=self.item_a.name,
            unit_price=self.item_a.price,
            quantity=1,
            subtotal="120.00",
        )
        OrderItem.objects.create(
            order=self.order,
            menu_item=self.item_b,
            item_name=self.item_b.name,
            unit_price=self.item_b.price,
            quantity=1,
            subtotal="90.00",
        )
        self.ingredient = Ingredient.objects.create(
            restaurant=self.restaurant,
            name="Tomato",
            unit=Ingredient.Unit.KILOGRAM,
            current_quantity="1.000",
            minimum_quantity="2.000",
        )

    def test_reports_summary_uses_restaurant_scope(self):
        Expense.objects.create(
            restaurant=self.restaurant,
            created_by=self.manager,
            title="Electricity",
            category=Expense.Category.UTILITIES,
            amount="45.50",
            date=timezone.localdate(),
            payment_method=Expense.PaymentMethod.UPI,
            paid_to="Power Board",
        )
        Expense.objects.create(
            restaurant=self.other_restaurant,
            created_by=self.other_user,
            title="Foreign expense",
            category=Expense.Category.OTHER,
            amount="900.00",
            date=timezone.localdate(),
            payment_method=Expense.PaymentMethod.CASH,
            paid_to="Other Vendor",
        )
        self.client.force_login(self.manager)
        response = self.client.get(
            "/api/reports/summary/",
            {"restaurant_id": self.restaurant.id},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["orders"], 1)
        self.assertEqual(payload["summary"]["revenue"], 210.0)
        self.assertEqual(payload["status_counts"]["COMPLETED"], 1)
        self.assertEqual(payload["current_status_counts"]["COMPLETED"], 1)
        self.assertEqual(payload["best_sellers"][0]["name"], "Burger")
        self.assertEqual(payload["inventory_summary"]["low_stock_items"], 1)
        self.assertEqual(payload["menu_summary"]["active_items"], 2)
        self.assertEqual(payload["expense_summary"]["total"], 45.5)
        self.assertEqual(payload["expense_summary"]["count"], 1)

        supplier = Supplier.objects.create(
            restaurant=self.restaurant,
            name="Daily Produce",
        )
        PurchaseOrder.objects.create(
            restaurant=self.restaurant,
            supplier=supplier,
            order_date=timezone.localdate(),
            status=PurchaseOrder.Status.PENDING,
        )
        updated_response = self.client.get(
            "/api/reports/summary/",
            {"restaurant_id": self.restaurant.id},
        )
        self.assertEqual(updated_response.json()["purchase_summary"]["pending"], 1)

    def test_dashboard_daily_and_current_status_counts_use_expected_scopes(self):
        old_order = Order.objects.create(
            restaurant=self.restaurant,
            status=Order.OrderStatus.PREPARING,
        )
        Order.objects.filter(pk=old_order.pk).update(
            created_at=timezone.now() - timedelta(days=2),
        )
        self.client.force_login(self.manager)
        response = self.client.get(
            "/api/reports/summary/",
            {"restaurant_id": self.restaurant.pk, "range": "today"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["orders"], 1)
        self.assertEqual(payload["status_counts"]["COMPLETED"], 1)
        self.assertEqual(payload["current_status_counts"]["COMPLETED"], 1)
        self.assertEqual(payload["current_status_counts"]["PREPARING"], 1)
        self.assertEqual(old_order.status, Order.OrderStatus.PREPARING)
        orders_response = self.client.get(
            "/api/orders/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertEqual(orders_response.status_code, 200)
        order_status_counts = {
            order_status: sum(
                order["status"] == order_status
                for order in orders_response.json()
            )
            for order_status, _ in Order.OrderStatus.choices
        }
        self.assertEqual(payload["current_status_counts"], order_status_counts)

    def test_expenses_are_persistent_and_manager_scoped(self):
        self.client.force_login(self.manager)
        create = self.client.post(
            "/api/expenses/",
            {
                "restaurant_id": self.restaurant.pk,
                "title": "Packaging",
                "category": Expense.Category.PACKAGING,
                "amount": "125.75",
                "date": timezone.localdate().isoformat(),
                "payment_method": Expense.PaymentMethod.CARD,
                "paid_to": "Box supplier",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.json()["amount"], "125.75")
        self.assertEqual(Expense.objects.get().created_by_id, self.manager.pk)

        listing = self.client.get(
            "/api/expenses/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.json()), 1)

        foreign_expense = Expense.objects.create(
            restaurant=self.other_restaurant,
            title="Other restaurant expense",
            category=Expense.Category.RENT,
            amount="10.00",
            date=timezone.localdate(),
            payment_method=Expense.PaymentMethod.CASH,
            paid_to="Landlord",
        )
        self.assertEqual(
            self.client.get(
                "/api/expenses/",
                {"restaurant_id": self.other_restaurant.pk},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/expenses/",
                {
                    "restaurant_id": self.other_restaurant.pk,
                    "title": "Unauthorized",
                    "category": Expense.Category.OTHER,
                    "amount": "1.00",
                    "date": timezone.localdate().isoformat(),
                    "payment_method": Expense.PaymentMethod.CASH,
                    "paid_to": "Vendor",
                },
                format="json",
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.delete(f"/api/expenses/{foreign_expense.pk}/").status_code,
            404,
        )
        self.assertTrue(Expense.objects.filter(pk=foreign_expense.pk).exists())

        delete = self.client.delete(f"/api/expenses/{create.json()['id']}/")
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(Expense.objects.filter(pk=create.json()["id"]).exists())

    def test_expense_creation_requires_authentication_and_positive_amount(self):
        response = self.client.get("/api/expenses/", {"restaurant_id": self.restaurant.pk})
        self.assertEqual(response.status_code, 401)

        self.client.force_login(self.manager)
        response = self.client.post(
            "/api/expenses/",
            {
                "restaurant_id": self.restaurant.pk,
                "title": "Invalid expense",
                "category": Expense.Category.OTHER,
                "amount": "0.00",
                "date": timezone.localdate().isoformat(),
                "payment_method": Expense.PaymentMethod.CASH,
                "paid_to": "Vendor",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Expense.objects.exists())

    def test_reports_reject_cross_restaurant_access(self):
        self.client.force_login(self.manager)
        response = self.client.get(
            "/api/reports/summary/",
            {"restaurant_id": self.other_restaurant.id},
        )
        self.assertEqual(response.status_code, 403)

    def test_reports_filter_sales_by_requested_local_date_range(self):
        self.client.force_login(self.manager)
        today = timezone.localdate().isoformat()
        today_response = self.client.get(
            "/api/reports/summary/",
            {
                "restaurant_id": self.restaurant.id,
                "start_date": today,
                "end_date": today,
            },
        )
        self.assertEqual(today_response.status_code, 200)
        self.assertEqual(today_response.json()["summary"]["orders"], 1)

        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        yesterday_response = self.client.get(
            "/api/reports/summary/",
            {
                "restaurant_id": self.restaurant.id,
                "start_date": yesterday,
                "end_date": yesterday,
            },
        )
        self.assertEqual(yesterday_response.status_code, 200)
        self.assertEqual(yesterday_response.json()["summary"]["orders"], 0)

    def test_reports_accept_a_bounded_sales_series_range(self):
        self.client.force_login(self.manager)
        end_date = timezone.localdate()
        start_date = end_date - timedelta(days=2)
        response = self.client.get(
            "/api/reports/summary/",
            {
                "restaurant_id": self.restaurant.id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "series_start_date": start_date.isoformat(),
                "series_end_date": end_date.isoformat(),
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["sales_series"]), 3)

        invalid_response = self.client.get(
            "/api/reports/summary/",
            {
                "restaurant_id": self.restaurant.id,
                "series_start_date": start_date.isoformat(),
            },
        )
        self.assertEqual(invalid_response.status_code, 400)

    def test_same_user_can_submit_multiple_menu_votes_for_same_day(self):
        self.client.force_login(self.manager)
        response = self.client.post(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.id,
                "menu_item_id": self.item_a.id,
                "vote_date": "2026-10-31",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(MenuVote.objects.count(), 1)

        second = self.client.post(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.id,
                "menu_item_id": self.item_b.id,
                "vote_date": "2026-10-31",
            },
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(MenuVote.objects.count(), 2)
        self.assertSetEqual(
            set(MenuVote.objects.values_list("menu_item_id", flat=True)),
            {self.item_a.id, self.item_b.id},
        )

    def test_food_rating_restricts_duplicate_entries_per_order(self):
        order_item = self.order.items.get(menu_item=self.item_a)
        response = self.client.post(
            "/api/food-ratings/",
            {
                "order_number": str(self.order.order_number),
                "order_item_id": order_item.pk,
                "rating": 5,
                "comment": "Excellent",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        second = self.client.post(
            "/api/food-ratings/",
            {
                "order_number": str(self.order.order_number),
                "order_item_id": order_item.pk,
                "rating": 4,
                "comment": "Still good",
            },
            format="json",
        )
        self.assertEqual(second.status_code, 409)
        self.assertEqual(FoodRating.objects.filter(order=self.order).count(), 1)

    def test_restaurant_settings_and_notifications_are_scoped(self):
        self.client.force_login(self.manager)
        settings_response = self.client.get(
            "/api/settings/",
            {"restaurant_id": self.restaurant.id},
        )
        self.assertEqual(settings_response.status_code, 200)
        self.assertEqual(settings_response.json()["restaurant_name"], self.restaurant.name)

        patch_response = self.client.patch(
            "/api/settings/",
            {"restaurant_id": self.restaurant.id, "currency": "USD"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()["currency"], "USD")

        notification_response = self.client.get(
            "/api/notifications/",
            {"restaurant_id": self.restaurant.id},
        )
        self.assertEqual(notification_response.status_code, 200)
        self.assertGreaterEqual(len(notification_response.json()), 0)


class PublicLiveDisplayAndVotingApiTests(APITestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="Public Restaurant",
            address="1 Public Street",
        )
        self.other_restaurant = Restaurant.objects.create(
            name="Private Restaurant",
            address="2 Private Street",
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Lunch",
        )
        self.item = MenuItem.objects.create(
            category=self.category,
            name="Public Dish",
            description="A public description",
            price="12.50",
        )
        self.other_item = MenuItem.objects.create(
            category=MenuCategory.objects.create(
                restaurant=self.other_restaurant,
                name="Other",
            ),
            name="Other Dish",
            price="5.00",
        )
        self.manager = get_user_model().objects.create_user(
            username="public-poll-manager",
            email="poll-manager@example.com",
            password="test-pass-123",
        )
        RestaurantMembership.objects.create(
            user=self.manager,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )

    def test_public_display_returns_only_minimal_order_status_data(self):
        order = Order.objects.create(
            restaurant=self.restaurant,
            status=Order.OrderStatus.READY,
            display_order_number="A-01",
            display_order_date=timezone.now().date(),
        )
        Order.objects.create(
            restaurant=self.other_restaurant,
            status=Order.OrderStatus.PREPARING,
        )
        response = self.client.get(
            "/api/public/live-display/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["restaurant"], {"id": self.restaurant.pk, "name": self.restaurant.name})
        self.assertEqual(len(payload["orders"]), 1)
        self.assertEqual(
            payload["orders"][0],
            {
                "public_number": "A-01",
                "status": "READY",
                "created_at": order.created_at.isoformat().replace("+00:00", "Z"),
            },
        )
        self.assertNotIn("customer", payload["orders"][0])
        self.assertNotIn("payment_status", payload["orders"][0])

    def test_public_display_restaurant_list_only_exposes_active_name_and_id(self):
        response = self.client.get("/api/public/restaurants/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            [
                {"id": self.other_restaurant.pk, "name": self.other_restaurant.name},
                {"id": self.restaurant.pk, "name": self.restaurant.name},
            ],
        )

    def test_multiple_guests_can_vote_from_the_same_browser(self):
        poll = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertEqual(poll.status_code, 200)
        self.assertTrue(poll.json()["period"]["is_open"])
        expected_target_date = (
            timezone.now().astimezone().date() + timedelta(days=1)
        )
        self.assertEqual(
            poll.json()["period"]["vote_date"],
            expected_target_date.isoformat(),
        )
        self.assertEqual(poll.json()["options"][0]["id"], self.item.pk)
        self.assertIsNone(poll.json()["total_votes"])
        self.assertTrue(poll.cookies["qiosk_menu_voter"]["httponly"])

        vote = self.client.post(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "menu_item_id": self.item.pk},
            format="json",
        )
        self.assertEqual(vote.status_code, 201)
        duplicate = self.client.post(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "menu_item_id": self.item.pk},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 201)
        self.assertEqual(MenuVote.objects.filter(restaurant=self.restaurant).count(), 2)
        self.assertTrue(
            MenuVote.objects.filter(
                restaurant=self.restaurant,
                user__isnull=True,
                vote_date=expected_target_date,
            ).exists()
        )

    def test_guest_can_record_not_voting_without_counting_as_dish_vote(self):
        response = self.client.post(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "abstain": True},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.json()["menu_item"])
        self.assertEqual(response.json()["detail"], "Your response has been recorded.")

        self.client.force_login(self.manager)
        poll = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "manage": "true"},
        )
        self.assertEqual(poll.status_code, 200)
        self.assertEqual(poll.json()["total_votes"], 0)
        self.assertEqual(poll.json()["abstentions"], 1)
        self.assertIsNone(MenuVote.objects.get().menu_item_id)

    def test_guest_can_like_or_dislike_and_management_shows_separate_counts(self):
        like = self.client.post(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "menu_item_id": self.item.pk,
                "sentiment": "LIKE",
            },
            format="json",
        )
        dislike = self.client.post(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "menu_item_id": self.item.pk,
                "sentiment": "DISLIKE",
            },
            format="json",
        )
        self.assertEqual(like.status_code, 201)
        self.assertEqual(dislike.status_code, 201)

        self.client.force_login(self.manager)
        poll = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "manage": "true"},
        )
        option = poll.json()["options"][0]
        self.assertEqual(option["votes"], 2)
        self.assertEqual(option["likes"], 1)
        self.assertEqual(option["dislikes"], 1)

    def test_guest_vote_rejects_unknown_sentiment(self):
        response = self.client.post(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "menu_item_id": self.item.pk,
                "sentiment": "MAYBE",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(MenuVote.objects.exists())

    def test_anonymous_vote_submission_requires_csrf(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            "/api/menu-votes/",
            data=json.dumps({
                "restaurant_id": self.restaurant.pk,
                "menu_item_id": self.item.pk,
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(MenuVote.objects.exists())

    def test_guest_vote_is_rejected_for_item_from_another_restaurant(self):
        response = self.client.post(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "menu_item_id": self.other_item.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(MenuVote.objects.exists())

    def test_guest_vote_is_rejected_when_manager_closes_poll(self):
        RestaurantSetting.objects.create(
            restaurant=self.restaurant,
            menu_voting_enabled=False,
        )
        poll = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertFalse(poll.json()["period"]["is_open"])
        self.assertTrue(poll.json()["results_visible"])
        response = self.client.post(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "menu_item_id": self.item.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("closed", response.json()["detail"].lower())

    def test_voting_administration_requires_membership_and_manager_for_changes(self):
        anonymous_response = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "manage": "true"},
        )
        self.assertEqual(anonymous_response.status_code, 401)

        self.client.force_login(self.manager)
        other_restaurant_response = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.other_restaurant.pk, "manage": "true"},
        )
        self.assertEqual(other_restaurant_response.status_code, 403)

        close_response = self.client.patch(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk, "is_open": False},
            format="json",
        )
        self.assertEqual(close_response.status_code, 200)
        self.assertFalse(close_response.json()["is_open"])

    def test_staff_configures_eligible_dishes_and_customer_results_visibility(self):
        second_item = MenuItem.objects.create(
            category=self.category,
            name="Second Dish",
            price="15.00",
        )
        self.client.force_login(self.manager)
        configure_response = self.client.patch(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "eligible_menu_item_ids": [self.item.pk],
                "starts_at": "00:00",
                "ends_at": "23:59",
                "publish_results": True,
            },
            format="json",
        )
        self.assertEqual(configure_response.status_code, 200)
        self.client.logout()

        poll = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertEqual([item["id"] for item in poll.json()["options"]], [self.item.pk])
        self.assertFalse(poll.json()["results_visible"])
        self.assertEqual(poll.json()["total_votes"], None)

        period = MenuVotingPeriod.objects.get(restaurant=self.restaurant)
        period.is_open = False
        period.save(update_fields=["is_open", "updated_at"])
        published_poll = self.client.get(
            "/api/menu-votes/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertTrue(published_poll.json()["results_visible"])
        self.assertNotIn(second_item.pk, [item["id"] for item in published_poll.json()["options"]])

    def test_voting_schedule_and_eligible_dish_validation(self):
        self.client.force_login(self.manager)
        conflicting_item_configuration = self.client.patch(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "eligible_menu_item_ids": [self.item.pk],
                "use_all_active_items": True,
            },
            format="json",
        )
        self.assertEqual(conflicting_item_configuration.status_code, 400)
        invalid_schedule = self.client.patch(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "starts_at": "19:00",
                "ends_at": "09:00",
            },
            format="json",
        )
        self.assertEqual(invalid_schedule.status_code, 400)
        cross_restaurant_option = self.client.patch(
            "/api/menu-votes/",
            {
                "restaurant_id": self.restaurant.pk,
                "eligible_menu_item_ids": [self.other_item.pk],
            },
            format="json",
        )
        self.assertEqual(cross_restaurant_option.status_code, 400)

    def test_dashboard_report_requires_membership_and_valid_date_range(self):
        anonymous_response = self.client.get(
            "/api/reports/summary/",
            {"restaurant_id": self.restaurant.pk},
        )
        self.assertEqual(anonymous_response.status_code, 401)

        self.client.force_login(self.manager)
        foreign_response = self.client.get(
            "/api/reports/summary/",
            {"restaurant_id": self.other_restaurant.pk},
        )
        self.assertEqual(foreign_response.status_code, 403)

        invalid_response = self.client.get(
            "/api/reports/summary/",
            {
                "restaurant_id": self.restaurant.pk,
                "start_date": "2026-11-02",
                "end_date": "2026-11-01",
            },
        )
        self.assertEqual(invalid_response.status_code, 400)

        malformed_response = self.client.get(
            "/api/reports/summary/",
            {
                "restaurant_id": self.restaurant.pk,
                "start_date": "20261101",
            },
        )
        self.assertEqual(malformed_response.status_code, 400)


@override_settings(
    MAILERS={"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}},
    PASSWORD_RESET_TIMEOUT=3600,
)
class AccountSetupAndManagementApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        state, _ = RestaurantSetupState.objects.get_or_create(pk=1)
        state.completed_at = None
        state.save(update_fields=["completed_at"])

    def test_initial_setup_requires_csrf_for_session_clients(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            "/api/auth/setup/",
            data=json.dumps({
                "username": "csrf-owner",
                "email": "csrf-owner@example.com",
                "password": "N0t-common-password-2026!",
                "password_confirm": "N0t-common-password-2026!",
                "restaurant_name": "CSRF Restaurant",
                "address": "1 Safe Street",
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(get_user_model().objects.exists())

    def test_public_owner_signup_creates_separate_restaurant_for_each_owner(self):
        available = self.client.get("/api/auth/setup/")
        self.assertTrue(available.json()["available"])

        response = self.client.post(
            "/api/auth/setup/",
            {
                "username": "first-owner",
                "email": "owner@example.com",
                "password": "N0t-common-password-2026!",
                "password_confirm": "N0t-common-password-2026!",
                "restaurant_name": "First Restaurant",
                "address": "1 Owner Street",
                "phone_number": "1234567890",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        owner = get_user_model().objects.get(username="first-owner")
        self.assertTrue(owner.check_password("N0t-common-password-2026!"))
        membership = RestaurantMembership.objects.get(user=owner)
        self.assertEqual(membership.role, RestaurantMembership.Role.OWNER)
        self.assertTrue(membership.is_active)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.assertTrue(self.client.get("/api/auth/setup/").json()["available"])
        second_signup = self.client.post(
            "/api/auth/setup/",
            {
                "username": "second-owner",
                "email": "second@example.com",
                "password": "N0t-common-password-2026!",
                "password_confirm": "N0t-common-password-2026!",
                "restaurant_name": "Second Restaurant",
                "address": "2 Owner Street",
            },
            format="json",
        )
        self.assertEqual(second_signup.status_code, 201)
        second_owner = get_user_model().objects.get(username="second-owner")
        second_membership = RestaurantMembership.objects.get(user=second_owner)
        self.assertEqual(second_membership.role, RestaurantMembership.Role.OWNER)
        self.assertNotEqual(second_membership.restaurant_id, membership.restaurant_id)
        self.assertEqual(Restaurant.objects.count(), 2)
        self.assertEqual(
            list(
                Restaurant.objects.filter(
                    memberships__user=second_owner,
                    memberships__is_active=True,
                ).values_list("pk", flat=True)
            ),
            [second_membership.restaurant_id],
        )
        self.assertTrue(self.client.get("/api/auth/setup/").json()["available"])

    def test_owner_signup_allows_more_than_three_attempts(self):
        for attempt in range(4):
            response = self.client.post(
                "/api/auth/setup/",
                {
                    "username": f"owner-attempt-{attempt}",
                    "email": f"owner-attempt-{attempt}@example.com",
                    "password": "weak",
                    "password_confirm": "weak",
                    "restaurant_name": "Attempt Restaurant",
                    "address": "1 Attempt Street",
                },
                format="json",
            )
            self.assertEqual(response.status_code, 400)

    def test_initial_setup_rejects_mismatched_and_weak_passwords(self):
        mismatch = self.client.post(
            "/api/auth/setup/",
            {
                "username": "first-owner",
                "email": "owner@example.com",
                "password": "first-password",
                "password_confirm": "different-password",
                "restaurant_name": "First Restaurant",
                "address": "1 Owner Street",
            },
            format="json",
        )
        self.assertEqual(mismatch.status_code, 400)
        self.assertFalse(get_user_model().objects.exists())

        weak = self.client.post(
            "/api/auth/setup/",
            {
                "username": "first-owner",
                "email": "owner@example.com",
                "password": "password",
                "password_confirm": "password",
                "restaurant_name": "First Restaurant",
                "address": "1 Owner Street",
            },
            format="json",
        )
        self.assertEqual(weak.status_code, 400)
        self.assertFalse(get_user_model().objects.exists())

    def test_restaurant_staff_invite_uses_expiring_single_use_password_setup(self):
        restaurant = Restaurant.objects.create(name="Invite Place", address="1 Invite Road")
        owner = get_user_model().objects.create_user(
            username="invite-owner",
            email="invite-owner@example.com",
            password="Owner-password-2026!",
        )
        RestaurantMembership.objects.create(
            user=owner,
            restaurant=restaurant,
            role=RestaurantMembership.Role.OWNER,
        )
        self.client.force_login(owner)
        invite = self.client.post(
            "/api/users/",
            {
                "restaurant_id": restaurant.pk,
                "username": "invited-staff",
                "email": "invited@example.com",
                "role": RestaurantMembership.Role.STAFF,
            },
            format="json",
        )
        self.assertEqual(invite.status_code, 201)
        invited_user = get_user_model().objects.get(username="invited-staff")
        self.assertFalse(invited_user.is_active)
        self.assertFalse(invited_user.has_usable_password())
        self.assertNotIn("token", invite.json())
        token_match = re.search(r"/admin/invite/([^\s]+)", mail.outbox[0].body)
        self.assertIsNotNone(token_match)
        token = token_match.group(1)

        accept = self.client.post(
            "/api/auth/invitations/accept/",
            {
                "token": token,
                "password": "Invited-password-2026!",
                "password_confirm": "Invited-password-2026!",
            },
            format="json",
        )
        self.assertEqual(accept.status_code, 200)
        invited_user.refresh_from_db()
        membership = RestaurantMembership.objects.get(user=invited_user, restaurant=restaurant)
        self.assertTrue(invited_user.is_active)
        self.assertTrue(invited_user.check_password("Invited-password-2026!"))
        self.assertTrue(membership.is_active)

        duplicate = self.client.post(
            "/api/auth/invitations/accept/",
            {
                "token": token,
                "password": "Other-password-2026!",
                "password_confirm": "Other-password-2026!",
            },
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)

    def test_managers_cannot_invite_managers_or_access_foreign_memberships(self):
        restaurant = Restaurant.objects.create(name="Staff Place", address="1 Staff Road")
        other_restaurant = Restaurant.objects.create(name="Other Place", address="2 Staff Road")
        manager = get_user_model().objects.create_user(
            username="staff-manager",
            email="staff-manager@example.com",
            password="Manager-password-2026!",
        )
        membership = RestaurantMembership.objects.create(
            user=manager,
            restaurant=restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )
        self.client.force_login(manager)
        denied_invite = self.client.post(
            "/api/users/",
            {
                "restaurant_id": restaurant.pk,
                "username": "manager-two",
                "email": "manager-two@example.com",
                "role": RestaurantMembership.Role.MANAGER,
            },
            format="json",
        )
        self.assertEqual(denied_invite.status_code, 403)
        foreign_list = self.client.get("/api/users/", {"restaurant_id": other_restaurant.pk})
        self.assertEqual(foreign_list.status_code, 403)
        local_list = self.client.get("/api/users/", {"restaurant_id": restaurant.pk})
        self.assertEqual(local_list.status_code, 200)
        self.client.logout()
        anonymous_list = self.client.get("/api/users/", {"restaurant_id": restaurant.pk})
        self.assertEqual(anonymous_list.status_code, 401)

    def test_last_active_owner_cannot_be_deactivated(self):
        restaurant = Restaurant.objects.create(name="Owner Place", address="1 Owner Road")
        owner = get_user_model().objects.create_user(
            username="only-owner",
            email="only-owner@example.com",
            password="Owner-password-2026!",
        )
        membership = RestaurantMembership.objects.create(
            user=owner,
            restaurant=restaurant,
            role=RestaurantMembership.Role.OWNER,
        )
        self.client.force_login(owner)
        response = self.client.patch(
            f"/api/users/{membership.pk}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        membership.refresh_from_db()
        self.assertTrue(membership.is_active)

    def test_authenticated_password_change_requires_current_password(self):
        user = get_user_model().objects.create_user(
            username="password-user",
            password="Old-password-2026!",
        )
        self.client.force_login(user)
        rejected = self.client.post(
            "/api/auth/password/change/",
            {
                "current_password": "incorrect",
                "password": "New-password-2026!",
                "password_confirm": "New-password-2026!",
            },
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)
        changed = self.client.post(
            "/api/auth/password/change/",
            {
                "current_password": "Old-password-2026!",
                "password": "New-password-2026!",
                "password_confirm": "New-password-2026!",
            },
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("New-password-2026!"))
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)


class GuestFoodRatingApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.restaurant = Restaurant.objects.create(name="Ratings Place", address="1 Rating Road")
        self.other_restaurant = Restaurant.objects.create(name="Other Ratings", address="2 Rating Road")
        self.category = MenuCategory.objects.create(restaurant=self.restaurant, name="Dinner")
        self.item = MenuItem.objects.create(category=self.category, name="Noodles", price="12.00")
        self.other_item = MenuItem.objects.create(
            category=MenuCategory.objects.create(restaurant=self.other_restaurant, name="Other"),
            name="Other Dish",
            price="9.00",
        )
        self.order = Order.objects.create(
            restaurant=self.restaurant,
            order_number=uuid.uuid4(),
            status=Order.OrderStatus.COMPLETED,
            total_amount="12.00",
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            menu_item=self.item,
            item_name=self.item.name,
            unit_price="12.00",
            quantity=1,
            subtotal="12.00",
        )

    def test_guest_order_returns_only_the_order_number_for_rating_lookup(self):
        response = self.client.post(
            "/api/orders/create/",
            {
                "restaurant": self.restaurant.pk,
                "order_type": Order.OrderType.TAKEAWAY,
                "items": [{"menu_item": self.item.pk, "quantity": 2}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn("order_number", response.json())
        self.assertNotIn("rating_receipt_token", response.json())
        created_order = Order.objects.get(order_number=response.json()["order_number"])
        self.assertEqual(created_order.receipt_token_hash, "")

    def test_guest_verifies_completed_order_without_private_order_data(self):
        response = self.client.post(
            "/api/food-ratings/verify/",
            {"order_number": str(self.order.order_number)},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["items"], [{"order_item_id": self.order_item.pk, "name": "Noodles"}])
        self.assertNotIn("payment_status", payload)
        self.assertNotIn("customer", payload)
        self.assertNotIn("phone", payload)
        self.assertNotIn("restaurant", payload)
        self.assertNotIn("total_amount", payload)
        self.assertEqual(payload["display_order_number"], self.order.display_order_number)

    def test_public_display_order_number_alone_cannot_verify_a_rating_order(self):
        response = self.client.post(
            "/api/food-ratings/verify/",
            {"order_number": "A-15"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_guest_rating_is_persisted_once_per_order_item(self):
        rating_payload = {
            "order_number": str(self.order.order_number),
            "order_item_id": self.order_item.pk,
            "rating": 5,
            "comment": "Excellent",
        }
        response = self.client.post("/api/food-ratings/", rating_payload, format="json")
        self.assertEqual(response.status_code, 201)
        rating = FoodRating.objects.get()
        self.assertIsNone(rating.user_id)
        self.assertEqual(rating.order_item_id, self.order_item.pk)
        duplicate = self.client.post("/api/food-ratings/", rating_payload, format="json")
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(FoodRating.objects.count(), 1)
        lookup_again = self.client.post(
            "/api/food-ratings/verify/",
            {"order_number": str(self.order.order_number)},
            format="json",
        )
        self.assertEqual(lookup_again.status_code, 200)
        self.assertEqual(lookup_again.json()["items"], [])
        self.assertTrue(lookup_again.json()["already_rated"])

    def test_unknown_order_and_unrelated_order_item_are_rejected(self):
        unknown = self.client.post(
            "/api/food-ratings/verify/",
            {"order_number": str(uuid.uuid4())},
            format="json",
        )
        self.assertEqual(unknown.status_code, 404)

        pending_order = Order.objects.create(
            restaurant=self.restaurant,
            status=Order.OrderStatus.PREPARING,
        )
        pending = self.client.post(
            "/api/food-ratings/verify/",
            {"order_number": str(pending_order.order_number)},
            format="json",
        )
        self.assertEqual(pending.status_code, 409)
        self.assertIn("not complete", pending.json()["detail"].lower())

        unrelated_item = self.client.post(
            "/api/food-ratings/",
            {
            "order_number": str(self.order.order_number),
                "order_item_id": self.order_item.pk + 100,
                "rating": 4,
            },
            format="json",
        )
        self.assertEqual(unrelated_item.status_code, 400)
        invalid_rating = self.client.post(
            "/api/food-ratings/",
            {
                "order_number": str(self.order.order_number),
                "order_item_id": self.order_item.pk,
                "rating": 6,
            },
            format="json",
        )
        self.assertEqual(invalid_rating.status_code, 400)

    def test_guest_rating_cannot_cross_restaurant_and_staff_gets_aggregates(self):
        other_order = Order.objects.create(
            restaurant=self.other_restaurant,
            status=Order.OrderStatus.COMPLETED,
        )
        self.assertEqual(
            self.client.post(
                "/api/food-ratings/verify/",
                {"order_number": str(other_order.order_number)},
                format="json",
            ).status_code,
            200,
        )

        user = get_user_model().objects.create_user(
            username="rating-manager",
            email="rating-manager@example.com",
            password="Rating-password-2026!",
        )
        RestaurantMembership.objects.create(
            user=user,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.MANAGER,
        )
        self.client.force_login(user)
        self.client.post(
            "/api/food-ratings/",
            {
                "order_number": str(self.order.order_number),
                "order_item_id": self.order_item.pk,
                "rating": 4,
                "comment": "Good",
            },
            format="json",
        )
        response = self.client.get("/api/food-ratings/", {"restaurant_id": self.restaurant.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rating_count"], 1)
        self.assertEqual(response.json()["average_rating"], 4.0)
        self.assertNotIn("user", response.json()["recent"][0])


@override_settings(
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}
)
class PublicOrderWebSocketTests(TransactionTestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="Display Restaurant",
            address="1 Display Street",
        )
        self.other_restaurant = Restaurant.objects.create(
            name="Other Display Restaurant",
            address="2 Display Street",
        )
        self.staff = get_user_model().objects.create_user(
            username="display-staff",
            password="test-pass-123",
        )
        RestaurantMembership.objects.create(
            user=self.staff,
            restaurant=self.restaurant,
            role=RestaurantMembership.Role.STAFF,
        )

    async def test_public_consumer_scopes_events_and_sends_only_safe_fields(self):
        from .routing import websocket_urlpatterns

        application = URLRouter(websocket_urlpatterns)
        communicator = WebsocketCommunicator(
            application,
            f"/ws/public/orders/?restaurant_id={self.restaurant.pk}",
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        layer = get_channel_layer()
        await layer.group_send(
            f"orders_restaurant_{self.other_restaurant.pk}",
            {
                "type": "order_update",
                "data": {
                    "event": "order.updated",
                    "order": {
                        "restaurant": self.other_restaurant.pk,
                        "order_number": str(uuid.uuid4()),
                        "status": "READY",
                    },
                },
            },
        )
        self.assertTrue(await communicator.receive_nothing(timeout=0.1))

        order_number = str(uuid.uuid4())
        await layer.group_send(
            f"orders_restaurant_{self.restaurant.pk}",
            {
                "type": "order_update",
                "data": {
                    "event": "order.updated",
                    "order": {
                        "restaurant": self.restaurant.pk,
                        "order_number": order_number,
                        "display_order_number": "B-07",
                        "status": "READY",
                        "created_at": "2026-11-01T10:00:00Z",
                        "customer_name": "Private Name",
                        "phone": "private",
                        "payment_status": "PAID",
                    },
                },
            },
        )
        message = await communicator.receive_json_from(timeout=1)
        self.assertEqual(
            message,
            {
                "event": "order.updated",
                "order": {
                    "public_number": "B-07",
                    "status": "READY",
                    "created_at": "2026-11-01T10:00:00Z",
                },
            },
        )
        await communicator.disconnect()

    async def test_staff_websocket_rejects_anonymous_connection(self):
        from .routing import websocket_urlpatterns

        communicator = WebsocketCommunicator(
            URLRouter(websocket_urlpatterns),
            f"/ws/orders/?restaurant_id={self.restaurant.pk}",
        )
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4401)

    async def test_staff_websocket_rejects_subscription_to_another_restaurant(self):
        from .routing import websocket_urlpatterns

        router = URLRouter(websocket_urlpatterns)

        async def authenticated_application(scope, receive, send):
            scope["user"] = self.staff
            await router(scope, receive, send)

        communicator = WebsocketCommunicator(
            authenticated_application,
            f"/ws/orders/?restaurant_id={self.other_restaurant.pk}",
        )
        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4403)
