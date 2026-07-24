from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    action = models.CharField(max_length=100)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    browser_info = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} - {self.user}'


class Center(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'Active', 'Active'
        INACTIVE = 'Inactive', 'Inactive'
        PENDING = 'Pending', 'Pending'

    class ConfigStatus(models.TextChoices):
        NOT_CONFIGURED = 'NOT_CONFIGURED', 'Not Configured'
        CONFIGURED = 'CONFIGURED', 'Configured'

    center_name = models.CharField(max_length=255)
    center_code = models.CharField(max_length=20, unique=True)
    complete_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    allowed_radius = models.PositiveIntegerField(default=100, help_text='Allowed radius in meters')
    assigned_teacher = models.OneToOneField(
        'staff.StaffProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teaching_center',
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    configuration_status = models.CharField(
        max_length=20,
        choices=ConfigStatus.choices,
        default=ConfigStatus.NOT_CONFIGURED,
    )
    configured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='configured_centers',
    )
    configured_date = models.DateTimeField(null=True, blank=True)
    gps_accuracy = models.FloatField(null=True, blank=True, help_text='GPS accuracy in meters at configuration time')
    browser_info = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['center_name']

    def __str__(self):
        return self.center_name


class CenterLocationChangeRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        APPROVED = 'Approved', 'Approved'
        REJECTED = 'Rejected', 'Rejected'

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location_change_requests',
    )
    center = models.ForeignKey(
        Center,
        on_delete=models.CASCADE,
        related_name='location_change_requests',
    )
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_date = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_location_changes',
    )
    approved_date = models.DateTimeField(null=True, blank=True)
    used_permission = models.BooleanField(default=False)
    old_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    old_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    new_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    new_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['-requested_date']

    def __str__(self):
        return f'{self.teacher.full_name} - {self.center.center_name} ({self.status})'

    def can_configure(self):
        return self.status == self.Status.APPROVED and not self.used_permission


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'Present', 'Present'
        ABSENT = 'Absent', 'Absent'
        LATE = 'Late', 'Late'
        EARLY_CHECKOUT = 'Early Check-Out', 'Early Check-Out'
        PENDING_CHECKOUT = 'Pending Check-Out', 'Pending Check-Out'

    class VerificationStatus(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        VERIFIED = 'Verified', 'Verified'
        FAILED = 'Failed', 'Failed'

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
    check_in_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    distance_from_center = models.FloatField(null=True, blank=True, help_text='Distance from assigned center in meters')
    remarks = models.TextField(blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        blank=True,
        null=True
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verification_method = models.CharField(max_length=50, default='Face Verification', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-check_in_time']
        unique_together = ['staff', 'date']

    def __str__(self):
        return f'{self.staff.full_name} - {self.date} ({self.status})'


class EmergencyAlert(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        IN_PROGRESS = 'In Progress', 'In Progress'
        RESOLVED = 'Resolved', 'Resolved'
        CANCELLED = 'Cancelled', 'Cancelled'

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='emergency_alerts'
    )
    assigned_center = models.ForeignKey(
        Center,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emergency_alerts'
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_address = models.TextField(blank=True)
    alert_message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.staff.full_name} - {self.status}'


class Notification(models.Model):
    class Type(models.TextChoices):
        EMERGENCY = 'emergency', 'Emergency Alert'
        ATTENDANCE = 'attendance', 'Attendance'
        INFO = 'info', 'Information'

    staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=20, choices=Type.choices, default=Type.INFO
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_alert = models.ForeignKey(
        EmergencyAlert,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.staff.full_name} - {self.notification_type}'
