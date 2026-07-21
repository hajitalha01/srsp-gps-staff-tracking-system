from django.utils import timezone

from .models import EmergencyAlert, Notification


def notification_count(request):
    if not request.user.is_authenticated:
        return {'unread_notifications_count': 0, 'notifications': [], 'emergency_alerts_count': 0}
    notifications = Notification.objects.select_related('staff', 'related_alert').all()[:10]
    unread_count = Notification.objects.filter(is_read=False).count()
    today_emergencies = EmergencyAlert.objects.filter(
        status__in=[EmergencyAlert.Status.PENDING, EmergencyAlert.Status.IN_PROGRESS]
    ).count()
    return {
        'unread_notifications_count': unread_count,
        'notifications': notifications,
        'emergency_alerts_count': today_emergencies,
    }
