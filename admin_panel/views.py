import csv
import io
import json
from datetime import datetime, timedelta
from functools import wraps

from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required, user_passes_test
from django.utils import timezone
from django.db import models
from django.db.models import Count, Q, Avg, Value, CharField, Case, When
from django.db.models.functions import TruncMonth, Coalesce

from admin_panel.models import Center, EmergencyAlert, Notification, Attendance
from accounts.models import CustomUser
from staff.models import StaffProfile
from admin_panel.forms import StaffCreationForm, StaffEditForm, CenterForm


def admin_required(user):
    return user.is_authenticated and user.role == 'Admin'


def get_initials(full_name):
    if not full_name:
        return 'AD'
    parts = full_name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return parts[0][0].upper() if parts[0] else 'AD'


@login_required
@user_passes_test(admin_required)
def dashboard(request):
    user = request.user
    today = timezone.now().date()

    total_staff = StaffProfile.objects.filter(status=StaffProfile.Status.ACTIVE).count()

    present_records = Attendance.objects.filter(
        date=today, status=Attendance.Status.PRESENT
    ).select_related('staff', 'center').order_by('-check_in_time')

    present_count = present_records.count()
    present_ids = list(present_records.values_list('staff_id', flat=True))

    absent_records = StaffProfile.objects.filter(
        status=StaffProfile.Status.ACTIVE
    ).exclude(user_id__in=present_ids).select_related('user', 'assigned_center').order_by('user__full_name')

    absent_count = absent_records.count()
    active_alerts = EmergencyAlert.objects.filter(status=EmergencyAlert.Status.PENDING).count()

    return render(request, 'admin_panel/dashboard.html', {
        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
        'total_staff': total_staff,
        'present_today': present_count,
        'absent_today': absent_count,
        'active_alerts': active_alerts,
        'present_staff_today': present_records,
        'absent_staff_today': absent_records,
    })


@login_required
@user_passes_test(admin_required)
def staff_management(request):
    staff_list = StaffProfile.objects.select_related(
        'user', 'assigned_center'
    ).all()
    centers = Center.objects.all()
    form = StaffCreationForm()
    user = request.user
    return render(request, 'admin_panel/staff_management.html', {
        'form': form,
        'staff_list': staff_list,
        'centers_list': centers,
        'total_staff': staff_list.count(),
        'staff_count': staff_list.count(),
        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
    })


@login_required
@user_passes_test(admin_required)
def add_staff_ajax(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method.'})

    form = StaffCreationForm(request.POST, request.FILES)
    if form.is_valid():
        try:
            user, profile, username, raw_password = form.save()
            return JsonResponse({
                'success': True,
                'username': username,
                'password': raw_password,
                'staff': {
                    'id': profile.id,
                    'full_name': user.full_name,
                    'username': username,
                    'email': user.email,
                    'phone': user.phone_number,
                    'center': profile.assigned_center.center_name if profile.assigned_center else '--',
                    'status': profile.status,
                    'profile_photo_url': profile.profile_photo.url if profile.profile_photo else None,
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'errors': f'Save error: {str(e)}'})
    else:
        errors = {}
        for field, msgs in form.errors.items():
            errors[field] = msgs[0]
        return JsonResponse({'success': False, 'errors': errors})


@login_required
@user_passes_test(admin_required)
def edit_staff_ajax(request, staff_id):
    try:
        profile = StaffProfile.objects.select_related('user', 'assigned_center').get(id=staff_id)
    except StaffProfile.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Staff not found.'})

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'staff': {
                'id': profile.id,
                'user_id': profile.user.id,
                'full_name': profile.user.full_name,
                'username': profile.user.username,
                'email': profile.user.email,
                'phone': profile.user.phone_number,
                'cnic': profile.cnic or '',
                'date_of_birth': str(profile.date_of_birth) if profile.date_of_birth else '',
                'age': profile.age,
                'gender': profile.gender or '',
                'address': profile.address or '',
                'center': profile.assigned_center.id if profile.assigned_center else '',
                'center_name': profile.assigned_center.center_name if profile.assigned_center else '',
                'profile_photo_url': profile.profile_photo.url if profile.profile_photo else None,
            }
        })

    if request.method == 'POST':
        form = StaffEditForm(
            request.POST, request.FILES,
            staff_id=profile.id,
            user_id=profile.user.id,
        )
        if form.is_valid():
            try:
                user, updated_profile = form.save()
                return JsonResponse({
                    'success': True,
                    'staff': {
                        'id': updated_profile.id,
                        'full_name': user.full_name,
                        'username': user.username,
                        'email': user.email,
                        'phone': user.phone_number,
                        'center': updated_profile.assigned_center.center_name if updated_profile.assigned_center else '--',
                        'status': updated_profile.status,
                        'profile_photo_url': updated_profile.profile_photo.url if updated_profile.profile_photo else None,
                    }
                })
            except Exception as e:
                return JsonResponse({'success': False, 'errors': f'Update error: {str(e)}'})
        else:
            errors = {}
            for field, msgs in form.errors.items():
                errors[field] = msgs[0]
            return JsonResponse({'success': False, 'errors': errors})

    return JsonResponse({'success': False, 'errors': 'Invalid request method.'})


