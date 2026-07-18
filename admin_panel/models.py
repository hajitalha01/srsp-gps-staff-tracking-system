from django.conf import settings
from django.db import models


class Center(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        INACTIVE = 'Inactive', 'Inactive'

    center_name = models.CharField(max_length=255)
    center_code = models.CharField(max_length=20, unique=True)
    district = models.CharField(max_length=100)
    address = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    geofence_radius = models.PositiveIntegerField(help_text='Radius in meters')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['center_name']

    def __str__(self):
        return f'{self.center_name} ({self.center_code})'


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'Present', 'Present'
        ABSENT = 'Absent', 'Absent'
        LATE = 'Late', 'Late'
        EARLY_CHECKOUT = 'Early Check-Out', 'Early Check-Out'
        PENDING_CHECKOUT = 'Pending Check-Out', 'Pending Check-Out'

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    center = models.ForeignKey(
        Center,
        on_delete=models.SET_NULL,
        null=True,
        related_name='attendance_records'
    )
    date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    working_hours = models.DurationField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)
    gps_verified = models.BooleanField(default=False)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-check_in_time']
        unique_together = ['staff', 'date']

    def __str__(self):
        return f'{self.staff.full_name} - {self.date} ({self.status})'


class EmergencyAlert(models.Model):
    class Priority(models.TextChoices):
        HIGH = 'High', 'High'
        MEDIUM = 'Medium', 'Medium'
        LOW = 'Low', 'Low'

    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        RESOLVED = 'Resolved', 'Resolved'

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='emergency_alerts'
    )
    center = models.ForeignKey(
        Center,
        on_delete=models.SET_NULL,
        null=True,
        related_name='emergency_alerts'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.HIGH)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.staff.full_name} - {self.priority} ({self.status})'
