from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.hashers import check_password
from accounts.models import CustomUser


class EmailOrUsernameBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not password:
            return None
        identifier = username or kwargs.get('email')
        if not identifier:
            return None
        try:
            user = CustomUser.objects.get(email=identifier)
        except CustomUser.DoesNotExist:
            try:
                user = CustomUser.objects.get(username=identifier)
            except CustomUser.DoesNotExist:
                return None
        if not user.check_password(password):
            return None
        if not user.is_active:
            return None
        return user

    def get_user(self, user_id):
        try:
            return CustomUser.objects.get(pk=user_id)
        except CustomUser.DoesNotExist:
            return None
