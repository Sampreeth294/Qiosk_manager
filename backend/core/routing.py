
from django.urls import path

from core.consumers import OrderConsumer

websocket_urlpatterns = [
    path("ws/orders/", OrderConsumer.as_asgi()),
]
