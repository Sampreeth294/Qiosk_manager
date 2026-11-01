from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Expense, Restaurant, RestaurantMembership
from .restaurant_permissions import accessible_restaurant_ids, has_restaurant_role
from .serializers import ExpenseSerializer


MANAGER_ROLES = [
    RestaurantMembership.Role.OWNER,
    RestaurantMembership.Role.MANAGER,
]


@api_view(["GET", "POST"])
def expense_list(request):
    restaurant_id = (
        request.query_params.get("restaurant_id")
        if request.method == "GET"
        else request.data.get("restaurant_id")
    )
    if not restaurant_id or not str(restaurant_id).isdigit():
        return Response(
            {"detail": "A valid restaurant_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    restaurant = get_object_or_404(Restaurant, pk=int(restaurant_id))
    if not has_restaurant_role(request.user, restaurant.pk, MANAGER_ROLES):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == "GET":
        expenses = Expense.objects.filter(restaurant=restaurant)
        serializer = ExpenseSerializer(expenses, many=True)
        return Response(serializer.data)

    serializer = ExpenseSerializer(data=request.data)
    if serializer.is_valid():
        expense = serializer.save(restaurant=restaurant, created_by=request.user)
        return Response(
            ExpenseSerializer(expense).data,
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
def expense_detail(request, pk):
    expense_queryset = Expense.objects.select_related("restaurant")
    restaurant_ids = accessible_restaurant_ids(request.user, MANAGER_ROLES)
    if restaurant_ids is not None:
        expense_queryset = expense_queryset.filter(restaurant_id__in=restaurant_ids)
    expense = get_object_or_404(expense_queryset, pk=pk)
    if not has_restaurant_role(request.user, expense.restaurant_id, MANAGER_ROLES):
        return Response(
            {"detail": "Manager access is required for this restaurant."},
            status=status.HTTP_403_FORBIDDEN,
        )
    expense.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
