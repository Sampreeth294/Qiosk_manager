from decimal import Decimal

from rest_framework import serializers

from .models import Ingredient, StockMovement


class IngredientSerializer(serializers.ModelSerializer):
    opening_quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal("0"),
        write_only=True,
        required=False,
        default=Decimal("0"),
    )
    is_low_stock = serializers.BooleanField(read_only=True)
    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Ingredient
        fields = [
            "id",
            "restaurant",
            "supplier",
            "supplier_name",
            "name",
            "sku",
            "description",
            "category",
            "unit",
            "current_quantity",
            "opening_quantity",
            "minimum_quantity",
            "unit_cost",
            "is_active",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "current_quantity",
            "is_low_stock",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        restaurant = attrs.get(
            "restaurant",
            getattr(self.instance, "restaurant", None),
        )
        supplier = attrs.get(
            "supplier",
            getattr(self.instance, "supplier", None),
        )
        if (
            supplier is not None
            and restaurant is not None
            and supplier.restaurant_id != restaurant.pk
        ):
            raise serializers.ValidationError({
                "supplier": "Supplier must belong to the same restaurant."
            })
        return attrs


class StockMovementSerializer(serializers.ModelSerializer):
    restaurant = serializers.IntegerField(
        source="ingredient.restaurant_id",
        read_only=True,
    )
    ingredient_name = serializers.CharField(
        source="ingredient.name",
        read_only=True,
    )
    unit = serializers.CharField(
        source="ingredient.unit",
        read_only=True,
    )
    username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "restaurant",
            "unit",
            "movement_type",
            "quantity_delta",
            "quantity_before",
            "quantity_after",
            "reason",
            "reference",
            "purchase_order_line",
            "order",
            "created_by",
            "username",
            "idempotency_key",
            "created_at",
        ]
        read_only_fields = fields


class StockChangeSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal("0.001"),
    )
    reason = serializers.CharField(max_length=1000)
    reference = serializers.CharField(
        max_length=120,
        required=False,
        allow_blank=True,
    )
    idempotency_key = serializers.UUIDField()

    def validate_reason(self, value):
        reason = value.strip()
        if not reason:
            raise serializers.ValidationError("A reason is required.")
        return reason


class StockAdjustmentSerializer(StockChangeSerializer):
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=Decimal("-999999999.999"),
    )

    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError(
                "Adjustment quantity must not be zero."
            )
        return value
