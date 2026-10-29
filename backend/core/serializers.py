from rest_framework import serializers  # this convert django model to json format and vice versa
from .models import Restaurant, MenuCategory, MenuItem
class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = '__all__'
class MenuCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = '__all__'
class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = '__all__'

        def get__image_url(self, obj):
            request = self.context.get('request')
            if request :
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
            return None