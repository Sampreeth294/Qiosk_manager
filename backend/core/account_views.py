import hashlib
import logging
import secrets
import smtplib
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import (
    get_user_model,
    login,
    logout,
    password_validation,
    update_session_auth_hash,
)
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import (
    Restaurant,
    RestaurantInvitation,
    RestaurantMembership,
    RestaurantSetupState,
)
from .restaurant_permissions import has_restaurant_role

logger = logging.getLogger(__name__)
INVITATION_TTL = timedelta(hours=24)
RESET_RESPONSE = {
    "detail": "If an active account uses that email, password reset instructions will be sent.",
}
OWNER_ROLES = [RestaurantMembership.Role.OWNER]
MANAGER_ROLES = [RestaurantMembership.Role.OWNER, RestaurantMembership.Role.MANAGER]


def _limited(request, action, limit=5, window=3600):
    ip_address = request.META.get("REMOTE_ADDR", "unknown")
    key = f"qiosk-rate:{action}:{hashlib.sha256(ip_address.encode()).hexdigest()}"
    if cache.add(key, 1, timeout=window):
        return False
    try:
        return cache.incr(key) > limit
    except ValueError:
        cache.add(key, 1, timeout=window)
        return False


def _password_errors(password, user):
    try:
        password_validation.validate_password(password, user=user)
    except ValidationError as exc:
        return list(exc.messages)
    return []


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
@csrf_protect
def initial_setup_view(request):
    if request.method == "GET":
        return Response({"available": True})

    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    password_confirm = request.data.get("password_confirm")
    restaurant_name = request.data.get("restaurant_name")
    address = request.data.get("address")
    phone_number = request.data.get("phone_number", "")

    errors = {}
    if not isinstance(username, str) or not username.strip():
        errors["username"] = ["This field is required."]
    if not isinstance(email, str) or not email.strip():
        errors["email"] = ["This field is required."]
    elif len(email.strip()) > 254:
        errors["email"] = ["Enter a valid email address."]
    else:
        try:
            validate_email(email.strip())
        except ValidationError:
            errors["email"] = ["Enter a valid email address."]
    if not isinstance(restaurant_name, str) or not restaurant_name.strip():
        errors["restaurant_name"] = ["This field is required."]
    if not isinstance(address, str) or not address.strip():
        errors["address"] = ["This field is required."]
    if not isinstance(password, str) or not password:
        errors["password"] = ["This field is required."]
    if password != password_confirm:
        errors["password_confirm"] = ["Passwords do not match."]
    if username and get_user_model().objects.filter(username__iexact=username.strip()).exists():
        errors["username"] = ["A user with that username already exists."]
    if isinstance(username, str) and len(username.strip()) > 150:
        errors["username"] = ["Username must be 150 characters or fewer."]
    if email and get_user_model().objects.filter(email__iexact=email.strip()).exists():
        errors["email"] = ["A user with that email already exists."]
    if not isinstance(phone_number, str) or len(phone_number) > 10:
        errors["phone_number"] = ["Phone number must be 10 characters or fewer."]
    if not errors and password:
        errors["password"] = _password_errors(
            password,
            get_user_model()(username=username.strip(), email=email.strip()),
        )
        if not errors["password"]:
            errors.pop("password")
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            state, _ = RestaurantSetupState.objects.get_or_create(pk=1)
            state = RestaurantSetupState.objects.select_for_update().get(pk=state.pk)
            user = get_user_model().objects.create_user(
                username=username.strip(),
                email=email.strip().lower(),
                password=password,
            )
            restaurant = Restaurant.objects.create(
                name=restaurant_name.strip(),
                address=address.strip(),
                phone_number=phone_number.strip() if isinstance(phone_number, str) else "",
            )
            RestaurantMembership.objects.create(
                user=user,
                restaurant=restaurant,
                role=RestaurantMembership.Role.OWNER,
                is_active=True,
            )
            state.completed_at = timezone.now()
            state.save(update_fields=["completed_at"])
            login(request, user)
    except IntegrityError:
        return Response(
            {"detail": "Owner signup could not be completed. Check the account details and try again."},
            status=status.HTTP_409_CONFLICT,
        )

    return Response(
        {
            "user": {
                "id": user.pk,
                "username": user.get_username(),
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
            },
            "restaurant": {"id": restaurant.pk, "name": restaurant.name},
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@csrf_protect
def password_change_view(request):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication is required."}, status=401)

    current_password = request.data.get("current_password")
    password = request.data.get("password")
    password_confirm = request.data.get("password_confirm")
    if not isinstance(current_password, str) or not request.user.check_password(current_password):
        return Response({"current_password": ["Current password is incorrect."]}, status=400)
    if not isinstance(password, str) or not password:
        return Response({"password": ["This field is required."]}, status=400)
    if password != password_confirm:
        return Response({"password_confirm": ["Passwords do not match."]}, status=400)

    errors = _password_errors(password, request.user)
    if errors:
        return Response({"password": errors}, status=400)

    request.user.set_password(password)
    request.user.save(update_fields=["password"])
    update_session_auth_hash(request, request.user)
    return Response({"detail": "Password changed successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def password_reset_request_view(request):
    if _limited(request, "password-reset-request", limit=5):
        return Response(RESET_RESPONSE)
    email = request.data.get("email")
    if not isinstance(email, str) or not email.strip():
        return Response(RESET_RESPONSE)

    user = get_user_model().objects.filter(
        email__iexact=email.strip(),
        is_active=True,
    ).order_by("pk").first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:5173")
        query = urlencode({"uid": uid, "token": token})
        reset_url = f"{frontend_url.rstrip('/')}/admin/password-reset/confirm?{query}"
        try:
            send_mail(
                "Reset your Qiosk Manager password",
                f"Use this link to reset your password. It expires in {settings.PASSWORD_RESET_TIMEOUT // 3600} hours:\n\n{reset_url}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except (OSError, smtplib.SMTPException):
            logger.exception("Password reset email delivery failed.")
    return Response(RESET_RESPONSE)


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def password_reset_confirm_view(request):
    if _limited(request, "password-reset-confirm", limit=10):
        return Response({"detail": "Too many attempts. Try again later."}, status=429)
    uid = request.data.get("uid")
    token = request.data.get("token")
    password = request.data.get("password")
    password_confirm = request.data.get("password_confirm")
    if not all(isinstance(value, str) and value for value in (uid, token, password)):
        return Response({"detail": "The reset link or password is invalid."}, status=400)
    if password != password_confirm:
        return Response({"password_confirm": ["Passwords do not match."]}, status=400)
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = get_user_model().objects.get(pk=user_id, is_active=True)
    except (ValueError, TypeError, OverflowError, get_user_model().DoesNotExist):
        return Response({"detail": "The reset link or password is invalid."}, status=400)
    if not default_token_generator.check_token(user, token):
        return Response({"detail": "The reset link or password is invalid or expired."}, status=400)
    errors = _password_errors(password, user)
    if errors:
        return Response({"password": errors}, status=400)
    user.set_password(password)
    user.save(update_fields=["password"])
    if request.user.is_authenticated and request.user.pk == user.pk:
        update_session_auth_hash(request, user)
    return Response({"detail": "Password reset successfully. You can now sign in."})


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def invitation_accept_view(request):
    if _limited(request, "invitation-accept", limit=10):
        return Response({"detail": "Too many attempts. Try again later."}, status=429)
    token = request.data.get("token")
    password = request.data.get("password")
    password_confirm = request.data.get("password_confirm")
    if not isinstance(token, str) or not token or not isinstance(password, str) or not password:
        return Response({"detail": "A valid invitation and password are required."}, status=400)
    if password != password_confirm:
        return Response({"password_confirm": ["Passwords do not match."]}, status=400)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    with transaction.atomic():
        invitation = (
            RestaurantInvitation.objects.select_for_update()
            .select_related("user", "membership")
            .filter(token_hash=token_hash, accepted_at__isnull=True)
            .first()
        )
        if invitation is None or invitation.expires_at <= timezone.now():
            return Response({"detail": "This invitation is invalid or expired."}, status=400)
        errors = _password_errors(password, invitation.user)
        if errors:
            return Response({"password": errors}, status=400)
        user = invitation.user
        user.set_password(password)
        user.is_active = True
        user.save(update_fields=["password", "is_active"])
        invitation.membership.is_active = True
        invitation.membership.save(update_fields=["is_active", "updated_at"])
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
    return Response({"detail": "Invitation accepted. You can now sign in."})


@api_view(["GET", "POST"])
@csrf_protect
def restaurant_users_view(request):
    restaurant_id = request.query_params.get("restaurant_id") or request.data.get("restaurant_id")
    if not restaurant_id or not str(restaurant_id).isdigit():
        return Response({"detail": "A valid restaurant_id is required."}, status=400)
    restaurant_id = int(restaurant_id)
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication is required."}, status=401)
    manager = has_restaurant_role(request.user, restaurant_id, MANAGER_ROLES)
    if not manager:
        return Response({"detail": "Manager access is required for this restaurant."}, status=403)

    if request.method == "GET":
        memberships = RestaurantMembership.objects.filter(
            restaurant_id=restaurant_id,
        ).select_related("user").prefetch_related("invitations")
        users = []
        for membership in memberships:
            invitation = membership.invitations.first()
            invitation_status = (
                "accepted"
                if invitation and invitation.accepted_at
                else "pending"
                if invitation and invitation.expires_at > timezone.now()
                else "expired"
                if invitation
                else "active"
                if membership.user.is_active and membership.is_active
                else "inactive"
            )
            users.append({
                "membership_id": membership.pk,
                "user_id": membership.user_id,
                "username": membership.user.get_username(),
                "email": membership.user.email,
                "role": membership.role,
                "is_active": membership.is_active and membership.user.is_active,
                "invitation_status": invitation_status,
            })
        actor_membership = RestaurantMembership.objects.filter(
            user=request.user,
            restaurant_id=restaurant_id,
            is_active=True,
        ).first()
        return Response({
            "actor_role": (
                RestaurantMembership.Role.OWNER
                if request.user.is_superuser
                else actor_membership.role if actor_membership else None
            ),
            "memberships": users,
        })

    if _limited(request, "staff-invitation", limit=15):
        return Response({"detail": "Too many invitation requests. Try again later."}, status=429)
    actor = RestaurantMembership.objects.filter(
        user=request.user,
        restaurant_id=restaurant_id,
        is_active=True,
    ).first()
    actor_role = (
        RestaurantMembership.Role.OWNER
        if request.user.is_superuser
        else actor.role if actor else None
    )
    role = request.data.get("role", RestaurantMembership.Role.STAFF)
    if role not in {RestaurantMembership.Role.STAFF, RestaurantMembership.Role.MANAGER}:
        return Response({"role": ["Only staff or manager roles may be invited."]}, status=400)
    if actor_role != RestaurantMembership.Role.OWNER and role != RestaurantMembership.Role.STAFF:
        return Response({"detail": "Only an owner may invite a manager."}, status=403)

    username = request.data.get("username")
    email = request.data.get("email")
    if not isinstance(username, str) or not username.strip():
        return Response({"username": ["This field is required."]}, status=400)
    if not isinstance(email, str) or not email.strip():
        return Response({"email": ["This field is required."]}, status=400)
    try:
        validate_email(email.strip())
    except ValidationError:
        return Response({"email": ["Enter a valid email address."]}, status=400)
    User = get_user_model()
    if User.objects.filter(Q(username__iexact=username.strip()) | Q(email__iexact=email.strip())).exists():
        return Response({"detail": "A user with this username or email already exists."}, status=409)

    token = secrets.token_urlsafe(32)
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=username.strip(),
                email=email.strip().lower(),
                password=None,
                is_active=False,
            )
            membership = RestaurantMembership.objects.create(
                user=user,
                restaurant_id=restaurant_id,
                role=role,
                is_active=False,
            )
            invitation = RestaurantInvitation.objects.create(
                user=user,
                membership=membership,
                token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
                expires_at=timezone.now() + INVITATION_TTL,
                created_by=request.user,
            )
            frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:5173")
            accept_url = f"{frontend_url.rstrip('/')}/admin/invite/{token}"
            send_mail(
                "You are invited to Qiosk Manager",
                f"Accept your invitation and set your password within 24 hours:\n\n{accept_url}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
    except (IntegrityError, OSError, smtplib.SMTPException):
        logger.exception("Unable to create or deliver restaurant invitation.")
        return Response(
            {"detail": "The invitation could not be sent. Check the configured email service and try again."},
            status=503,
        )

    result = {
        "membership_id": membership.pk,
        "user_id": user.pk,
        "username": user.get_username(),
        "email": user.email,
        "role": membership.role,
        "is_active": False,
        "invitation_status": "pending",
        "expires_at": invitation.expires_at,
    }
    return Response(result, status=201)


@api_view(["PATCH"])
@csrf_protect
def restaurant_user_detail_view(request, membership_id):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication is required."}, status=401)
    with transaction.atomic():
        membership = (
            RestaurantMembership.objects.select_related("restaurant", "user")
            .filter(pk=membership_id)
            .first()
        )
        if membership is None:
            return Response({"detail": "Membership not found."}, status=404)
        Restaurant.objects.select_for_update().filter(pk=membership.restaurant_id).first()
        membership = (
            RestaurantMembership.objects.select_for_update()
            .select_related("restaurant", "user")
            .get(pk=membership.pk)
        )
        if not has_restaurant_role(request.user, membership.restaurant_id, MANAGER_ROLES):
            return Response({"detail": "Manager access is required for this restaurant."}, status=403)
        actor = RestaurantMembership.objects.filter(
            user=request.user,
            restaurant_id=membership.restaurant_id,
            is_active=True,
        ).first()
        if actor is None and not request.user.is_superuser:
            return Response({"detail": "Manager access is required for this restaurant."}, status=403)
        actor_role = (
            RestaurantMembership.Role.OWNER
            if request.user.is_superuser
            else actor.role if actor else None
        )
        if actor_role != RestaurantMembership.Role.OWNER and membership.role != RestaurantMembership.Role.STAFF:
            return Response({"detail": "Managers may only manage staff memberships."}, status=403)

        role = request.data.get("role", membership.role)
        is_active = request.data.get("is_active", membership.is_active)
        if role not in {
            RestaurantMembership.Role.OWNER,
            RestaurantMembership.Role.MANAGER,
            RestaurantMembership.Role.STAFF,
        }:
            return Response({"role": ["Invalid role."]}, status=400)
        if not isinstance(is_active, bool):
            return Response({"is_active": ["Expected a boolean."]}, status=400)
        if actor_role != RestaurantMembership.Role.OWNER and role != RestaurantMembership.Role.STAFF:
            return Response({"detail": "Only an owner may assign owner or manager roles."}, status=403)
        if membership.role == RestaurantMembership.Role.OWNER and (role != membership.role or not is_active):
            active_owners = RestaurantMembership.objects.filter(
                restaurant_id=membership.restaurant_id,
                role=RestaurantMembership.Role.OWNER,
                is_active=True,
            ).count()
            if active_owners <= 1:
                return Response({"detail": "The last active restaurant owner cannot be removed or demoted."}, status=400)

        membership.role = role
        membership.is_active = is_active
        membership.save(update_fields=["role", "is_active", "updated_at"])
        membership.user.is_active = (
            is_active
            or membership.user.restaurant_memberships.filter(is_active=True).exists()
        )
        membership.user.save(update_fields=["is_active"])
        return Response({
            "membership_id": membership.pk,
            "user_id": membership.user_id,
            "username": membership.user.get_username(),
            "email": membership.user.email,
            "role": membership.role,
            "is_active": membership.is_active and membership.user.is_active,
        })
