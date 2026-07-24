from django.urls import path
from . import views

urlpatterns = [
    path('home/', views.home, name='staff_home'),
    path('dashboard/', views.dashboard, name='staff_dashboard'),
    path('attendance/verify-location/', views.verify_location, name='staff_verify_location'),
    path('attendance/verify-face/', views.verify_face, name='staff_verify_face'),
    path('attendance/checkin/', views.check_in, name='staff_checkin'),
    path('attendance/checkout/', views.check_out, name='staff_checkout'),
    path('emergency/', views.send_emergency_alert, name='staff_emergency'),
    path('history/', views.history, name='staff_history'),
    path('center-settings/', views.center_settings, name='staff_center_settings'),
    path('center-settings/configure/', views.configure_center, name='staff_configure_center'),
    path('center-settings/request-change/', views.request_location_change, name='staff_request_location_change'),
    path('settings/', views.settings_page, name='staff_settings'),
]
