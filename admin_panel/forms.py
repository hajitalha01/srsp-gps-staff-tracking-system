import re
import secrets
import string
from datetime import date

from django import forms
from django.core.exceptions import ValidationError

from accounts.models import CustomUser
from staff.models import StaffProfile
from admin_panel.models import Center


class StaffCreationForm(forms.Form):
    profile_picture = forms.ImageField(required=False)
    full_name = forms.CharField(
        max_length=255,
        min_length=3,
        error_messages={
            'required': 'Full name is required.',
            'min_length': 'Full name must be at least 3 characters.',
        }
    )
    email = forms.EmailField(
        error_messages={
            'required': 'Email address is required.',
            'invalid': 'Enter a valid email address.',
        }
    )
    phone_number = forms.CharField(
        max_length=11,
        min_length=11,
        error_messages={
            'required': 'Phone number is required.',
            'min_length': 'Phone number must be 11 digits (03XXXXXXXXX).',
        }
    )
    cnic = forms.CharField(
        max_length=15,
        min_length=15,
        error_messages={
            'required': 'CNIC is required.',
            'min_length': 'CNIC must be in format xxxxx-xxxxxxx-x.',
        }
    )
    date_of_birth = forms.DateField(
        widget=forms.DateInput(
            attrs={'type': 'date', 'class': 'pf-input'}
        ),
        error_messages={'required': 'Date of birth is required.'}
    )
    age = forms.IntegerField(
        required=False,
        widget=forms.HiddenInput()
    )
    gender = forms.ChoiceField(
        choices=[('', 'Select Gender')] + [(g, g) for g in ['Male', 'Female', 'Other']],
        error_messages={'required': 'Gender is required.'}
    )
    address = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 3}),
        min_length=10,
        error_messages={
            'required': 'Address is required.',
            'min_length': 'Address must be at least 10 characters.',
        }
    )
    assigned_center = forms.ModelChoiceField(
        queryset=Center.objects.filter(status='Active'),
        empty_label='Select Center',
        error_messages={'required': 'Assigned center is required.'}
    )

    def clean_full_name(self):
        value = self.cleaned_data['full_name'].strip()
        return value

    def clean_email(self):
        value = self.cleaned_data['email'].strip().lower()
        if CustomUser.objects.filter(email=value).exists():
            raise ValidationError('This email is already registered.')
        return value

    def clean_phone_number(self):
        value = self.cleaned_data['phone_number'].strip()
        if not re.match(r'^03\d{9}$', value):
            raise ValidationError('Phone number must be a valid Pakistani number (03XXXXXXXXX).')
        if CustomUser.objects.filter(phone_number=value).exists():
            raise ValidationError('This phone number is already registered.')
        return value

    def clean_cnic(self):
        value = self.cleaned_data['cnic'].strip()
        if not re.match(r'^\d{5}-\d{7}-\d{1}$', value):
            raise ValidationError('CNIC must be in format xxxxx-xxxxxxx-x.')
        if StaffProfile.objects.filter(cnic=value).exists():
            raise ValidationError('This CNIC is already registered.')
        return value

    def clean_date_of_birth(self):
        value = self.cleaned_data['date_of_birth']
        age = date.today().year - value.year
        if age < 18:
            raise ValidationError('Staff must be at least 18 years old.')
        return value

    def clean_gender(self):
        value = self.cleaned_data['gender']
        if not value:
            raise ValidationError('Gender is required.')
        return value

    def clean_address(self):
        value = self.cleaned_data['address'].strip()
        return value

    def clean_profile_picture(self):
        image = self.cleaned_data.get('profile_picture')
        if image:
            if image.size > 2 * 1024 * 1024:
                raise ValidationError('Image size must not exceed 2 MB.')
            if image.content_type not in ['image/jpeg', 'image/png']:
                raise ValidationError('Only JPG, JPEG, and PNG images are allowed.')
        return image

    @staticmethod
    def generate_username():
        prefix = 'staff'
        last_user = CustomUser.objects.filter(username__startswith=prefix).order_by('username').last()
        if last_user and last_user.username:
            last_num = int(last_user.username.replace(prefix, ''))
            new_num = last_num + 1
        else:
            new_num = 1
        return f'{prefix}{new_num:04d}'

    @staticmethod
    def generate_password():
        uppercase = string.ascii_uppercase
        lowercase = string.ascii_lowercase
        digits = string.digits
        special = '!@#$%&*'
        all_chars = uppercase + lowercase + digits + special
        password = [
            secrets.choice(uppercase),
            secrets.choice(lowercase),
            secrets.choice(digits),
            secrets.choice(special),
        ]
        password += [secrets.choice(all_chars) for _ in range(6)]
        secrets.SystemRandom().shuffle(password)
        return ''.join(password)

    def save(self):
        data = self.cleaned_data
        username = self.generate_username()
        raw_password = self.generate_password()

        user = CustomUser.objects.create_user(
            username=username,
            full_name=data['full_name'],
            email=data['email'],
            phone_number=data['phone_number'],
            role=CustomUser.Role.FIELD_STAFF,
            is_active=True,
            password=raw_password,
        )

        profile = StaffProfile.objects.create(
            user=user,
            assigned_center=data['assigned_center'],
            profile_photo=data.get('profile_picture'),
            cnic=data['cnic'],
            date_of_birth=data['date_of_birth'],
            gender=data['gender'],
            address=data['address'],
            status=StaffProfile.Status.ACTIVE,
        )

        return user, profile, username, raw_password


