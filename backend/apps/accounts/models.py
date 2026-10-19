from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLES = [
        ('patient', 'Patient'),
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('admin', 'Admin'),
        ('caregiver', 'Caregiver')
    ]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLES, default='patient')
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def save(self, *args, **kwargs):
        # Automatically align admin role with Django staff privileges
        if (self.is_staff or self.is_superuser) and self.role == 'patient':
            self.role = 'admin'
        if self.role == 'admin' and not self.is_staff:
            self.is_staff = True
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'users'

