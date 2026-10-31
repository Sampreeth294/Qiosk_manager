import json
from json import JSONDecodeError

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST


def _user_profile(user):
    return {
        "id": user.id,
        "username": user.get_username(),
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


@require_POST
@csrf_protect
def login_view(request):
    if request.content_type and "application/json" in request.content_type:
        try:
            data = json.loads(request.body)
        except (JSONDecodeError, UnicodeDecodeError):
            return JsonResponse(
                {"detail": "A valid JSON request body is required."},
                status=400,
            )
    else:
        data = request.POST

    if not isinstance(data, dict):
        return JsonResponse(
            {"detail": "Username and password are required."},
            status=400,
        )

    username = data.get("username")
    password = data.get("password")

    if (
        not isinstance(username, str)
        or not username
        or not isinstance(password, str)
        or not password
    ):
        return JsonResponse(
            {"detail": "Username and password are required."},
            status=400,
        )

    user = authenticate(
        request,
        username=username,
        password=password,
    )

    if user is None or not user.is_active:
        return JsonResponse(
            {"detail": "Invalid username or password."},
            status=401,
        )

    login(request, user)

    return JsonResponse({"user": _user_profile(user)})


@require_POST
@csrf_protect
def logout_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Authentication is required."},
            status=401,
        )

    logout(request)

    return JsonResponse({"detail": "Logged out successfully."})


@require_GET
@ensure_csrf_cookie
def current_user_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Authentication is required."},
            status=401,
        )

    return JsonResponse({"user": _user_profile(request.user)})