class StaffEditForm(StaffCreationForm):
    def __init__(self, *args, **kwargs):
        self.staff_id = kwargs.pop('staff_id', None)
        self.user_id = kwargs.pop('user_id', None)
        super().__init__(*args, **kwargs)

    def clean_email(self):
        value = self.cleaned_data['email'].strip().lower()
        qs = CustomUser.objects.filter(email=value)
        if self.user_id:
            qs = qs.exclude(id=self.user_id)
        if qs.exists():
            raise ValidationError('This email is already registered.')
        return value

    def clean_phone_number(self):
        value = self.cleaned_data['phone_number'].strip()
        if not re.match(r'^03\d{9}$', value):
            raise ValidationError('Phone number must be a valid Pakistani number (03XXXXXXXXX).')
        qs = CustomUser.objects.filter(phone_number=value)
        if self.user_id:
            qs = qs.exclude(id=self.user_id)
        if qs.exists():
            raise ValidationError('This phone number is already registered.')
        return value

    def clean_cnic(self):
        value = self.cleaned_data['cnic'].strip()
        if not re.match(r'^\d{5}-\d{7}-\d{1}$', value):
            raise ValidationError('CNIC must be in format xxxxx-xxxxxxx-x.')
        qs = StaffProfile.objects.filter(cnic=value)
        if self.staff_id:
            qs = qs.exclude(id=self.staff_id)
        if qs.exists():
            raise ValidationError('This CNIC is already registered.')
        return value

    def save(self):
        data = self.cleaned_data
        user = CustomUser.objects.get(id=self.user_id)
        user.full_name = data['full_name']
        user.email = data['email']
        user.phone_number = data['phone_number']
        user.save()

        profile = StaffProfile.objects.get(id=self.staff_id)
        profile.assigned_center = data['assigned_center']
        if data.get('profile_picture'):
            if profile.profile_photo:
                profile.profile_photo.delete(save=False)
            profile.profile_photo = data['profile_picture']
        profile.cnic = data['cnic']
        profile.date_of_birth = data['date_of_birth']
        profile.age = data.get('age')
        profile.gender = data['gender']
        profile.address = data['address']
        profile.save()

        return user, profile


class CenterForm(forms.Form):
    center_name = forms.CharField(
        max_length=255,
        min_length=3,
        error_messages={
            'required': 'Center name is required.',
            'min_length': 'Center name must be at least 3 characters.',
        }
    )
    complete_address = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 3}),
        min_length=10,
        error_messages={
            'required': 'Complete address is required.',
            'min_length': 'Address must be at least 10 characters.',
        }
    )
    city = forms.CharField(
        max_length=100,
        error_messages={'required': 'City is required.'}
    )
    district = forms.CharField(
        max_length=100,
        error_messages={'required': 'District is required.'}
    )
    assigned_teacher = forms.ModelChoiceField(
        queryset=StaffProfile.objects.filter(status=StaffProfile.Status.ACTIVE).select_related('user'),
        required=False,
        empty_label='-- Select Teacher --',
    )

    def __init__(self, *args, **kwargs):
        self.center_id = kwargs.pop('center_id', None)
        super().__init__(*args, **kwargs)

    def clean_center_name(self):
        value = self.cleaned_data['center_name'].strip()
        qs = Center.objects.filter(center_name__iexact=value)
        if self.center_id:
            qs = qs.exclude(id=self.center_id)
        if qs.exists():
            raise ValidationError('A center with this name already exists.')
        return value

    def clean_assigned_teacher(self):
        teacher = self.cleaned_data.get('assigned_teacher')
        if teacher:
            qs = Center.objects.filter(assigned_teacher=teacher)
            if self.center_id:
                qs = qs.exclude(id=self.center_id)
            if qs.exists():
                raise ValidationError('This teacher is already assigned to another center.')
        return teacher

    def save(self):
        data = self.cleaned_data
        teacher = data.get('assigned_teacher')
        is_active = teacher is not None
        status = Center.Status.ACTIVE if is_active else Center.Status.PENDING

        center = Center.objects.create(
            center_name=data['center_name'],
            complete_address=data['complete_address'],
            city=data['city'],
            district=data['district'],
            assigned_teacher=teacher,
            status=status,
        )
        return center

    def update(self, center_id):
        data = self.cleaned_data
        center = Center.objects.get(id=center_id)
        teacher = data.get('assigned_teacher')
        is_active = teacher is not None

        center.center_name = data['center_name']
        center.complete_address = data['complete_address']
        center.city = data['city']
        center.district = data['district']
        center.assigned_teacher = teacher
        center.status = Center.Status.ACTIVE if is_active else Center.Status.PENDING
        center.save()
        return center
