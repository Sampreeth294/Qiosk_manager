
from django.contrib import admin
from django.core.exceptions import PermissionDenied

from .models import (
    MenuCategory,
    MenuItem,
    Restaurant,
    RestaurantMembership,
)


@admin.register(RestaurantMembership)
class RestaurantMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "restaurant",
        "role",
        "is_active",
        "created_at",
    )
    list_filter = ("restaurant", "role", "is_active")
    search_fields = ("user__username", "restaurant__name")

    def _managed_restaurant_ids(self, request):
        return RestaurantMembership.objects.filter(
            user=request.user,
            role=RestaurantMembership.Role.MANAGER,
            is_active=True,
        ).values_list("restaurant_id", flat=True)

    def _is_manager(self, request):
        return (
            request.user.is_authenticated
            and not request.user.is_superuser
            and self._managed_restaurant_ids(request).exists()
        )

    def has_module_permission(self, request):
        return request.user.is_superuser or self._is_manager(request)

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True

        if not self._is_manager(request):
            return False

        if obj is None:
            return True

        return (
            obj.restaurant_id in self._managed_restaurant_ids(request)
            and obj.role == RestaurantMembership.Role.STAFF
            and obj.user_id != request.user.pk
        )

    def has_add_permission(self, request):
        return request.user.is_superuser or self._is_manager(request)

    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True

        if not self._is_manager(request):
            return False

        if obj is None:
            return True

        return (
            obj.restaurant_id in self._managed_restaurant_ids(request)
            and obj.role == RestaurantMembership.Role.STAFF
            and obj.user_id != request.user.pk
        )

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related(
            "user",
            "restaurant",
        )
        if request.user.is_superuser:
            return queryset

        return queryset.filter(
            restaurant_id__in=self._managed_restaurant_ids(request),
            role=RestaurantMembership.Role.STAFF,
        ).exclude(user=request.user)

    def get_readonly_fields(self, request, obj=None):
        if request.user.is_superuser:
            return ()

        readonly_fields = ["created_at", "updated_at"]
        if obj is not None:
            readonly_fields.extend(["user", "restaurant", "role"])
        return tuple(readonly_fields)

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if (
            db_field.name == "role"
            and not request.user.is_superuser
        ):
            kwargs["choices"] = [
                (RestaurantMembership.Role.STAFF, "Staff"),
            ]
        return super().formfield_for_choice_field(
            db_field,
            request,
            **kwargs,
        )

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and self._is_manager(request):
            if db_field.name == "restaurant":
                kwargs["queryset"] = Restaurant.objects.filter(
                    pk__in=self._managed_restaurant_ids(request),
                )
            elif db_field.name == "user":
                kwargs["queryset"] = (
                    db_field.remote_field.model._default_manager
                    .filter(is_active=True)
                    .exclude(pk=request.user.pk)
                )

        return super().formfield_for_foreignkey(
            db_field,
            request,
            **kwargs,
        )

    def save_model(self, request, obj, form, change):
        if not request.user.is_superuser:
            if (
                not self._is_manager(request)
                or obj.role != RestaurantMembership.Role.STAFF
                or obj.user_id == request.user.pk
                or obj.restaurant_id not in self._managed_restaurant_ids(request)
            ):
                raise PermissionDenied

            if change:
                original = self.get_queryset(request).get(pk=obj.pk)
                if (
                    obj.user_id != original.user_id
                    or obj.restaurant_id != original.restaurant_id
                    or obj.role != original.role
                ):
                    raise PermissionDenied

        super().save_model(request, obj, form, change)


@admin.register(Restaurant)  # Registering the Restaurant model
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'phone_number', 'is_active', 'created_at')
    search_fields = ('name', 'address')
    list_filter = ('is_active',)  # The comma makes this a tuple


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'restaurant', 'is_active', 'created_at')
    search_fields = ('name', 'restaurant__name')
    list_filter = ('restaurant', 'is_active')


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_active', 'created_at')
    search_fields = ('name', 'category__name')
    list_filter = ('is_active', 'category')
