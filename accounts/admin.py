from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser


class CustomUserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'phone_number', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'phone_number', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'phone_number', 'role', 'password1', 'password2'),
        }),
    )
    search_fields = ('email', 'full_name', 'phone_number')
    ordering = ('email',)


admin.site.register(CustomUser, CustomUserAdmin)
