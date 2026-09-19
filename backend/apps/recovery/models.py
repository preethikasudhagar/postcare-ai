from django.db import models
from apps.patients.models import Patient, Doctor

class RecoveryCheckIn(models.Model):
    WOUND_CONDITIONS = [
        ('normal', 'Normal & Healing'),
        ('mild_redness', 'Mild Redness'),
        ('swelling', 'Moderate Swelling'),
        ('discharge', 'Fluid Discharge'),
        ('severe', 'Severe Concern')
    ]
    MED_ADHERENCE = [
        ('all', 'Took all prescribed doses'),
        ('some', 'Missed some doses'),
        ('none', 'Did not take medications')
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='recovery_checkins')
    date = models.DateField()
    pain_level = models.IntegerField()  # 0-10
    temperature = models.FloatField()   # Celsius
    wound_condition = models.CharField(max_length=20, choices=WOUND_CONDITIONS)
    symptoms = models.JSONField(default=list)
    medication_adherence = models.CharField(max_length=10, choices=MED_ADHERENCE)
    additional_notes = models.TextField(blank=True)
    recovery_score = models.FloatField(null=True, blank=True)  # 0-100
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recovery_checkins'
        ordering = ['-date', '-submitted_at']

    def calculate_score(self):
        score = 100 - (self.pain_level * 4)
        if self.temperature > 37.5:
            score -= 15
        if self.temperature > 38.2:
            score -= 25
        wound_penalties = {'normal': 0, 'mild_redness': 5, 'swelling': 15, 'discharge': 25, 'severe': 40}
        score -= wound_penalties.get(self.wound_condition, 0)
        med_penalties = {'all': 0, 'some': 10, 'none': 25}
        score -= med_penalties.get(self.medication_adherence, 0)
        symptom_count = len([s for s in self.symptoms if s != 'None of the above']) if isinstance(self.symptoms, list) else 0
        score -= symptom_count * 5
        self.recovery_score = max(10.0, min(100.0, float(score)))
        return self.recovery_score

class RiskPrediction(models.Model):
    RISK_LEVELS = [('low', 'Low Risk'), ('medium', 'Medium Risk'), ('high', 'High Risk')]

    checkin = models.OneToOneField(RecoveryCheckIn, on_delete=models.CASCADE, related_name='risk_prediction')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='risk_predictions')
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS)
    confidence = models.FloatField()
    contributing_factors = models.JSONField(default=dict)
    recommendation_category = models.CharField(max_length=100)
    doctor_review_notes = models.TextField(blank=True)
    is_reviewed = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(Doctor, on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    predicted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'risk_predictions'
        ordering = ['-predicted_at']
