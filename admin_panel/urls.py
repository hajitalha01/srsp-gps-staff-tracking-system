from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='admin_dashboard'),
    path('staff/', views.staff_management, name='admin_staff'),
    path('staff/add/', views.add_staff_ajax, name='admin_staff_add'),
    path('staff/<int:staff_id>/edit/', views.edit_staff_ajax, name='admin_staff_edit'),
    path('staff/<int:staff_id>/delete/', views.delete_staff_ajax, name='admin_staff_delete'),
    path('centers/', views.center_management, name='admin_centers'),
    path('centers/add/', views.add_center_ajax, name='admin_center_add'),
    path('centers/<int:center_id>/edit/', views.edit_center_ajax, name='admin_center_edit'),
    path('centers/<int:center_id>/delete/', views.delete_center_ajax, name='admin_center_delete'),
    path('attendance/', views.attendance_management, name='admin_attendance'),
    path('attendance/json/', views.get_attendance_json, name='admin_attendance_json'),
    path('attendance/<int:profile_id>/detail/', views.get_attendance_detail, name='admin_attendance_detail'),
    path('reports/', views.reports, name='admin_reports'),
    path('reports/export/csv/', views.export_reports_csv, name='admin_reports_csv'),
    path('reports/export/excel/', views.export_reports_excel, name='admin_reports_excel'),
    path('reports/export/pdf/', views.export_reports_pdf, name='admin_reports_pdf'),
    path('alerts/', views.emergency_alerts, name='admin_alerts'),
    path('alerts/json/', views.get_alerts_json, name='admin_alerts_json'),
    path('alerts/<int:alert_id>/status/', views.update_alert_status, name='admin_alert_status'),
    path('alerts/<int:alert_id>/delete/', views.delete_alert, name='admin_alert_delete'),
    path('alerts/<int:alert_id>/detail/', views.get_alert_detail, name='admin_alert_detail'),
    path('notifications/', views.notifications_settings, name='admin_notifications'),
    path('profile/', views.profile_settings, name='admin_profile'),
    path('settings/', views.profile_settings, name='admin_settings'),
]
