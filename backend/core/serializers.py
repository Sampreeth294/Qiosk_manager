
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Expense,
    Restaurant,
    RestaurantNotification,
    RestaurantSetting,
    MenuCategory,
    MenuItem,
    MenuVote,
    FoodRating,
    Order,
    OrderItem,
)


# -------------------------
# RESTAURANT SERIALIZER
# -------------------------

class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = "__all__"


# -------------------------
# MENU CATEGORY SERIALIZER
# -------------------------

class RestaurantSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantSetting
        fields = "__all__"
        read_only_fields = ["id", "updated_at"]

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError(
                "Enter a valid IANA timezone, such as Asia/Kolkata."
            ) from exc
        return value


class RestaurantNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantNotification
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "restaurant",
            "title",
            "category",
            "amount",
            "date",
            "payment_method",
            "paid_to",
            "created_at",
        ]
        read_only_fields = ["id", "restaurant", "created_at"]


class MenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = "__all__"


# -------------------------
# MENU ITEM SERIALIZER
# -------------------------

class MenuItemSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = "__all__"
        read_only_fields = ["id", "created_at"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")

            if request:
                return request.build_absolute_uri(obj.image.url)

            return obj.image.url

        return None


# -------------------------
# ORDER ITEM SERIALIZER
# -------------------------

class MenuVoteSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(
        source="menu_item.name",
        read_only=True,
    )
    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True,
    )

    class Meta:
        model = MenuVote
        fields = [
            "id",
            "restaurant",
            "restaurant_name",
            "menu_item",
            "menu_item_name",
            "user",
            "vote_date",
            "created_at",
        ]
        read_only_fields = fields


class FoodRatingSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(
        source="menu_item.name",
        read_only=True,
    )
    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True,
    )

    class Meta:
        model = FoodRating
        fields = [
            "id",
            "restaurant",
            "restaurant_name",
            "order",
            "menu_item",
            "menu_item_name",
            "user",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "menu_item",
            "item_name",
            "unit_price",
            "quantity",
            "subtotal",
        ]
        read_only_fields = fields


# -------------------------
# ORDER RESPONSE SERIALIZER
# -------------------------

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    display_order_number = serializers.CharField(read_only=True, allow_null=True)

    restaurant_name = serializers.CharField(
        source="restaurant.name",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "display_order_number",
            "restaurant",
            "restaurant_name",
            "order_type",
            "table_number",
            "status",
            "payment_status",
            "total_amount",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# -------------------------
# ORDER ITEM INPUT SERIALIZER
# -------------------------

class OrderItemCreateSerializer(serializers.Serializer):
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.filter(
            is_active=True,
            category__is_active=True,
            category__restaurant__is_active=True,
        )
    )

    quantity = serializers.IntegerField(
        min_value=1,
        max_value=99,
    )


# -------------------------
# ORDER CREATION SERIALIZER
# -------------------------

class OrderCreateSerializer(serializers.ModelSerializer):
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.filter(is_active=True)
    )

    items = OrderItemCreateSerializer(
        many=True,
        allow_empty=False,
        write_only=True,
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "restaurant",
            "order_type",
            "table_number",
            "items",
        ]

    def validate(self, attrs):
        restaurant = attrs["restaurant"]
        items = attrs["items"]
        order_type = attrs["order_type"]
        table_number = attrs.get("table_number", "").strip()

        if (
            order_type == Order.OrderType.DINE_IN
            and not table_number
        ):
            raise serializers.ValidationError({
                "table_number": (
                    "Table number is required for dine-in orders."
                )
            })

        if order_type == Order.OrderType.TAKEAWAY:
            attrs["table_number"] = ""

        for item in items:
            menu_item = item["menu_item"]

            if menu_item.category.restaurant_id != restaurant.id:
                raise serializers.ValidationError({
                    "items": (
                        f"{menu_item.name} does not belong to "
                        f"{restaurant.name}."
                    )
                })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")
        restaurant = Restaurant.objects.select_for_update().get(
            pk=validated_data["restaurant"].pk,
        )
        setting_timezone = RestaurantSetting.objects.filter(
            restaurant=restaurant,
        ).values_list("timezone", flat=True).first()
        try:
            order_timezone = ZoneInfo(setting_timezone) if setting_timezone else timezone.get_current_timezone()
        except ZoneInfoNotFoundError as exc:
            raise serializers.ValidationError(
                {"restaurant": "The restaurant timezone setting is invalid."}
            ) from exc

        order_date = timezone.now().astimezone(order_timezone).date()
        previous_number = (
            Order.objects.filter(
                restaurant=restaurant,
                display_order_date=order_date,
                display_order_number__isnull=False,
            )
            .order_by("-id")
            .values_list("display_order_number", flat=True)
            .first()
        )
        if previous_number is None:
            sequence = 1
        else:
            previous_sequence = (
                (ord(previous_number[0]) - ord("A")) * 99
                + int(previous_number[2:])
            )
            sequence = previous_sequence + 1
        if sequence > 26 * 99:
            raise serializers.ValidationError(
                {"restaurant": "This restaurant has reached its daily order-number limit."}
            )
        display_order_number = (
            f"{chr(ord('A') + (sequence - 1) // 99)}-{(sequence - 1) % 99 + 1:02d}"
        )
        validated_data["restaurant"] = restaurant

        order = Order.objects.create(
            **validated_data,
            display_order_number=display_order_number,
            display_order_date=order_date,
            total_amount=Decimal("0.00"),
        )

        total = Decimal("0.00")

        for item_data in items_data:
            menu_item = item_data["menu_item"]
            quantity = item_data["quantity"]

            # Use the database price, not a price supplied by the client.
            unit_price = menu_item.price
            subtotal = unit_price * quantity

            OrderItem.objects.create(
                order=order,
                menu_item=menu_item,
                item_name=menu_item.name,
                unit_price=unit_price,
                quantity=quantity,
                subtotal=subtotal,
            )

            total += subtotal

        order.total_amount = total
        order.save(
            update_fields=["total_amount", "updated_at"]
        )

        return order
