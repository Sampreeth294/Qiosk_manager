from rest_framework.test import APITestCase

from .models import MenuCategory, MenuItem, Order, OrderItem, Restaurant


class OrderApiTests(APITestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            address="1 Test Street",
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
        self.assertEqual(response.data["total_amount"], "25.00")
        self.assertEqual(response.data["items"][0]["item_name"], "Test Item")

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

    def test_order_status_update_persists(self):
        order = Order.objects.create(restaurant=self.restaurant)

        response = self.client.patch(
            f"/api/orders/{order.id}/status/",
            {"status": "CONFIRMED"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.OrderStatus.CONFIRMED)

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
