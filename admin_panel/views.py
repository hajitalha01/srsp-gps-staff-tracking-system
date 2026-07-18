from django.shortcuts import render, redirect
from functools import wraps

# ====================================================================
# TEMPORARY DEVELOPMENT DECORATORS
# These replace @login_required and @is_admin for frontend testing.
# TODO: Remove these and restore proper Django Authentication
#       (from django.contrib.auth.decorators import login_required, user_passes_test)
#       before production.
# ====================================================================

def temp_login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get('logged_in'):
            return redirect('login')
        return view_func(request, *args, **kwargs)
    return wrapper


def temp_admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.session.get('user_role') != 'admin':
            return redirect('login')
        return view_func(request, *args, **kwargs)
    return wrapper


@temp_login_required
@temp_admin_required
def dashboard(request):
    return render(request, 'admin_panel/dashboard.html')


@temp_login_required
@temp_admin_required
def staff_management(request):
    return render(request, 'admin_panel/staff_management.html')


@temp_login_required
@temp_admin_required
def center_management(request):
    return render(request, 'admin_panel/center_management.html')


@temp_login_required
@temp_admin_required
def attendance_management(request):
    return render(request, 'admin_panel/attendance_management.html')


@temp_login_required
@temp_admin_required
def reports(request):
    return render(request, 'admin_panel/reports.html')


@temp_login_required
@temp_admin_required
def emergency_alerts(request):
    return render(request, 'admin_panel/emergency_alerts.html')


@temp_login_required
@temp_admin_required
def notifications_settings(request):
    return render(request, 'admin_panel/notifications_settings.html')


@temp_login_required
@temp_admin_required
def profile_settings(request):
    return render(request, 'admin_panel/profile_settings.html')
