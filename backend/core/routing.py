
from django.urls import path

from core.consumers import OrderConsumer, PublicOrderConsumer

websocket_urlpatterns = [
    path("ws/orders/", OrderConsumer.as_asgi()),
    path("ws/public/orders/", PublicOrderConsumer.as_asgi()),
]
