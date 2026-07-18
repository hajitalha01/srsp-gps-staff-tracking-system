from django.shortcuts import render, redirect
from django.contrib import messages

# ====================================================================
# TEMPORARY DEVELOPMENT LOGIN
# This is a simplified login for frontend/UI testing ONLY.
# TODO: Remove this and replace with proper Django Authentication
#       (authenticate, login, @login_required) before production.
# ====================================================================

CREDENTIALS = {
    '12': {'password': '12', 'role': 'admin',  'redirect': 'admin_dashboard'},
    '11': {'password': '11', 'role': 'staff',  'redirect': 'staff_home'},
}


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('identifier')
        password = request.POST.get('password')

        if username in CREDENTIALS and CREDENTIALS[username]['password'] == password:
            request.session['logged_in'] = True
            request.session['user_role'] = CREDENTIALS[username]['role']
            request.session['username'] = username
            return redirect(CREDENTIALS[username]['redirect'])

        messages.error(request, 'Invalid Username or Password')

    return render(request, 'accounts/login.html')


def logout_view(request):
    request.session.flush()
    return redirect('login')
