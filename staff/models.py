from django.conf import settings
from django.db import models


class StaffProfile(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        INACTIVE = 'Inactive', 'Inactive'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    assigned_center = models.ForeignKey(
        'admin_panel.Center',
        on_delete=models.SET_NULL,
        null=True,
        related_name='staff_members'
    )
    designation = models.CharField(max_length=100, blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    joining_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    class Meta:
        ordering = ['user__full_name']

    def __str__(self):
        return self.user.full_name


class LocationLog(models.Model):
    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location_logs'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy = models.FloatField(null=True, blank=True, help_text='GPS accuracy in meters')
    captured_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-captured_at']

    def __str__(self):
        return f'{self.staff.full_name} - {self.latitude}, {self.longitude}'
