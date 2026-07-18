from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),                 # Django's own admin (alag hai)
    path('', include('accounts.urls')),               # login screen root pe
    path('staff/', include('staff.urls')),
    path('panel/', include('admin_panel.urls')),       # humara admin panel
]
