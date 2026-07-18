from django.contrib import admin
from .models import Center, Attendance, EmergencyAlert


@admin.register(Center)
class CenterAdmin(admin.ModelAdmin):
    list_display = ('center_name', 'center_code', 'district', 'status', 'created_at')
    list_filter = ('status', 'district')
    search_fields = ('center_name', 'center_code', 'district')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('staff', 'center', 'date', 'check_in_time', 'check_out_time', 'status', 'gps_verified')
    list_filter = ('status', 'date', 'gps_verified')
    search_fields = ('staff__full_name', 'staff__email', 'center__center_name')


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display = ('staff', 'center', 'priority', 'status', 'created_at', 'resolved_at')
    list_filter = ('priority', 'status', 'created_at')
    search_fields = ('staff__full_name', 'staff__email', 'center__center_name')
