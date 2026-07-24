from django.contrib import admin
from .models import Center, Attendance, EmergencyAlert, Notification, CenterLocationChangeRequest, AuditLog


@admin.register(Center)
class CenterAdmin(admin.ModelAdmin):
    list_display = ('center_name', 'center_code', 'district', 'status', 'configuration_status', 'created_at')
    list_filter = ('status', 'configuration_status', 'district')
    search_fields = ('center_name', 'center_code', 'district')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('staff', 'center', 'date', 'check_in_time', 'check_out_time', 'status', 'gps_verified')
    list_filter = ('status', 'date', 'gps_verified')
    search_fields = ('staff__full_name', 'staff__email', 'center__center_name')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('staff', 'notification_type', 'message', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('staff__full_name', 'message')


@admin.register(EmergencyAlert)
class EmergencyAlertAdmin(admin.ModelAdmin):
    list_display = ('staff', 'assigned_center', 'status', 'created_at', 'resolved_at')
    list_filter = ('status', 'created_at')
    search_fields = ('staff__full_name', 'staff__email', 'assigned_center__center_name')


@admin.register(CenterLocationChangeRequest)
class CenterLocationChangeRequestAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'center', 'status', 'requested_date', 'approved_date')
    list_filter = ('status',)
    search_fields = ('teacher__full_name', 'center__center_name', 'reason')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'user', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('action', 'user__full_name', 'details')
