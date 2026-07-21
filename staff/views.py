import json
import base64
import logging

from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from staff.models import StaffProfile
from admin_panel.models import EmergencyAlert, Attendance, Notification
from django.utils import timezone
from django.db.models import Count, Q, Sum
from datetime import timedelta
from .face_verification import verify_faces
from .geofence import is_inside_geofence, haversine_distance

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

    today = timezone.now().date()
    try:
        today_attendance = Attendance.objects.get(staff=request.user, date=today)
        ctx['has_checked_in'] = today_attendance.check_in_time is not None
        ctx['has_checked_out'] = today_attendance.check_out_time is not None
        ctx['today_check_in'] = today_attendance.check_in_time.strftime('%I:%M %p') if today_attendance.check_in_time else None
        ctx['today_check_out'] = today_attendance.check_out_time.strftime('%I:%M %p') if today_attendance.check_out_time else None
        if today_attendance.working_hours:
            total_secs = int(today_attendance.working_hours.total_seconds())
            h = total_secs // 3600
            m = (total_secs % 3600) // 60
            ctx['today_working_hours'] = f'{h}h {m}m'
        else:
            ctx['today_working_hours'] = None
    except Attendance.DoesNotExist:
        ctx['has_checked_in'] = False
        ctx['has_checked_out'] = False
        ctx['today_check_in'] = None
        ctx['today_check_out'] = None
        ctx['today_working_hours'] = None

    return render(request, 'staff/dashboard.html', ctx)


