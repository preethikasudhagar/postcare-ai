from django.db import models
from apps.patients.models import Patient, Doctor

class FollowUp(models.Model):
    STATUS = [
        ('upcoming', 'Upcoming'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
        ('rescheduled', 'Rescheduled')
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='follow_ups')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True, related_name='follow_ups')
    department = models.CharField(max_length=100)
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    purpose = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS, default='upcoming')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'follow_ups'
        ordering = ['appointment_date', 'appointment_time']
