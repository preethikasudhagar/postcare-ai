from django.db import models
from apps.patients.models import Patient, Doctor

class Medication(models.Model):
    STATUS = [('active', 'Active'), ('completed', 'Completed'), ('stopped', 'Stopped')]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='medications')
    prescribed_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    medicine_name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    duration_days = models.IntegerField(default=7)
    start_date = models.DateField(auto_now_add=True)
    instructions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='active')

    class Meta:
        db_table = 'medications'

class MedicationLog(models.Model):
    STATUS = [('taken', 'Taken'), ('missed', 'Missed'), ('pending', 'Pending')]

    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    logged_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medication_logs'
        unique_together = ['medication', 'date']