@login_required
def verify_face(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method.'})

    user = request.user
    if user.role not in ('Field Staff', 'Teacher'):
        return JsonResponse({'success': False, 'error': 'Only staff members can use face verification.'})

    try:
        profile = StaffProfile.objects.get(user=user)
    except StaffProfile.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Staff profile not found.'})

    if not profile.profile_photo:
        return JsonResponse({'success': False, 'error': 'No profile photo on record. Contact admin.'})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid request body.'})

    image_data = data.get('image')
    if not image_data:
        return JsonResponse({'success': False, 'error': 'No image data received.'})

    try:
        if ';base64,' in image_data:
            image_data = image_data.split(';base64,')[1]
        selfie_bytes = base64.b64decode(image_data)
    except Exception:
        return JsonResponse({'success': False, 'error': 'Invalid image data.'})

    verified, confidence, message = verify_faces(
        profile.profile_photo.path, selfie_bytes
    )

    return JsonResponse({
        'success': True,
        'verified': verified,
        'confidence': confidence,
        'message': message,
    })


@login_required
def verify_location(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method.'})

    user = request.user
    if user.role not in ('Field Staff', 'Teacher'):
        return JsonResponse({'success': False, 'error': 'Only staff members can check in.'})

    try:
        profile = StaffProfile.objects.select_related('assigned_center').get(user=user)
    except StaffProfile.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Staff profile not found.'})

    center = profile.assigned_center
    if not center:
        return JsonResponse({'success': False, 'error': 'You are not assigned to any center.'})

    if not center.latitude or not center.longitude:
        return JsonResponse({'success': False, 'error': 'Your assigned center has no GPS coordinates configured. Contact admin.'})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid request body.'})

    user_lat = data.get('latitude')
    user_lng = data.get('longitude')
    if user_lat is None or user_lng is None:
        return JsonResponse({'success': False, 'error': 'Location data not received.'})

    try:
        user_lat = float(user_lat)
        user_lng = float(user_lng)
    except (ValueError, TypeError):
        return JsonResponse({'success': False, 'error': 'Invalid location data.'})

    inside, distance = is_inside_geofence(
        user_lat, user_lng,
        center.latitude, center.longitude,
        center.allowed_radius
    )

    return JsonResponse({
        'success': True,
        'inside': inside,
        'distance': distance,
        'allowed_radius': center.allowed_radius,
        'center_latitude': float(center.latitude),
        'center_longitude': float(center.longitude),
        'center_name': center.center_name,
        'message': f'You are {distance:.0f}m from {center.center_name} (allowed: {center.allowed_radius}m).'
    })


@login_required
def check_in(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method.'})

    user = request.user
    if user.role not in ('Field Staff', 'Teacher'):
        return JsonResponse({'success': False, 'error': 'Only staff members can check in.'})

    today = timezone.now().date()
    if Attendance.objects.filter(staff=user, date=today).exists():
        return JsonResponse({'success': False, 'error': 'You have already checked in today.'})

    try:
        profile = StaffProfile.objects.select_related('assigned_center').get(user=user)
    except StaffProfile.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Staff profile not found.'})

    now_local = timezone.localtime(timezone.now())
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        body = {}

    user_lat = body.get('latitude')
    user_lng = body.get('longitude')
    distance = None
    gps_verified = False
    if user_lat is not None and user_lng is not None and profile.assigned_center and profile.assigned_center.latitude:
        try:
            inside, distance = is_inside_geofence(
                float(user_lat), float(user_lng),
                profile.assigned_center.latitude, profile.assigned_center.longitude,
                profile.assigned_center.allowed_radius
            )
            if inside:
                gps_verified = True
        except (ValueError, TypeError):
            pass

    Attendance.objects.create(
        staff=user,
        center=profile.assigned_center,
        date=today,
        check_in_time=now_local.time(),
        check_in_latitude=user_lat,
        check_in_longitude=user_lng,
        distance_from_center=distance,
        status=Attendance.Status.PRESENT,
        gps_verified=gps_verified,
        verification_status=body.get('verification_status', Attendance.VerificationStatus.VERIFIED),
        verification_method=body.get('verification_method', 'Face Verification'),
        verified_at=timezone.now() if body.get('verification_status') == 'Verified' else None,
    )

    return JsonResponse({
        'success': True,
        'message': 'Checked in successfully.',
        'check_in_time': now_local.strftime('%I:%M %p'),
        'gps_verified': gps_verified,
        'distance': distance,
    })


@login_required
def check_out(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Invalid request method.'})

    user = request.user
    if user.role not in ('Field Staff', 'Teacher'):
        return JsonResponse({'success': False, 'error': 'Only staff members can check out.'})

    today = timezone.now().date()

    try:
        attendance = Attendance.objects.get(staff=user, date=today)
    except Attendance.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Please check in first.'})

    if attendance.check_out_time is not None:
        return JsonResponse({'success': False, 'error': 'You have already checked out today.'})

    now_local = timezone.localtime(timezone.now())
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        body = {}

    user_lat = body.get('latitude')
    user_lng = body.get('longitude')

    attendance.check_out_time = now_local.time()
    if user_lat is not None and user_lng is not None:
        try:
            attendance.check_out_latitude = float(user_lat)
            attendance.check_out_longitude = float(user_lng)
        except (ValueError, TypeError):
            pass

    check_in_dt = timezone.make_aware(
        timezone.datetime.combine(today, attendance.check_in_time),
        timezone.get_current_timezone(),
    )
    attendance.working_hours = now_local - check_in_dt
    attendance.verification_status = body.get('verification_status', Attendance.VerificationStatus.VERIFIED)
    attendance.verification_method = body.get('verification_method', 'Face Verification')
    attendance.verified_at = timezone.now() if body.get('verification_status') == 'Verified' else None
    attendance.save()

    total_secs = int(attendance.working_hours.total_seconds())
    h = total_secs // 3600
    m = (total_secs % 3600) // 60

    return JsonResponse({
        'success': True,
        'message': 'Checked out successfully.',
        'check_out_time': now_local.strftime('%I:%M %p'),
        'working_hours': f'{h} Hours {m} Minutes',
    })


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

    Notification.objects.create(
        staff=user,
        notification_type=Notification.Type.EMERGENCY,
        message=f'Emergency alert from {user.full_name}',
        related_alert=alert,
    )

    return JsonResponse({
        'success': True,
        'message': 'Emergency Alert Sent Successfully.',
        'alert_id': alert.id,
    })


@login_required
def history(request):
    staff = get_staff_context(request.user)
    ctx = {'staff': staff}
    if staff and staff.assigned_center:
        ctx['user_center'] = staff.assigned_center.center_name
    else:
        ctx['user_center'] = 'Not assigned'

    today = timezone.now().date()

    att_filter = request.GET.get('att_filter', '7')
    emg_status = request.GET.get('emg_status', '')

    att_qs = Attendance.objects.filter(staff=request.user)
    if att_filter == '30':
        att_qs = att_qs.filter(date__gte=today - timedelta(days=30))
    elif att_filter == 'month':
        first_of_this = today.replace(day=1)
        end_of_last = first_of_this - timedelta(days=1)
        start_of_last = end_of_last.replace(day=1)
        att_qs = att_qs.filter(date__gte=start_of_last, date__lte=end_of_last)
    else:
        att_qs = att_qs.filter(date__gte=today - timedelta(days=7))

    att_qs = att_qs.order_by('-date')

    att_list = []
    for a in att_qs:
        if a.working_hours:
            total_secs = int(a.working_hours.total_seconds())
            h = total_secs // 3600
            m = (total_secs % 3600) // 60
            a.formatted_hours = f'{h}h {m:02d}m'
        else:
            a.formatted_hours = '--'
        att_list.append(a)

    present_count = sum(1 for a in att_list if a.status == Attendance.Status.PRESENT)
    absent_count = sum(1 for a in att_list if a.status == Attendance.Status.ABSENT)
    late_count = sum(1 for a in att_list if a.status == Attendance.Status.LATE)
    total = present_count + absent_count + late_count
    att_pct = f'{round(present_count / total * 100)}%' if total else '0%'

    emg_qs = EmergencyAlert.objects.filter(staff=request.user)
    if emg_status:
        emg_qs = emg_qs.filter(status=emg_status)
    emg_qs = emg_qs.order_by('-created_at')

    ctx.update({
        'attendance_records': att_list,
        'present_count': present_count,
        'absent_count': absent_count,
        'late_count': late_count,
        'attendance_pct': att_pct,
        'emergency_records': emg_qs,
        'selected_att_filter': att_filter,
        'selected_emg_status': emg_status,
    })

    return render(request, 'staff/history.html', ctx)
