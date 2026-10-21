from django.urls import path
from .views import health_check  #importing the health_check view from the views.py file
urlpatterns = [
    path('health-check/', health_check, name='health_check'),  #this line defines a URL pattern for the health_check view, which can be accessed in helath check 
]