from django.db import transaction
from rest_framework import serializers

from .models import (
    Ingredient,
    PurchaseOrder,
    PurchaseOrderLine,
    Supplier,
)


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "restaurant",
            "name",
            "contact_name",
            "email",
            "phone",
            "category",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(
        source="ingredient.name",
        read_only=True,
    )
    unit = serializers.CharField(
        source="ingredient.unit",
        read_only=True,
    )

    class Meta:
        model = PurchaseOrderLine
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "unit",
            "ordered_quantity",
            "received_quantity",
            "unit_price",
        ]
        read_only_fields = [
            "id",
            "ingredient_name",
            "unit",
            "received_quantity",
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(
        source="supplier.name",
        read_only=True,
    )
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "order_number",
            "restaurant",
            "supplier",
            "supplier_name",
            "status",
            "order_date",
            "expected_date",
            "notes",
            "lines",
            "total_amount",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_total_amount(self, obj):
        return sum(
            (
                line.ordered_quantity * line.unit_price
                for line in obj.lines.all()
            ),
            start=0,
        )


class PurchaseOrderLineCreateSerializer(serializers.Serializer):
    ingredient = serializers.PrimaryKeyRelatedField(
        queryset=Ingredient.objects.filter(is_active=True)
    )
    ordered_quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=0,
    )
    unit_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
    )

    def validate_ordered_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Ordered quantity must be greater than zero."
            )
        return value


class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineCreateSerializer(
        many=True,
        allow_empty=False,
        write_only=True,
    )

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "restaurant",
            "supplier",
            "order_date",
            "expected_date",
            "notes",
            "lines",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        restaurant = attrs["restaurant"]
        supplier = attrs["supplier"]
        lines = attrs["lines"]
        expected_date = attrs.get("expected_date")

        if supplier.restaurant_id != restaurant.pk:
            raise serializers.ValidationError({
                "supplier": "Supplier must belong to this restaurant."
            })
        if expected_date and expected_date < attrs["order_date"]:
            raise serializers.ValidationError({
                "expected_date": "Expected date cannot be before order date."
            })

        ingredient_ids = [line["ingredient"].pk for line in lines]
        if len(ingredient_ids) != len(set(ingredient_ids)):
            raise serializers.ValidationError({
                "lines": "An ingredient may appear only once per purchase order."
            })
        if any(
            line["ingredient"].restaurant_id != restaurant.pk
            for line in lines
        ):
            raise serializers.ValidationError({
                "lines": "All ingredients must belong to this restaurant."
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        lines = validated_data.pop("lines")
        order = PurchaseOrder.objects.create(
            **validated_data,
            created_by=self.context["request"].user,
        )
        PurchaseOrderLine.objects.bulk_create(
            [
                PurchaseOrderLine(
                    purchase_order=order,
                    ingredient=line["ingredient"],
                    ordered_quantity=line["ordered_quantity"],
                    unit_price=line["unit_price"],
                )
                for line in lines
            ]
        )
        return order


class PurchaseOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=PurchaseOrder.Status.choices)


class PurchaseReceiptSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=3,
        min_value=0,
    )
    reason = serializers.CharField(max_length=1000)
    idempotency_key = serializers.UUIDField()

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Received quantity must be greater than zero."
            )
        return value

    def validate_reason(self, value):
        reason = value.strip()
        if not reason:
            raise serializers.ValidationError("A reason is required.")
        return reason
