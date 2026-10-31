
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_order_event(event_type, order_data):
    """
    Broadcast order events to connected WebSocket clients.
    """
    channel_layer = get_channel_layer()

    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        "orders",
        {
            "type": "order_update",
            "data": {
                "event": event_type,
                "order": order_data,
            },
        },
    )
