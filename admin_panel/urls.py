from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='admin_dashboard'),
    path('staff/', views.staff_management, name='admin_staff'),
    path('centers/', views.center_management, name='admin_centers'),
    path('attendance/', views.attendance_management, name='admin_attendance'),
    path('reports/', views.reports, name='admin_reports'),
    path('alerts/', views.emergency_alerts, name='admin_alerts'),
    path('notifications/', views.notifications_settings, name='admin_notifications'),
]
