from django.db import migrations
from django.contrib.auth.hashers import make_password


def create_admin_user(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    if not CustomUser.objects.filter(username='12').exists():
        CustomUser.objects.create(
            username='12',
            full_name='Admin',
            email='admin@srsp.org',
            phone_number='00000000000',
            role='Admin',
            is_active=True,
            is_staff=True,
            is_superuser=True,
            password=make_password('12'),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_customuser_username'),
    ]

    operations = [
        migrations.RunPython(create_admin_user, reverse_code=migrations.RunPython.noop),
    ]