@login_required
@user_passes_test(admin_required)
def delete_staff_ajax(request, staff_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method.'})

    try:
        profile = StaffProfile.objects.select_related('user').get(id=staff_id)
        user = profile.user
        username = user.username
        profile.delete()
        user.delete()
        return JsonResponse({
            'success': True,
            'message': f'Staff {username} deleted successfully.',
        })
    except StaffProfile.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Staff not found.'})
    except Exception as e:
        return JsonResponse({'success': False, 'errors': f'Delete error: {str(e)}'})


@login_required
@user_passes_test(admin_required)
def center_management(request):
    user = request.user

    city_filter = request.GET.get('city', '').strip()
    district_filter = request.GET.get('district', '').strip()

    centers = Center.objects.select_related('assigned_teacher__user').all()

    if city_filter:
        centers = centers.filter(city=city_filter)
    if district_filter:
        centers = centers.filter(district=district_filter)

    cities = (
        Center.objects.values_list('city', flat=True)
        .exclude(city='')
        .distinct()
        .order_by('city')
    )
    districts = (
        Center.objects.values_list('district', flat=True)
        .exclude(district='')
        .distinct()
        .order_by('district')
    )

    form = CenterForm()
    available_teachers = StaffProfile.objects.filter(
        status=StaffProfile.Status.ACTIVE
    ).select_related('user').order_by('user__full_name')

    has_filter = bool(city_filter) or bool(district_filter)

    return render(request, 'admin_panel/center_management.html', {
        'form': form,
        'centers': centers,
        'total_centers': centers.count(),
        'center_count': centers.count(),
        'available_teachers': available_teachers,
        'cities': cities,
        'districts': districts,
        'selected_city': city_filter,
        'selected_district': district_filter,
        'filtered': has_filter,
        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
    })


def get_center_code():
    import random, string
    prefix = 'CTR'
    last = Center.objects.filter(center_code__startswith=prefix).order_by('center_code').last()
    if last and last.center_code:
        num = int(last.center_code.replace(prefix, '')) + 1
    else:
        num = 1
    return f'{prefix}{num:04d}'


@login_required
@user_passes_test(admin_required)
def get_centers_list_json(request):
    centers = Center.objects.values('id', 'center_name').order_by('center_name')
    return JsonResponse({'centers': list(centers)})


@login_required
@user_passes_test(admin_required)
def add_center_ajax(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method.'})
    form = CenterForm(request.POST)
    if form.is_valid():
        try:
            center = form.save()
            center.center_code = get_center_code()
            center.save()
            return JsonResponse({
                'success': True,
                'center': serialize_center(center),
            })
        except Exception as e:
            return JsonResponse({'success': False, 'errors': f'Save error: {str(e)}'})
    else:
        errors = {}
        for field, msgs in form.errors.items():
            errors[field] = msgs[0]
        return JsonResponse({'success': False, 'errors': errors})


@login_required
@user_passes_test(admin_required)
def edit_center_ajax(request, center_id):
    try:
        center = Center.objects.select_related('assigned_teacher__user').get(id=center_id)
    except Center.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Center not found.'})

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'center': serialize_center(center),
        })

    if request.method == 'POST':
        form = CenterForm(request.POST, center_id=center.id)
        if form.is_valid():
            try:
                updated = form.update(center.id)
                return JsonResponse({
                    'success': True,
                    'center': serialize_center(updated),
                })
            except Exception as e:
                return JsonResponse({'success': False, 'errors': f'Update error: {str(e)}'})
        else:
            errors = {}
            for field, msgs in form.errors.items():
                errors[field] = msgs[0]
            return JsonResponse({'success': False, 'errors': errors})

    return JsonResponse({'success': False, 'errors': 'Invalid request method.'})


