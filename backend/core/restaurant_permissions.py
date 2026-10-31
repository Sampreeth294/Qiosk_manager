from .models import RestaurantMembership


def has_restaurant_role(user, restaurant_id, roles=None):
    if user.is_superuser:
        return True

    memberships = RestaurantMembership.objects.filter(
        user=user,
        restaurant_id=restaurant_id,
        is_active=True,
    )
    if roles is not None:
        memberships = memberships.filter(role__in=roles)
    return memberships.exists()


def accessible_restaurant_ids(user, roles=None):
    if user.is_superuser:
        return None

    memberships = RestaurantMembership.objects.filter(
        user=user,
        is_active=True,
    )
    if roles is not None:
        memberships = memberships.filter(role__in=roles)
    return memberships.values_list("restaurant_id", flat=True)
