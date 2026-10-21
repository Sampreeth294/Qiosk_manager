
from django.contrib import admin  # Registering models in the admin site
from .models import Restaurant, MenuCategory, MenuItem  # Importing models from models.py


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
