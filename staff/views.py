from django.shortcuts import render, redirect
from functools import wraps

# ====================================================================
# TEMPORARY DEVELOPMENT DECORATOR
# This replaces @login_required for frontend testing.
# TODO: Remove this and restore proper Django Authentication
#       (from django.contrib.auth.decorators import login_required)
#       before production.
# ====================================================================

def temp_login_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.session.get('logged_in'):
            return redirect('login')
        return view_func(request, *args, **kwargs)
    return wrapper


@temp_login_required
def home(request):
    """Home screen — Check in / Emergency alarm buttons"""
    return render(request, 'staff/home.html')


@temp_login_required
def dashboard(request):
    """Opens after check-in — location, attendance history, panic alarm"""
    return render(request, 'staff/dashboard.html')
