from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import authenticate, login


def login_view(request):
    if request.method == 'POST':
        identifier = request.POST.get('identifier', '').strip()
        password = request.POST.get('password', '').strip()

        user = authenticate(request, username=identifier, password=password)

        if user is not None:
            login(request, user)
            role = user.role

            if role == 'Admin':
                request.session['user_role'] = 'admin'
                return redirect('admin_dashboard')
            elif role in ('Field Staff', 'Teacher'):
                request.session['user_role'] = 'staff'
                return redirect('staff_home')
            else:
                request.session['user_role'] = 'staff'
                return redirect('staff_home')

        messages.error(request, 'Invalid Username or Password')

    return render(request, 'accounts/login.html')


def logout_view(request):
    from django.contrib.auth import logout
    logout(request)
    request.session.flush()
    return redirect('login')
