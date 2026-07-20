from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import EmergencyAlert, Notification


@receiver(post_save, sender=EmergencyAlert)
def create_notification_on_emergency(sender, instance, created, **kwargs):
    if not created:
        return
    Notification.objects.create(
        staff=instance.staff,
        notification_type=Notification.Type.EMERGENCY,
        message=f'Emergency alert from {instance.staff.full_name} at {instance.assigned_center.center_name if instance.assigned_center else "unknown location"}.',
        related_alert=instance,
    )
