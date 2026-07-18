from django.urls import path
from . import views

urlpatterns = [
    path('home/', views.home, name='staff_home'),
    path('dashboard/', views.dashboard, name='staff_dashboard'),
]
