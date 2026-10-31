
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


logger = logging.getLogger(__name__)


def broadcast_order_event(event_type, order_data):
    """
    Broadcast order events to connected WebSocket clients.
    """
    channel_layer = get_channel_layer()

    if channel_layer is None:
        logger.warning("Order event was not sent: no channel layer is configured.")
        return

    restaurant_id = order_data.get("restaurant")
    if restaurant_id is None:
        logger.error("Order event was not sent: restaurant id is missing.")
        return

    try:
        async_to_sync(channel_layer.group_send)(
            f"orders_restaurant_{restaurant_id}",
            {
                "type": "order_update",
                "data": {
                    "event": event_type,
                    "order": order_data,
                },
            },
        )
    except Exception:
        logger.exception(
            "Could not broadcast order event for restaurant %s",
            restaurant_id,
        )
