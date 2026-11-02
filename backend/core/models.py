
import uuid
from datetime import time
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.core.validators import MaxValueValidator, MinValueValidator


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


class RestaurantMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        STAFF = "STAFF", "Staff"
        MANAGER = "MANAGER", "Manager"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="restaurant_memberships",
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STAFF,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "restaurant"],
                name="unique_user_restaurant_membership",
            ),
            models.CheckConstraint(
                condition=models.Q(role__in=["OWNER", "STAFF", "MANAGER"]),
                name="valid_restaurant_membership_role",
            ),
        ]
        ordering = ["restaurant__name", "user__username"]

    def __str__(self):
        return f"{self.user} - {self.restaurant} ({self.role})"


class RestaurantSetupState(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return "Initial restaurant setup"


class RestaurantInvitation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="restaurant_invitations",
    )
    membership = models.ForeignKey(
        RestaurantMembership,
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="sent_restaurant_invitations",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class RestaurantSetting(models.Model):
    restaurant = models.OneToOneField(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    restaurant_name = models.CharField(max_length=120, blank=True)
    contact_email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default="INR")
    timezone = models.CharField(max_length=64, default="UTC")
    auto_accept_orders = models.BooleanField(default=True)
    allow_customer_cancellation = models.BooleanField(default=True)
    order_notifications = models.BooleanField(default=True)
    low_stock_notifications = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=False)
    sound_alerts = models.BooleanField(default=True)
    menu_voting_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.restaurant.name}"


class RestaurantNotification(models.Model):
    class EventType(models.TextChoices):
        ORDER = "ORDER", "Order"
        LOW_STOCK = "LOW_STOCK", "Low Stock"
        REPORT = "REPORT", "Report"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event_type = models.CharField(
        max_length=24,
        choices=EventType.choices,
        default=EventType.ORDER,
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    reference_id = models.IntegerField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.restaurant})"


class Expense(models.Model):
    class Category(models.TextChoices):
        INGREDIENTS = "Ingredients", "Ingredients"
        UTILITIES = "Utilities", "Utilities"
        RENT = "Rent", "Rent"
        SALARIES = "Salaries", "Salaries"
        MAINTENANCE = "Maintenance", "Maintenance"
        PACKAGING = "Packaging", "Packaging"
        OTHER = "Other", "Other"

    class PaymentMethod(models.TextChoices):
        CASH = "Cash", "Cash"
        UPI = "UPI", "UPI"
        CARD = "Card", "Card"
        BANK_TRANSFER = "Bank Transfer", "Bank Transfer"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="recorded_restaurant_expenses",
    )
    title = models.CharField(max_length=160)
    category = models.CharField(max_length=24, choices=Category.choices)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    date = models.DateField()
    payment_method = models.CharField(max_length=24, choices=PaymentMethod.choices)
    paid_to = models.CharField(max_length=160)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["restaurant", "date"])]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="expense_amount_positive",
            ),
        ]

    def __str__(self):
        return f"{self.title} - {self.amount} ({self.restaurant})"


class Supplier(models.Model):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="suppliers",
    )
    name = models.CharField(max_length=120)
    contact_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    category = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_supplier_name_per_restaurant",
            ),
        ]
        ordering = ["name"]

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    class Unit(models.TextChoices):
        KILOGRAM = "kg", "Kilograms (kg)"
        GRAM = "g", "Grams (g)"
        LITER = "L", "Liters (L)"
        MILLILITER = "ml", "Milliliters (ml)"
        EACH = "each", "Each"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="ingredients",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        related_name="ingredients",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=120)
    sku = models.CharField(max_length=64, blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=8, choices=Unit.choices)
    current_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
    )
    minimum_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
    )
    unit_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "name"],
                name="unique_ingredient_name_per_restaurant",
            ),
            models.UniqueConstraint(
                fields=["restaurant", "sku"],
                condition=~Q(sku=""),
                name="unique_ingredient_sku_per_restaurant",
            ),
            models.CheckConstraint(
                condition=Q(current_quantity__gte=0),
                name="ingredient_stock_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(minimum_quantity__gte=0),
                name="ingredient_minimum_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(unit_cost__gte=0),
                name="ingredient_unit_cost_nonnegative",
            ),
        ]
        indexes = [
            models.Index(
                fields=["restaurant", "is_active"],
                name="ingredient_rest_active_idx",
            ),
        ]
        ordering = ["name"]

    @property
    def is_low_stock(self):
        return self.current_quantity <= self.minimum_quantity

    def __str__(self):
        return f"{self.name} ({self.restaurant})"


class PurchaseOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially received"
        RECEIVED = "RECEIVED", "Received"
        CANCELLED = "CANCELLED", "Cancelled"

    order_number = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    order_date = models.DateField()
    expected_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_purchase_orders",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["restaurant", "status", "-created_at"],
                name="purchase_rest_status_idx",
            ),
        ]

    def __str__(self):
        return str(self.order_number)