@login_required
@user_passes_test(admin_required)
def delete_center_ajax(request, center_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method.'})
    try:
        center = Center.objects.get(id=center_id)
        name = center.center_name
        center.delete()
        return JsonResponse({'success': True, 'message': f'Center "{name}" deleted successfully.'})
    except Center.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Center not found.'})
    except Exception as e:
        return JsonResponse({'success': False, 'errors': f'Delete error: {str(e)}'})


def serialize_center(center):
    teacher = center.assigned_teacher
    return {
        'id': center.id,
        'center_name': center.center_name,
        'center_code': center.center_code,
        'complete_address': center.complete_address,
        'city': center.city,
        'district': center.district,
        'latitude': float(center.latitude) if center.latitude else None,
        'longitude': float(center.longitude) if center.longitude else None,
        'allowed_radius': center.allowed_radius,
        'assigned_teacher': teacher.id if teacher else None,
        'assigned_teacher_name': teacher.user.full_name if teacher else 'Pending',
        'status': center.status,
    }


def get_attendance_data(today=None, q='', district='', center_id='', status_filter='', date_from='', date_to=''):
    if today is None:
        today = timezone.now().date()

    staff_profiles = StaffProfile.objects.select_related(
        'user', 'assigned_center'
    ).filter(status=StaffProfile.Status.ACTIVE).order_by('user__full_name')

    if q:
        staff_profiles = staff_profiles.filter(
            models.Q(user__full_name__icontains=q) |
            models.Q(user__username__icontains=q) |
            models.Q(cnic__icontains=q)
        )
    if district:
        staff_profiles = staff_profiles.filter(assigned_center__district=district)
    if center_id:
        staff_profiles = staff_profiles.filter(assigned_center_id=center_id)

    attrs = Attendance.objects.select_related('staff', 'center').all()
    if date_from:
        attrs = attrs.filter(date__gte=date_from)
    if date_to:
        attrs = attrs.filter(date__lte=date_to)
    else:
        attrs = attrs.filter(date=today)

    if status_filter:
        attrs = attrs.filter(status=status_filter)

    today_alerts = EmergencyAlert.objects.filter(created_at__date=today)
    staff_with_emergency_today = set(today_alerts.values_list('staff_id', flat=True))

    rows = []
    present_count = 0
    for sp in staff_profiles:
        user = sp.user
        user_attrs = [a for a in attrs if a.staff_id == user.id]
        if user_attrs:
            a = user_attrs[0]
            present_count += 1
            total_secs = int(a.working_hours.total_seconds()) if a.working_hours else 0
            hours_str = ''
            if total_secs:
                h = total_secs // 3600
                m = (total_secs % 3600) // 60
                hours_str = f'{h}h {m}m'
            verification_status = a.verification_status or '--'
            verification_icon = 'verified' if verification_status == 'Verified' else 'failed' if verification_status == 'Failed' else ''
            rows.append({
                'staff_id': user.id,
                'profile_id': sp.id,
                'full_name': user.full_name,
                'username': user.username or '',
                'employee_id': sp.cnic or '',
                'center_name': sp.assigned_center.center_name if sp.assigned_center else '--',
                'district': sp.assigned_center.district if sp.assigned_center else '--',
                'check_in_time': a.check_in_time.strftime('%I:%M %p') if a.check_in_time else '--',
                'check_out_time': a.check_out_time.strftime('%I:%M %p') if a.check_out_time else '--',
                'working_hours': hours_str or '--',
                'status': a.status,
                'gps_verified': a.gps_verified,
                'has_emergency': user.id in staff_with_emergency_today,
                'profile_photo_url': sp.profile_photo.url if sp.profile_photo else None,
                'verification_status': verification_status,
                'verification_icon': verification_icon,
            })
        else:
            rows.append({
                'staff_id': user.id,
                'profile_id': sp.id,
                'full_name': user.full_name,
                'username': user.username or '',
                'employee_id': sp.cnic or '',
                'center_name': sp.assigned_center.center_name if sp.assigned_center else '--',
                'district': sp.assigned_center.district if sp.assigned_center else '--',
                'check_in_time': '--',
                'check_out_time': '--',
                'working_hours': '--',
                'status': 'Absent',
                'gps_verified': False,
                'has_emergency': user.id in staff_with_emergency_today,
                'profile_photo_url': sp.profile_photo.url if sp.profile_photo else None,
                'verification_status': '--',
                'verification_icon': '',
            })

    total_staff = len(rows)
    absent_count = total_staff - present_count
    rate_str = f'{round(present_count / total_staff * 100)}%' if total_staff else '--'
    absent_rate_str = f'{round(absent_count / total_staff * 100)}%' if total_staff else '--'
    emergency_count = today_alerts.count()

    if status_filter == 'Present':
        rows = [r for r in rows if r['status'] == 'Present']
    elif status_filter == 'Absent':
        rows = [r for r in rows if r['status'] == 'Absent']
    elif status_filter == 'Late':
        rows = [r for r in rows if r['status'] == 'Late']

    return rows, total_staff, present_count, absent_count, rate_str, absent_rate_str, emergency_count


@login_required
@user_passes_test(admin_required)
def attendance_management(request):
    user = request.user
    today = timezone.now().date()

    q = request.GET.get('q', '').strip()
    district = request.GET.get('district', '').strip()
    center_id = request.GET.get('center', '').strip()
    status_filter = request.GET.get('status', '').strip()
    date_range = request.GET.get('date', '').strip()

    date_from = date_to = ''
    if date_range == 'yesterday':
        date_from = date_to = str(today - timezone.timedelta(days=1))
    elif date_range == 'last7':
        date_from = str(today - timezone.timedelta(days=6))
        date_to = str(today)
    elif date_range == 'last10':
        date_from = str(today - timezone.timedelta(days=9))
        date_to = str(today)
    elif date_range == 'last30':
        date_from = str(today - timezone.timedelta(days=29))
        date_to = str(today)
    elif date_range == 'lastmonth':
        first = today.replace(day=1) - timezone.timedelta(days=1)
        date_from = str(first.replace(day=1))
        date_to = str(first)
    elif date_range == 'lastyear':
        date_from = str(today.replace(year=today.year - 1, month=1, day=1))
        date_to = str(today.replace(year=today.year - 1, month=12, day=31))
    elif date_range == 'custom':
        date_from = request.GET.get('date_from', '')
        date_to = request.GET.get('date_to', '')

    rows, total_staff, present_count, absent_count, rate_str, absent_rate_str, emergency_count = \
        get_attendance_data(today, q, district, center_id, status_filter, date_from, date_to)

    centers_list = Center.objects.values('id', 'center_name').order_by('center_name')
    districts_list = (
        Center.objects.values_list('district', flat=True)
        .exclude(district='')
        .distinct()
        .order_by('district')
    )
    teachers_list = StaffProfile.objects.filter(
        status=StaffProfile.Status.ACTIVE
    ).select_related('user').values('id', 'user__full_name').order_by('user__full_name')

    return render(request, 'admin_panel/attendance_management.html', {
        'rows': rows,
        'total_staff': total_staff,
        'total_staff_subtitle': 'Active field workers',
        'present_today': present_count,
        'attendance_rate': rate_str,
        'absent_today': absent_count,
        'absent_rate': absent_rate_str,
        'emergency_count': emergency_count,
        'centers_list': centers_list,
        'districts_list': districts_list,
        'teachers_list': teachers_list,
        'selected_q': q,
        'selected_district': district,
        'selected_center': center_id,
        'selected_status': status_filter,
        'selected_date': date_range,
        'filtered': bool(q or district or center_id or status_filter or date_range),
        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
    })


@login_required
@user_passes_test(admin_required)
def get_attendance_json(request):
    today = timezone.now().date()
    q = request.GET.get('q', '').strip()
    district = request.GET.get('district', '').strip()
    center_id = request.GET.get('center', '').strip()
    status_filter = request.GET.get('status', '').strip()
    date_range = request.GET.get('date', '').strip()

    date_from = date_to = ''
    if date_range == 'yesterday':
        date_from = date_to = str(today - timezone.timedelta(days=1))
    elif date_range == 'last7':
        date_from = str(today - timezone.timedelta(days=6))
        date_to = str(today)
    elif date_range == 'last10':
        date_from = str(today - timezone.timedelta(days=9))
        date_to = str(today)
    elif date_range == 'last30':
        date_from = str(today - timezone.timedelta(days=29))
        date_to = str(today)
    elif date_range == 'lastmonth':
        first = today.replace(day=1) - timezone.timedelta(days=1)
        date_from = str(first.replace(day=1))
        date_to = str(first)
    elif date_range == 'lastyear':
        date_from = str(today.replace(year=today.year - 1, month=1, day=1))
        date_to = str(today.replace(year=today.year - 1, month=12, day=31))
    elif date_range == 'custom':
        date_from = request.GET.get('date_from', '')
        date_to = request.GET.get('date_to', '')

    rows_data, total, present, absent, rate, absent_rate, emergency_count = \
        get_attendance_data(today, q, district, center_id, status_filter, date_from, date_to)

    rows = []
    for r in rows_data:
        rows.append({
            'profile': {
                'id': r['profile_id'],
                'full_name': r['full_name'],
                'username': r['username'],
                'employee_id': r['employee_id'],
                'center': r['center_name'],
                'district': r['district'],
                'profile_photo': r['profile_photo_url'],
            },
            'attendance': {
                'check_in_time': r['check_in_time'],
                'check_out_time': r['check_out_time'],
                'working_hours': r['working_hours'],
                'gps_verified': r['gps_verified'],
                'verification_status': r['verification_status'],
                'verification_icon': r['verification_icon'],
            } if r['status'] != 'Absent' else None,
            'status': r['status'],
        })

    return JsonResponse({
        'success': True,
        'rows': rows,
        'stats': {
            'total_staff': total,
            'present_today': present,
            'absent_today': absent,
            'emergency_count': emergency_count,
            'attendance_rate': rate,
            'absent_rate': absent_rate,
        },
    })


@login_required
@user_passes_test(admin_required)
def get_attendance_detail(request, profile_id):
    try:
        sp = StaffProfile.objects.select_related('user', 'assigned_center').get(id=profile_id)
    except StaffProfile.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Staff not found.'})
    user = sp.user
    today = timezone.now().date()
    attrs = Attendance.objects.filter(staff=user, date=today).first()
    emergency_count = EmergencyAlert.objects.filter(staff=user, created_at__date=today).count()
    return JsonResponse({
        'success': True,
        'profile': {
            'id': sp.id,
            'full_name': user.full_name,
            'username': user.username or '',
            'employee_id': sp.cnic or '',
            'cnic': sp.cnic or '',
            'phone': user.phone_number or '',
            'email': user.email or '',
            'center': sp.assigned_center.center_name if sp.assigned_center else '--',
            'district': sp.assigned_center.district if sp.assigned_center else '--',
            'profile_photo': sp.profile_photo.url if sp.profile_photo else None,
            'dob': sp.date_of_birth.strftime('%Y-%m-%d') if sp.date_of_birth else '--',
            'gender': sp.gender if sp.gender else '--',
        },
        'attendance': {
            'check_in_time': attrs.check_in_time.strftime('%I:%M %p') if attrs and attrs.check_in_time else '--:-- --',
            'check_out_time': attrs.check_out_time.strftime('%I:%M %p') if attrs and attrs.check_out_time else '--:-- --',
            'working_hours': (
                f'{attrs.working_hours.seconds // 3600}h {(attrs.working_hours.seconds % 3600) // 60}m'
                if attrs and attrs.working_hours else '--'
            ),
            'status': attrs.status if attrs else 'Absent',
            'gps_verified': attrs.gps_verified if attrs else False,
        } if attrs else None,
        'emergency_alerts_today': emergency_count,
    })


@login_required
@user_passes_test(admin_required)
def reports(request):
    user = request.user
    today = timezone.now().date()

    q = request.GET.get('q', '').strip()
    center_id = request.GET.get('center', '').strip()
    district = request.GET.get('district', '').strip()
    att_status = request.GET.get('att_status', '').strip()
    emg_status = request.GET.get('emg_status', '').strip()
    date_from = request.GET.get('date_from', '').strip()
    date_to = request.GET.get('date_to', '').strip()
    date_range = request.GET.get('date', '').strip()

    if not date_from and date_range:
        if date_range == 'last7':
            date_from = str(today - timedelta(days=6))
            date_to = str(today)
        elif date_range == 'last30':
            date_from = str(today - timedelta(days=29))
            date_to = str(today)
        elif date_range == 'thismonth':
            date_from = str(today.replace(day=1))
            date_to = str(today)
        elif date_range == 'lastmonth':
            first = today.replace(day=1) - timedelta(days=1)
            date_from = str(first.replace(day=1))
            date_to = str(first)

    # -- Base querysets (unfiltered for summaries) --
    all_profiles = StaffProfile.objects.select_related('user', 'assigned_center')
    active_profiles_unfiltered = all_profiles.filter(status=StaffProfile.Status.ACTIVE)
    all_centers_unfiltered = Center.objects.all()
    all_emergencies = EmergencyAlert.objects.all()

    # -- Summary Cards (always unfiltered) --
    total_staff_count = active_profiles_unfiltered.count()
    total_centers_count = all_centers_unfiltered.count()
    today_attendance = Attendance.objects.filter(date=today).select_related('staff', 'center')
    today_present = today_attendance.filter(status=Attendance.Status.PRESENT).count()
    today_emergency_count = all_emergencies.filter(created_at__date=today).count()

    # -- Filtered querysets for reports --
    active_profiles = active_profiles_unfiltered
    all_centers = all_centers_unfiltered

    if district:
        active_profiles = active_profiles.filter(assigned_center__district=district)
        all_centers = all_centers.filter(district=district)
    if center_id:
        active_profiles = active_profiles.filter(assigned_center_id=center_id)
        all_centers = all_centers.filter(id=center_id)

    # -- Attendance Report (today or filtered) --
    if date_from and date_to:
        att_qs = Attendance.objects.filter(date__gte=date_from, date__lte=date_to)
    elif date_from:
        att_qs = Attendance.objects.filter(date__gte=date_from)
    elif date_to:
        att_qs = Attendance.objects.filter(date__lte=date_to)
    else:
        att_qs = Attendance.objects.filter(date=today)
    att_qs = att_qs.select_related('staff', 'center')

    if att_status:
        att_qs = att_qs.filter(status=att_status)

    if q:
        att_qs = att_qs.filter(
            Q(staff__full_name__icontains=q) |
            Q(staff__username__icontains=q) |
            Q(staff__staff_profile__cnic__icontains=q) |
            Q(center__center_name__icontains=q) |
            Q(center__district__icontains=q)
        )

    search_profiles = active_profiles
    if q:
        matching_att_ids = set(att_qs.values_list('staff_id', flat=True))
        matching_profile_ids = set(
            active_profiles.filter(
                Q(user__full_name__icontains=q) |
                Q(user__username__icontains=q) |
                Q(cnic__icontains=q) |
                Q(assigned_center__center_name__icontains=q) |
                Q(assigned_center__district__icontains=q)
            ).values_list('id', flat=True)
        )
        all_matching_ids = matching_att_ids | matching_profile_ids
        search_profiles = active_profiles.filter(id__in=all_matching_ids)

    matching_user_ids = set(search_profiles.values_list('user_id', flat=True)) if q else None

    att_present_count = att_qs.filter(status=Attendance.Status.PRESENT).count()
    att_late_count = att_qs.filter(status=Attendance.Status.LATE).count()
    staff_with_att_ids = set(att_qs.values_list('staff_id', flat=True))
    total_active = search_profiles.count()
    att_absent_count = total_active - len(staff_with_att_ids)
    att_pct = f'{round(att_present_count / total_active * 100)}%' if total_active else '--'

    # -- Center Report --
    center_total = all_centers.count()
    center_active = all_centers.filter(status=Center.Status.ACTIVE).count()
    center_pending = all_centers.filter(status=Center.Status.PENDING).count()
    centers_no_teacher = all_centers.filter(assigned_teacher__isnull=True).count()

    # -- Staff Report --
    staff_total = all_profiles.count()
    staff_active_count = search_profiles.count()
    staff_inactive = all_profiles.filter(status=StaffProfile.Status.INACTIVE).count()
    staff_male = search_profiles.filter(gender=StaffProfile.Gender.MALE).count()
    staff_female = search_profiles.filter(gender=StaffProfile.Gender.FEMALE).count()

    # -- Emergency Report --
    emg_total = all_emergencies.count()
    emg_today = today_emergency_count
    emg_week = all_emergencies.filter(created_at__date__gte=today - timedelta(days=7)).count()
    emg_month = all_emergencies.filter(created_at__date__gte=today - timedelta(days=30)).count()
    emg_pending = all_emergencies.filter(status=EmergencyAlert.Status.PENDING).count()
    emg_in_progress = all_emergencies.filter(status=EmergencyAlert.Status.IN_PROGRESS).count()
    emg_resolved = all_emergencies.filter(status=EmergencyAlert.Status.RESOLVED).count()
    emg_cancelled = all_emergencies.filter(status=EmergencyAlert.Status.CANCELLED).count()

    if emg_status:
        all_emergencies = all_emergencies.filter(status=emg_status)

    # -- Center-wise Report --
    center_wise = []
    for c in all_centers.select_related('assigned_teacher__user').order_by('center_name'):
        staff_at_center = search_profiles.filter(assigned_center=c)
        s_ids = set(staff_at_center.values_list('user_id', flat=True))
        staff_att_records = att_qs.filter(staff_id__in=s_ids, center=c).select_related('staff')
        present_c = sum(1 for r in staff_att_records if r.status == Attendance.Status.PRESENT)
        absent_c = len(s_ids) - len(set(r.staff_id for r in staff_att_records))
        emg_c = all_emergencies.filter(assigned_center=c).count()
        center_wise.append({
            'center': c,
            'staff_count': staff_at_center.count(),
            'present': present_c,
            'absent': absent_c,
            'emergency_count': emg_c,
        })

    # -- District-wise Report --
    district_list = Center.objects.values_list('district', flat=True).exclude(district='').distinct().order_by('district')
    district_wise = []
    for d in district_list:
        centers_in_dist = all_centers.filter(district=d)
        c_count = centers_in_dist.count()
        staff_in_dist = search_profiles.filter(assigned_center__district=d)
        s_count = staff_in_dist.count()
        s_ids = set(staff_in_dist.values_list('user_id', flat=True))
        att_in_dist = att_qs.filter(staff_id__in=s_ids)
        present_d = att_in_dist.filter(status=Attendance.Status.PRESENT).count()
        att_pct_d = f'{round(present_d / s_count * 100)}%' if s_count else '--'
        emg_d = all_emergencies.filter(assigned_center__district=d).count()
        district_wise.append({
            'district': d,
            'centers': c_count,
            'staff': s_count,
            'attendance_pct': att_pct_d,
            'emergency_count': emg_d,
        })

    # -- Report Table --
    if date_from and date_to:
        try:
            d_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            total_days_in_range = (d_to - d_from).days + 1
        except ValueError:
            total_days_in_range = 1
    else:
        total_days_in_range = 1

    report_rows = []
    for sp in search_profiles.select_related('user', 'assigned_center').order_by('user__full_name'):
        uid = sp.user.id
        user_att = att_qs.filter(staff_id=uid)
        present_days = user_att.filter(status=Attendance.Status.PRESENT).count()
        late_days = user_att.filter(status=Attendance.Status.LATE).count()
        absent_days = total_days_in_range - present_days - late_days
        emp_emg_count = all_emergencies.filter(staff_id=uid).count()
        user_att_pct = f'{round(present_days / (present_days + late_days + absent_days) * 100)}%' if (present_days + late_days + absent_days) else '--'
        report_rows.append({
            'profile_id': sp.id,
            'full_name': sp.user.full_name,
            'username': sp.user.username or '',
            'employee_id': sp.cnic or '',
            'photo': sp.profile_photo.url if sp.profile_photo else None,
            'center': sp.assigned_center.center_name if sp.assigned_center else '--',
            'district': sp.assigned_center.district if sp.assigned_center else '--',
            'att_pct': user_att_pct,
            'present_days': present_days,
            'absent_days': absent_days,
            'late_days': late_days,
            'emergency_count': emp_emg_count,
        })

    # -- Charts Data --
    # 1. Monthly Attendance Trend (last 12 months)
    monthly_data = []
    for i in range(11, -1, -1):
        m = today.replace(day=1) - timedelta(days=30 * i)
        m_start = m.replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        m_base = Attendance.objects.filter(date__gte=m_start, date__lte=m_end)
        if matching_user_ids is not None:
            m_base = m_base.filter(staff_id__in=matching_user_ids)
        m_present = m_base.filter(status=Attendance.Status.PRESENT).count()
        m_absent = m_base.filter(status=Attendance.Status.ABSENT).count()
        monthly_data.append({
            'month': m.strftime('%b %Y'),
            'present': m_present,
            'absent': m_absent,
        })

    # 2. Present vs Absent (today)
    if matching_user_ids is not None:
        pie_present = Attendance.objects.filter(date=today, status=Attendance.Status.PRESENT, staff_id__in=matching_user_ids).count()
    else:
        pie_present = today_present
    pie_absent = total_active - pie_present

    # 3. Center-wise Staff Distribution
    center_staff_data = [{'center': c.center_name, 'count': search_profiles.filter(assigned_center=c).count()} for c in all_centers.order_by('center_name')]

    # 4. District-wise Staff
    district_staff_data = []
    for d in district_list:
        cnt = search_profiles.filter(assigned_center__district=d).count()
        district_staff_data.append({'district': d, 'count': cnt})

    # 5. Emergency Alerts Trend (last 7 days)
    emg_trend = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        cnt = all_emergencies.filter(created_at__date=d).count()
        emg_trend.append({'date': d.strftime('%a %d'), 'count': cnt})

    # 6. Attendance % by Center (horizontal bar)
    att_by_center = []
    for c in all_centers.order_by('center_name'):
        s_ids = set(search_profiles.filter(assigned_center=c).values_list('user_id', flat=True))
        if s_ids:
            p_cnt = att_qs.filter(staff_id__in=s_ids, status=Attendance.Status.PRESENT).count()
            pct = round(p_cnt / len(s_ids) * 100)
        else:
            pct = 0
        att_by_center.append({'center': c.center_name, 'pct': pct})

    # -- Recent Activity --
    recent_activity = []
    recent_checkins = Attendance.objects.filter(date=today, check_in_time__isnull=False)
    if matching_user_ids is not None:
        recent_checkins = recent_checkins.filter(staff_id__in=matching_user_ids)
    recent_checkins = recent_checkins.select_related('staff', 'center').order_by('-check_in_time')[:10]
    for a in reversed(list(recent_checkins)):
        recent_activity.append({
            'name': a.staff.full_name,
            'action': 'Checked In',
            'time': a.check_in_time.strftime('%I:%M %p'),
            'type': 'checkin',
        })
    recent_checkouts = Attendance.objects.filter(date=today, check_out_time__isnull=False)
    if matching_user_ids is not None:
        recent_checkouts = recent_checkouts.filter(staff_id__in=matching_user_ids)
    recent_checkouts = recent_checkouts.select_related('staff', 'center').order_by('-check_out_time')[:10]
    for a in reversed(list(recent_checkouts)):
        recent_activity.append({
            'name': a.staff.full_name,
            'action': 'Checked Out',
            'time': a.check_out_time.strftime('%I:%M %p'),
            'type': 'checkout',
        })
    recent_emg = EmergencyAlert.objects.filter(created_at__date=today)
    if matching_user_ids is not None:
        recent_emg = recent_emg.filter(staff_id__in=matching_user_ids)
    recent_emg = recent_emg.select_related('staff', 'assigned_center').order_by('-created_at')[:10]
    for e in reversed(list(recent_emg)):
        recent_activity.append({
            'name': e.staff.full_name,
            'action': 'Emergency Alert',
            'time': timezone.localtime(e.created_at).strftime('%I:%M %p'),
            'type': 'emergency',
        })
    recent_activity.sort(key=lambda x: x['time'], reverse=True)
    recent_activity = recent_activity[:12]

    # -- Filters context --
    districts_list = Center.objects.values_list('district', flat=True).exclude(district='').distinct().order_by('district')
    centers_list = all_centers.values('id', 'center_name').order_by('center_name')

    context = {
        # Summary cards
        'total_staff': total_staff_count,
        'total_centers': total_centers_count,
        'today_present': today_present,
        'today_emergency': today_emergency_count,

        # Attendance Report
        'att_total': total_active,
        'att_present': att_present_count,
        'att_absent': att_absent_count,
        'att_late': att_late_count,
        'att_pct': att_pct,

        # Center Report
        'center_total': center_total,
        'center_active': center_active,
        'center_pending': center_pending,
        'centers_no_teacher': centers_no_teacher,

        # Staff Report
        'staff_total': staff_total,
        'staff_active': staff_active_count,
        'staff_inactive': staff_inactive,
        'staff_male': staff_male,
        'staff_female': staff_female,

        # Emergency Report
        'emg_total': emg_total,
        'emg_today': emg_today,
        'emg_week': emg_week,
        'emg_month': emg_month,
        'emg_pending': emg_pending,
        'emg_in_progress': emg_in_progress,
        'emg_resolved': emg_resolved,
        'emg_cancelled': emg_cancelled,

        # Tables
        'center_wise': center_wise,
        'district_wise': district_wise,
        'report_rows': report_rows,
        'recent_activity': recent_activity,

        # Chart data (pass as JSON)
        'chart_monthly': json.dumps(monthly_data),
        'chart_pie_present': pie_present,
        'chart_pie_absent': pie_absent,
        'chart_center_staff': json.dumps(center_staff_data),
        'chart_district_staff': json.dumps(district_staff_data),
        'chart_emg_trend': json.dumps(emg_trend),
        'chart_att_by_center': json.dumps(att_by_center),

        # Filters
        'districts_list': districts_list,
        'centers_list': centers_list,
        'selected_q': q,
        'selected_center': center_id,
        'selected_district': district,
        'selected_att_status': att_status,
        'selected_emg_status': emg_status,
        'selected_date_from': date_from,
        'selected_date_to': date_to,
        'selected_date_range': date_range,
        'filtered': bool(q or center_id or district or att_status or emg_status or date_from or date_to or date_range),

        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
    }

    return render(request, 'admin_panel/reports.html', context)


@login_required
@user_passes_test(admin_required)
def emergency_alerts(request):
    user = request.user
    today = timezone.now().date()

    q = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', '').strip()
    center_filter = request.GET.get('center', '').strip()
    district_filter = request.GET.get('district', '').strip()
    date_filter = request.GET.get('date', '').strip()

    alerts = EmergencyAlert.objects.select_related(
        'staff', 'assigned_center'
    ).all()

    has_filter = bool(q or status_filter or center_filter or district_filter or date_filter)

    if q:
        alerts = alerts.filter(
            models.Q(staff__full_name__icontains=q) |
            models.Q(staff__username__icontains=q) |
            models.Q(assigned_center__center_name__icontains=q) |
            models.Q(assigned_center__district__icontains=q)
        )
    if status_filter:
        alerts = alerts.filter(status=status_filter)
    if center_filter:
        alerts = alerts.filter(assigned_center_id=center_filter)
    if district_filter:
        alerts = alerts.filter(assigned_center__district=district_filter)
    if date_filter:
        alerts = alerts.filter(created_at__date=date_filter)

    total = alerts.count()
    pending = alerts.filter(status='Pending').count()
    in_progress = alerts.filter(status='In Progress').count()
    resolved = alerts.filter(status='Resolved').count()
    cancelled = alerts.filter(status='Cancelled').count()
    today_count = alerts.filter(created_at__date=today).count()

    centers = Center.objects.values_list('id', 'center_name').order_by('center_name')
    districts = (
        Center.objects.values_list('district', flat=True)
        .exclude(district='')
        .distinct()
        .order_by('district')
    )

    return render(request, 'admin_panel/emergency_alerts.html', {
        'alerts': alerts,
        'total_alerts': total,
        'pending_alerts': pending,
        'in_progress_alerts': in_progress,
        'resolved_alerts': resolved,
        'cancelled_alerts': cancelled,
        'today_alerts': today_count,
        'centers': centers,
        'districts': districts,
        'q': q,
        'selected_status': status_filter,
        'selected_center': center_filter,
        'selected_district': district_filter,
        'selected_date': date_filter,
        'filtered': has_filter,
        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
    })


@login_required
@user_passes_test(admin_required)
def get_alerts_json(request):
    alerts = EmergencyAlert.objects.select_related(
        'staff', 'assigned_center'
    ).all()
    data = []
    for a in alerts:
        staff_profile = getattr(a.staff, 'staff_profile', None)
        emp_id = staff_profile.cnic if staff_profile else ''
        center_name = a.assigned_center.center_name if a.assigned_center else '--'
        district = a.assigned_center.district if a.assigned_center else '--'
        profile_photo_url = staff_profile.profile_photo.url if staff_profile and staff_profile.profile_photo else None
        initials = (a.staff.full_name[0] if a.staff.full_name else 'S').upper()
        data.append({
            'id': a.id,
            'staff_name': a.staff.full_name,
            'employee_id': emp_id,
            'assigned_center': center_name,
            'district': district,
            'latitude': str(a.latitude) if a.latitude is not None else '',
            'longitude': str(a.longitude) if a.longitude is not None else '',
            'location_address': a.location_address,
            'alert_message': a.alert_message,
            'status': a.status,
            'profile_photo_url': profile_photo_url,
            'initials': initials,
            'created_at': timezone.localtime(a.created_at).strftime('%Y-%m-%d %I:%M %p'),
            'created_date': timezone.localtime(a.created_at).strftime('%Y-%m-%d'),
            'created_time': timezone.localtime(a.created_at).strftime('%I:%M %p'),
        })
    return JsonResponse({'success': True, 'alerts': data})


@login_required
@user_passes_test(admin_required)
def update_alert_status(request, alert_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method.'})
    import json
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST
    new_status = data.get('status', '').strip()
    valid_statuses = ['Pending', 'In Progress', 'Resolved', 'Cancelled']
    if new_status not in valid_statuses:
        return JsonResponse({'success': False, 'errors': 'Invalid status.'})
    try:
        alert = EmergencyAlert.objects.get(id=alert_id)
    except EmergencyAlert.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Alert not found.'})
    alert.status = new_status
    if new_status in ('Resolved', 'Cancelled'):
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
    else:
        alert.resolved_at = None
        alert.resolved_by = None
    alert.save()
    # Mark associated notification as read
    Notification.objects.filter(related_alert=alert, is_read=False).update(is_read=True)
    return JsonResponse({
        'success': True,
        'message': f'Alert status updated to {new_status}.',
    })


@login_required
@user_passes_test(admin_required)
def delete_alert(request, alert_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method.'})
    try:
        alert = EmergencyAlert.objects.get(id=alert_id)
        alert.delete()
        return JsonResponse({'success': True, 'message': 'Alert deleted successfully.'})
    except EmergencyAlert.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Alert not found.'})


@login_required
@user_passes_test(admin_required)
def get_alert_detail(request, alert_id):
    try:
        a = EmergencyAlert.objects.select_related('staff', 'assigned_center').get(id=alert_id)
    except EmergencyAlert.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Alert not found.'})
    # Mark associated notification as read
    Notification.objects.filter(related_alert=a, is_read=False).update(is_read=True)
    staff_profile = getattr(a.staff, 'staff_profile', None)
    profile_photo_url = staff_profile.profile_photo.url if staff_profile and staff_profile.profile_photo else None
    initials = (a.staff.full_name[0] if a.staff.full_name else 'S').upper()
    return JsonResponse({
        'success': True,
        'alert': {
            'id': a.id,
            'staff_name': a.staff.full_name,
            'employee_id': staff_profile.cnic if staff_profile else '',
            'phone_number': a.staff.phone_number,
            'assigned_center': a.assigned_center.center_name if a.assigned_center else '--',
            'district': a.assigned_center.district if a.assigned_center else '--',
            'latitude': str(a.latitude) if a.latitude is not None else '',
            'longitude': str(a.longitude) if a.longitude is not None else '',
            'location_address': a.location_address,
            'alert_message': a.alert_message,
            'status': a.status,
            'profile_photo_url': profile_photo_url,
            'initials': initials,
            'created_at': timezone.localtime(a.created_at).strftime('%Y-%m-%d %I:%M %p'),
            'created_date': timezone.localtime(a.created_at).strftime('%Y-%m-%d'),
            'created_time': timezone.localtime(a.created_at).strftime('%I:%M %p'),
        }
    })


@login_required
@user_passes_test(admin_required)
def notifications_settings(request):
    user = request.user
    notifications = Notification.objects.select_related('staff', 'related_alert').all()
    unread_count = notifications.filter(is_read=False).count()
    # Mark all unread notifications as read when admin visits the page
    notifications.filter(is_read=False).update(is_read=True)
    return render(request, 'admin_panel/notifications_settings.html', {
        'notifications': notifications,
        'unread_notifications_count': 0,
        'total_notifications': notifications.count(),
        'user_role': user.role,
        'user_initials': get_initials(user.full_name),
    })


@login_required
@user_passes_test(admin_required)
def profile_settings(request):
    return render(request, 'admin_panel/profile_settings.html')


@login_required
@user_passes_test(admin_required)
def export_reports_csv(request):
    today = timezone.now().date()
    q = request.GET.get('q', '').strip()
    center_id = request.GET.get('center', '').strip()
    district = request.GET.get('district', '').strip()
    date_from = request.GET.get('date_from', '').strip()
    date_to = request.GET.get('date_to', '').strip()

    profiles = StaffProfile.objects.select_related('user', 'assigned_center').filter(
        status=StaffProfile.Status.ACTIVE
    )
    if q:
        profiles = profiles.filter(
            Q(user__full_name__icontains=q) |
            Q(cnic__icontains=q) |
            Q(assigned_center__center_name__icontains=q)
        )
    if center_id:
        profiles = profiles.filter(assigned_center_id=center_id)
    if district:
        profiles = profiles.filter(assigned_center__district=district)

    if date_from and date_to:
        att_qs = Attendance.objects.filter(date__gte=date_from, date__lte=date_to)
    else:
        att_qs = Attendance.objects.filter(date=today)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="attendance_report_{today}.csv"'
    writer = csv.writer(response)
    writer.writerow(['Staff Name', 'Employee ID', 'Center', 'District', 'Present Days', 'Late Days', 'Emergency Alerts', 'Attendance %'])

    for sp in profiles:
        uid = sp.user.id
        user_att = att_qs.filter(staff_id=uid)
        present_d = user_att.filter(status=Attendance.Status.PRESENT).count()
        late_d = user_att.filter(status=Attendance.Status.LATE).count()
        total_d = present_d + late_d
        emg_c = EmergencyAlert.objects.filter(staff_id=uid).count()
        pct = f'{round(present_d / total_d * 100)}%' if total_d else '--'
        writer.writerow([
            sp.user.full_name, sp.cnic or '',
            sp.assigned_center.center_name if sp.assigned_center else '--',
            sp.assigned_center.district if sp.assigned_center else '--',
            present_d, late_d, emg_c, pct,
        ])

    return response


@login_required
@user_passes_test(admin_required)
def export_reports_excel(request):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill

    today = timezone.now().date()
    q = request.GET.get('q', '').strip()
    center_id = request.GET.get('center', '').strip()
    district = request.GET.get('district', '').strip()
    date_from = request.GET.get('date_from', '').strip()
    date_to = request.GET.get('date_to', '').strip()

    profiles = StaffProfile.objects.select_related('user', 'assigned_center').filter(
        status=StaffProfile.Status.ACTIVE
    )
    if q:
        profiles = profiles.filter(
            Q(user__full_name__icontains=q) |
            Q(cnic__icontains=q) |
            Q(assigned_center__center_name__icontains=q)
        )
    if center_id:
        profiles = profiles.filter(assigned_center_id=center_id)
    if district:
        profiles = profiles.filter(assigned_center__district=district)
    if date_from and date_to:
        att_qs = Attendance.objects.filter(date__gte=date_from, date__lte=date_to)
    else:
        att_qs = Attendance.objects.filter(date=today)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Attendance Report'

    header_font = Font(bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='1F5C40', end_color='1F5C40', fill_type='solid')
    headers = ['Staff Name', 'Employee ID', 'Center', 'District', 'Present Days', 'Late Days', 'Emergency Alerts', 'Attendance %']
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.font = header_font
        cell.fill = header_fill

    for row_idx, sp in enumerate(profiles, 2):
        uid = sp.user.id
        user_att = att_qs.filter(staff_id=uid)
        present_d = user_att.filter(status=Attendance.Status.PRESENT).count()
        late_d = user_att.filter(status=Attendance.Status.LATE).count()
        total_d = present_d + late_d
        emg_c = EmergencyAlert.objects.filter(staff_id=uid).count()
        pct = f'{round(present_d / total_d * 100)}%' if total_d else '--'
        ws.cell(row=row_idx, column=1, value=sp.user.full_name)
        ws.cell(row=row_idx, column=2, value=sp.cnic or '')
        ws.cell(row=row_idx, column=3, value=sp.assigned_center.center_name if sp.assigned_center else '--')
        ws.cell(row=row_idx, column=4, value=sp.assigned_center.district if sp.assigned_center else '--')
        ws.cell(row=row_idx, column=5, value=present_d)
        ws.cell(row=row_idx, column=6, value=late_d)
        ws.cell(row=row_idx, column=7, value=emg_c)
        ws.cell(row=row_idx, column=8, value=pct)

    ws.column_dimensions['A'].width = 25
    ws.column_dimensions['B'].width = 18
    ws.column_dimensions['C'].width = 22
    ws.column_dimensions['D'].width = 18
    ws.column_dimensions['E'].width = 14
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 18
    ws.column_dimensions['H'].width = 16

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="attendance_report_{today}.xlsx"'
    wb.save(response)
    return response


@login_required
@user_passes_test(admin_required)
def export_reports_pdf(request):
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import inch

    today = timezone.now().date()
    q = request.GET.get('q', '').strip()
    center_id = request.GET.get('center', '').strip()
    district = request.GET.get('district', '').strip()
    date_from = request.GET.get('date_from', '').strip()
    date_to = request.GET.get('date_to', '').strip()

    profiles = StaffProfile.objects.select_related('user', 'assigned_center').filter(
        status=StaffProfile.Status.ACTIVE
    )
    if q:
        profiles = profiles.filter(
            Q(user__full_name__icontains=q) |
            Q(cnic__icontains=q) |
            Q(assigned_center__center_name__icontains=q)
        )
    if center_id:
        profiles = profiles.filter(assigned_center_id=center_id)
    if district:
        profiles = profiles.filter(assigned_center__district=district)
    if date_from and date_to:
        att_qs = Attendance.objects.filter(date__gte=date_from, date__lte=date_to)
    else:
        att_qs = Attendance.objects.filter(date=today)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), title='Attendance Report')
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f'Attendance Report — {today}', styles['Title']))
    elements.append(Spacer(1, 0.2 * inch))

    data = [['Staff Name', 'Employee ID', 'Center', 'District', 'Present', 'Late', 'Emergencies', 'Att %']]
    for sp in profiles:
        uid = sp.user.id
        user_att = att_qs.filter(staff_id=uid)
        present_d = user_att.filter(status=Attendance.Status.PRESENT).count()
        late_d = user_att.filter(status=Attendance.Status.LATE).count()
        total_d = present_d + late_d
        emg_c = EmergencyAlert.objects.filter(staff_id=uid).count()
        pct = f'{round(present_d / total_d * 100)}%' if total_d else '--'
        data.append([
            sp.user.full_name, sp.cnic or '',
            sp.assigned_center.center_name if sp.assigned_center else '--',
            sp.assigned_center.district if sp.assigned_center else '--',
            str(present_d), str(late_d), str(emg_c), pct,
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F5C40')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0FDF4')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="attendance_report_{today}.pdf"'
    return response
