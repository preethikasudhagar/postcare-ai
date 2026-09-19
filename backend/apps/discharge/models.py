from django.db import models
from apps.patients.models import Patient, Doctor

class DischargePlan(models.Model):
    STATUS = [('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='discharge_plans')
    doctor = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, related_name='discharge_plans')
    surgery_type = models.CharField(max_length=100)
    surgery_date = models.DateField()
    discharge_date = models.DateField()
    diagnosis = models.TextField()
    diet_instructions = models.TextField(blank=True)
    activity_restrictions = models.TextField(blank=True)
    wound_care_instructions = models.TextField(blank=True)
    general_instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='draft')
    version = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'discharge_plans'
        ordering = ['-updated_at']

class DischargeMedication(models.Model):
    discharge_plan = models.ForeignKey(DischargePlan, on_delete=models.CASCADE, related_name='medications')
    medicine_name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    duration_days = models.IntegerField(default=7)
    instructions = models.TextField(blank=True)

    class Meta:
        db_table = 'discharge_medications'

class DischargeFollowUp(models.Model):
    discharge_plan = models.ForeignKey(DischargePlan, on_delete=models.CASCADE, related_name='follow_ups')
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    department = models.CharField(max_length=100)
    purpose = models.TextField()

    class Meta:
        db_table = 'discharge_follow_ups'
