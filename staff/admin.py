from django.contrib import admin
from .models import StaffProfile, LocationLog


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'assigned_center', 'designation', 'status', 'joining_date')
    list_filter = ('status', 'joining_date')
    search_fields = ('user__full_name', 'user__email', 'designation')


@admin.register(LocationLog)
class LocationLogAdmin(admin.ModelAdmin):
    list_display = ('staff', 'latitude', 'longitude', 'accuracy', 'captured_at')
    list_filter = ('captured_at',)
    search_fields = ('staff__full_name', 'staff__email')
