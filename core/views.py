from rest_framework.decorators import api_view  #api_view is a decorator that allows us to define a view that can handle different HTTP methods (GET, POST, etc.)  in django rest framework
from rest_framework.response import Response  #Response is a class that allows us to return a response from our view in django rest framework
@api_view(['GET'])  #this decorator allows us to define a view that can handle GET requests
def health_check(request):
    return Response({'success': 'True',
    'message': 'Oiosk api is running succesfully .'
    })  #this line returns a response with a JSON object containing the status of the application