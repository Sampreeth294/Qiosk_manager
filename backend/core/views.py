from rest_framework.decorators import api_view  #api_view is a decorator that allows us to define a view that can handle different HTTP methods (GET, POST, etc.)  in django rest framework
from rest_framework.response import Response  #Response is a class that allows us to return a response from our view in django rest framework
from .models import Restaurant, MenuCategory, MenuItem  #importing the models from the models.py file
from .serializers import RestaurantSerializer, MenuCategorySerializer, MenuItemSerializer  #importing the serializers from the serializers.py file


@api_view(['GET'])  #this decorator allows us to define a view that can handle GET requests
def health_check(request):
    return Response({'success': 'True',
    'message': 'Oiosk api is running succesfully .'
    })  #this line returns a response with a JSON object containing the status of the application


@api_view(['GET'])  #this decorator allows us to define a view that can handle GET requests
def restaurant_list(request):
    restaurants = Restaurant.objects.filter(is_active=True)  #this line retrieves all the active restaurants from the database
    serializer = RestaurantSerializer(restaurants, many=True , context={'request': request})  #this line serializes the restaurant
    return Response(serializer.data)  #this line returns a response with a JSON from  serialized restaurant data

    


@api_view(["GET"])
def menu_category_list(request):
    restaurant_id = request.query_params.get("restaurant_id")
    categories = MenuCategory.objects.filter(is_active=True)
    if restaurant_id:
        categories = categories.filter(restaurant_id=restaurant_id)
    serializer = MenuCategorySerializer(categories,many=True,context={"request": request})
    return Response(serializer.data)



@api_view(["GET"])
def menu_item_list(request):
    items = MenuItem.objects.filter(is_active=True).select_related("category")
    category_id = request.query_params.get("category_id")
    if category_id:
        items = items.filter(category_id=category_id)

    serializer = MenuItemSerializer(items,many=True,context={"request": request})
    return Response(serializer.data)

@api_view(["POST"])
def create_menu_item(request):
    serializer = MenuItemSerializer(
        data=request.data,
        context={"request": request},
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)
