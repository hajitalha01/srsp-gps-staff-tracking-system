import json
import logging

from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from staff.models import StaffProfile
from admin_panel.models import EmergencyAlert
from django.utils import timezone

logger = logging.getLogger(__name__)


def get_staff_context(user):
    try:
        staff = StaffProfile.objects.select_related(
            'user', 'assigned_center'
        ).get(user=user)
    except StaffProfile.DoesNotExist:
        staff = None
    return staff


@login_required
def home(request):
    staff = get_staff_context(request.user)
    ctx = {'staff': staff}
    if staff and staff.assigned_center:
        ctx['user_center'] = staff.assigned_center.center_name
    else:
        ctx['user_center'] = 'Not assigned'
    return render(request, 'staff/home.html', ctx)


@login_required
def dashboard(request):
    staff = get_staff_context(request.user)
    ctx = {'staff': staff}
    if staff and staff.assigned_center:
        ctx['user_center'] = staff.assigned_center.center_name
    else:
        ctx['user_center'] = 'Not assigned'
    return render(request, 'staff/dashboard.html', ctx)


@login_required
def send_emergency_alert(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method.'})

    user = request.user
    if user.role not in ('Field Staff', 'Teacher'):
        return JsonResponse({'success': False, 'error': 'Only staff members can send emergency alerts.'})

    # Prevent duplicate pending alerts
    if EmergencyAlert.objects.filter(staff=user, status=EmergencyAlert.Status.PENDING).exists():
        return JsonResponse({
            'success': False,
            'error': 'You already have an active emergency alert.'
        })

    try:
        staff = StaffProfile.objects.select_related('assigned_center').get(user=user)
    except StaffProfile.DoesNotExist:
        staff = None

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = {}

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    location_address = data.get('location_address', '')

    if latitude is not None:
        try:
            latitude = round(float(latitude), 6)
        except (ValueError, TypeError):
            latitude = None
    if longitude is not None:
        try:
            longitude = round(float(longitude), 6)
        except (ValueError, TypeError):
            longitude = None

    assigned_center = staff.assigned_center if staff and staff.assigned_center else None

    alert = EmergencyAlert.objects.create(
        staff=user,
        assigned_center=assigned_center,
        latitude=latitude,
        longitude=longitude,
        location_address=location_address,
        alert_message=f'Emergency alert from {user.full_name}',
        status=EmergencyAlert.Status.PENDING,
    )

    return JsonResponse({
        'success': True,
        'message': 'Emergency Alert Sent Successfully.',
        'alert_id': alert.id,
    })
