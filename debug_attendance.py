import django, os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'srsp_project.settings')
sys.path.insert(0, r'C:\Users\Nasir\Videos\srsp_tracking_system')
django.setup()

from django.utils import timezone
from admin_panel.models import Attendance, Center
from staff.models import StaffProfile
from accounts.models import CustomUser

today = timezone.now().date()
print(f"Today (local): {today}")
print(f"Timezone: {timezone.get_current_timezone_name()}")
print()

total_staff = StaffProfile.objects.filter(status='Active').count()
print(f"Active staff count: {total_staff}")
for s in StaffProfile.objects.filter(status='Active').select_related('user', 'assigned_center'):
    print(f"  Staff: {s.user.full_name} (ID={s.user_id}), Center: {s.assigned_center}")
print()

all_att = Attendance.objects.all().select_related('staff', 'center')
print(f"Total attendance records in DB: {all_att.count()}")
for a in all_att:
    cname = a.center.center_name if a.center else 'None'
    print(f"  ID={a.id} Staff={a.staff.full_name} Date={a.date} Status={a.status} Center={cname} CheckIn={a.check_in_time}")
print()

today_att = Attendance.objects.filter(date=today).select_related('staff', 'center')
print(f"Today attendance records: {today_att.count()}")
for a in today_att:
    cname = a.center.center_name if a.center else 'None'
    print(f"  ID={a.id} Staff={a.staff.full_name} Status={a.status} Center={cname} CheckIn={a.check_in_time}")
print()

present = today_att.filter(status='Present')
print(f"Present today count: {present.count()}")
for a in present:
    print(f"  Present: Staff={a.staff.full_name} (ID={a.staff_id}) CheckIn={a.check_in_time}")
print()

present_ids = list(present.values_list('staff_id', flat=True))
print(f"Present staff IDs: {present_ids}")

absent = StaffProfile.objects.filter(status='Active').exclude(user_id__in=present_ids)
print(f"Absent staff count: {absent.count()}")
for s in absent:
    print(f"  Absent: {s.user.full_name} (ID={s.user_id})")
