
import uuid

from django.db import models


# -------------------------
# RESTAURANT
# -------------------------

class Restaurant(models.Model):
    name = models.CharField(max_length=100)
    address = models.TextField(max_length=200)
    phone_number = models.CharField(max_length=10, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# -------------------------
# MENU CATEGORY
# -------------------------

class MenuCategory(models.Model):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.restaurant.name} - {self.name}"


# -------------------------
# MENU ITEM
# -------------------------

class MenuItem(models.Model):
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.CASCADE,
        related_name="items",
    )
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=200, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(
        upload_to="menu_items/",
        blank=True,
        null=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# -------------------------
# ORDER
# -------------------------

class Order(models.Model):

    class OrderType(models.TextChoices):
        DINE_IN = "DINE_IN", "Dine In"
        TAKEAWAY = "TAKEAWAY", "Takeaway"

    class OrderStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"

    # Unique order identifier
    order_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )

    # Restaurant receiving the order
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="orders",
    )

    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
        default=OrderType.TAKEAWAY,
    )

    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )

    # Required for dine-in orders; blank for takeaway
    table_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.order_number}"


# -------------------------
# ORDER ITEM
# -------------------------

class OrderItem(models.Model):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    # Store a snapshot of the item's name and price
    # so historical orders remain understandable.
    item_name = models.CharField(max_length=100)

    unit_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )

    quantity = models.PositiveIntegerField()

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.item_name} x {self.quantity}"

    def save(self, *args, **kwargs):
        # Calculate the subtotal from the stored unit price.
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)
