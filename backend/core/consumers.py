import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import Restaurant, RestaurantMembership


logger = logging.getLogger(__name__)


@database_sync_to_async
def _can_access_orders(user, restaurant_id):
    if user.is_superuser:
        return True

    return RestaurantMembership.objects.filter(
        user=user,
        restaurant_id=restaurant_id,
        is_active=True,
        role__in=[
            RestaurantMembership.Role.STAFF,
            RestaurantMembership.Role.MANAGER,
            RestaurantMembership.Role.OWNER,
        ],
    ).exists()


@database_sync_to_async
def _is_active_restaurant(restaurant_id):
    return Restaurant.objects.filter(pk=restaurant_id, is_active=True).exists()


class OrderConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        query = parse_qs(
            self.scope.get("query_string", b"").decode("utf-8")
        )
        restaurant_ids = query.get("restaurant_id", [])

        if (
            user is None
            or not user.is_authenticated
            or len(restaurant_ids) != 1
            or not restaurant_ids[0].isdigit()
        ):
            await self.close(code=4401)
            return

        self.restaurant_id = int(restaurant_ids[0])
        if not await _can_access_orders(user, self.restaurant_id):
            await self.close(code=4403)
            return

        self.group_name = f"orders_restaurant_{self.restaurant_id}"
        try:
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )
        except Exception:
            logger.exception(
                "Could not join order event group for restaurant %s",
                self.restaurant_id,
            )
            await self.close(code=1013)
            return

        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name is None:
            return
        try:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name,
            )
        except Exception:
            logger.exception(
                "Could not leave order event group for restaurant %s",
                getattr(self, "restaurant_id", "unknown"),
            )

    async def order_update(self, event):
        user = self.scope.get("user")
        if not await _can_access_orders(user, self.restaurant_id):
            await self.close(code=4403)
            return
        order = event["data"].get("order", {})
        if order.get("restaurant") != self.restaurant_id:
            logger.warning(
                "Rejected mismatched order event for restaurant %s",
                self.restaurant_id,
            )
            return
        await self.send_json(event["data"])


class PublicOrderConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        query = parse_qs(
            self.scope.get("query_string", b"").decode("utf-8")
        )
        restaurant_ids = query.get("restaurant_id", [])
        if (
            len(restaurant_ids) != 1
            or not restaurant_ids[0].isdigit()
            or not await _is_active_restaurant(int(restaurant_ids[0]))
        ):
            await self.close(code=4403)
            return

        self.restaurant_id = int(restaurant_ids[0])
        self.group_name = f"orders_restaurant_{self.restaurant_id}"
        try:
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name,
            )
        except Exception:
            logger.exception(
                "Could not join public order display group for restaurant %s",
                self.restaurant_id,
            )
            await self.close(code=1013)
            return
        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name is not None:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name,
            )

    async def order_update(self, event):
        if not await _is_active_restaurant(self.restaurant_id):
            await self.close(code=4403)
            return
        order = event.get("data", {}).get("order", {})
        if str(order.get("restaurant")) != str(self.restaurant_id):
            return

        order_number = order.get("display_order_number") or order.get("order_number")
        order_status = order.get("status")
        if not order_number:
            return
        public_number = (
            str(order_number)
            if order.get("display_order_number")
            else str(order_number).replace("-", "")[:8].upper()
        )

        if order_status not in {"CONFIRMED", "PREPARING", "READY"}:
            await self.send_json(
                {
                    "event": "order.hidden",
                    "public_number": public_number,
                }
            )
            return

        await self.send_json(
            {
                "event": event.get("data", {}).get("event", "order.updated"),
                "order": {
                    "public_number": public_number,
                    "status": order_status,
                    "created_at": order.get("created_at"),
                },
            }
        )