class PurchaseOrderLine(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.PROTECT,
        related_name="purchase_order_lines",
    )
    ordered_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)],
    )
    received_quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["purchase_order", "ingredient"],
                name="unique_ingredient_per_purchase_order",
            ),
            models.CheckConstraint(
                condition=Q(ordered_quantity__gt=0),
                name="purchase_line_quantity_positive",
            ),
            models.CheckConstraint(
                condition=Q(received_quantity__gte=0)
                & Q(received_quantity__lte=F("ordered_quantity")),
                name="purchase_line_received_within_ordered",
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0),
                name="purchase_line_unit_price_nonnegative",
            ),
        ]

    def __str__(self):
        return f"{self.ingredient.name} x {self.ordered_quantity}"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        RECEIPT = "RECEIPT", "Receipt"
        CONSUMPTION = "CONSUMPTION", "Consumption"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        WASTAGE = "WASTAGE", "Wastage"

    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    purchase_order_line = models.ForeignKey(
        PurchaseOrderLine,
        on_delete=models.PROTECT,
        related_name="stock_movements",
        blank=True,
        null=True,
    )
    order = models.ForeignKey(
        "Order",
        on_delete=models.SET_NULL,
        related_name="stock_movements",
        blank=True,
        null=True,
    )
    movement_type = models.CharField(
        max_length=12,
        choices=MovementType.choices,
    )
    quantity_delta = models.DecimalField(
        max_digits=12,
        decimal_places=3,
    )
    quantity_before = models.DecimalField(
        max_digits=12,
        decimal_places=3,
    )
    quantity_after = models.DecimalField(
        max_digits=12,
        decimal_places=3,
    )
    reason = models.TextField()
    reference = models.CharField(max_length=120, blank=True)
    idempotency_key = models.UUIDField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="stock_movements",
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity_delta__gt=0)
                | Q(quantity_delta__lt=0),
                name="stock_movement_delta_nonzero",
            ),
            models.CheckConstraint(
                condition=Q(quantity_before__gte=0)
                & Q(quantity_after__gte=0),
                name="stock_movement_snapshots_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(
                    quantity_after=F("quantity_before") + F("quantity_delta")
                ),
                name="stock_movement_snapshot_arithmetic",
            ),
            models.CheckConstraint(
                condition=(
                    Q(
                        movement_type="RECEIPT",
                        quantity_delta__gt=0,
                    )
                    | Q(
                        movement_type="CONSUMPTION",
                        quantity_delta__lt=0,
                    )
                    | Q(
                        movement_type="WASTAGE",
                        quantity_delta__lt=0,
                    )
                    | Q(
                        movement_type="ADJUSTMENT",
                        quantity_delta__gt=0,
                    )
                    | Q(
                        movement_type="ADJUSTMENT",
                        quantity_delta__lt=0,
                    )
                ),
                name="stock_movement_type_matches_delta",
            ),
            models.UniqueConstraint(
                fields=["idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="unique_stock_movement_idempotency_key",
            ),
        ]
        indexes = [
            models.Index(
                fields=["ingredient", "-created_at"],
                name="stock_move_ing_time_idx",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.movement_type}: {self.ingredient} {self.quantity_delta}"

    def save(self, *args, **kwargs):
        if self.pk and StockMovement.objects.filter(pk=self.pk).exists():
            raise ValueError("Stock movements are immutable.")
        super().save(*args, **kwargs)
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


class MenuVotingPeriod(models.Model):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menu_voting_periods",
    )
    target_date = models.DateField()
    starts_at = models.TimeField(default=time(0, 0))
    ends_at = models.TimeField(default=time(23, 59))
    is_open = models.BooleanField(default=True)
    publish_results = models.BooleanField(default=True)
    use_all_active_items = models.BooleanField(default=True)
    eligible_items = models.ManyToManyField(
        MenuItem,
        blank=True,
        related_name="voting_periods",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "target_date"],
                name="unique_menu_voting_period_per_restaurant_date",
            ),
            models.CheckConstraint(
                condition=Q(ends_at__gt=F("starts_at")),
                name="menu_voting_period_positive_duration",
            ),
        ]
        ordering = ["-target_date"]


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
    display_order_number = models.CharField(
        max_length=4,
        blank=True,
        null=True,
    )
    display_order_date = models.DateField(blank=True, null=True)

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
    receipt_token_hash = models.CharField(max_length=64, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "display_order_date", "display_order_number"],
                name="unique_daily_display_order_number",
            ),
        ]

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


class MenuVote(models.Model):
    class Sentiment(models.TextChoices):
        LIKE = "LIKE", "Like"
        DISLIKE = "DISLIKE", "Dislike"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="menu_votes",
    )
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="votes",
        blank=True,
        null=True,
    )
    sentiment = models.CharField(
        max_length=7,
        choices=Sentiment.choices,
        blank=True,
        null=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="menu_votes",
        blank=True,
        null=True,
    )
    anonymous_key = models.CharField(
        max_length=64,
        blank=True,
        null=True,
    )
    vote_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(menu_item__isnull=True, sentiment__isnull=True)
                    | Q(
                        menu_item__isnull=False,
                        sentiment__in=["LIKE", "DISLIKE"],
                    )
                ),
                name="menu_vote_sentiment_matches_item",
            ),
            models.CheckConstraint(
                condition=(
                    Q(user__isnull=False, anonymous_key__isnull=True)
                    | Q(user__isnull=True, anonymous_key__isnull=False)
                ),
                name="menu_vote_has_single_voter_identity",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        if self.menu_item_id is None:
            return f"{self.user or 'Guest'} chose not to vote"
        return f"{self.user or 'Guest'} voted for {self.menu_item}"


class FoodRating(models.Model):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="food_ratings",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="food_ratings",
    )
    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.SET_NULL,
        related_name="food_ratings",
        blank=True,
        null=True,
    )
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="food_ratings",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="food_ratings",
        blank=True,
        null=True,
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "user"],
                condition=Q(user__isnull=False),
                name="unique_food_rating_per_user_order",
            ),
            models.UniqueConstraint(
                fields=["order_item"],
                condition=Q(order_item__isnull=False),
                name="unique_guest_rating_per_order_item",
            ),
            models.CheckConstraint(
                condition=Q(rating__gte=1) & Q(rating__lte=5),
                name="food_rating_range",
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} rated {self.menu_item} {self.rating}/5"
