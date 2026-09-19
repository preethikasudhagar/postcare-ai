from django.db import models
from apps.accounts.models import User
from apps.patients.models import Patient

class Notification(models.Model):
    TYPES = [
        ('medication_reminder', 'Medication Reminder'),
        ('followup_reminder', 'Follow-up Reminder'),
        ('checkin_reminder', 'Check-in Reminder'),
        ('high_risk_alert', 'High Risk Alert'),
        ('appointment_update', 'Appointment Update'),
        ('system', 'System Notification')
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
