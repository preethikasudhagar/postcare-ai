from django.core.management.base import BaseCommand
from datetime import date, timedelta
from django.utils import timezone
from apps.accounts.models import User
from apps.patients.models import Department, Doctor, Nurse, Patient, Caregiver
from apps.discharge.models import DischargePlan, DischargeMedication, DischargeFollowUp
from apps.medications.models import Medication, MedicationLog
from apps.recovery.models import RecoveryCheckIn, RiskPrediction
from apps.followups.models import FollowUp
from apps.notifications.models import Notification
from apps.messaging.models import Conversation, Message

class Command(BaseCommand):
    help = 'Seeds database with realistic synthetic post-operative healthcare data'

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding PostCare AI demo healthcare dataset...")

        # 1. Create Core Demo Users
        patient_user, _ = User.objects.get_or_create(
            email='patient@postcare.demo',
            defaults={'username': 'patient@postcare.demo', 'first_name': 'Rahul', 'last_name': 'Kumar', 'role': 'patient', 'phone': '+91 98765 43210'}
        )
        patient_user.set_password('Patient@123')
        patient_user.save()

        doctor_user, _ = User.objects.get_or_create(
            email='doctor@postcare.demo',
            defaults={'username': 'doctor@postcare.demo', 'first_name': 'Rajesh', 'last_name': 'Varma', 'role': 'doctor', 'phone': '+91 98765 43212'}
        )
        doctor_user.set_password('Doctor@123')
        doctor_user.save()

        nurse_user, _ = User.objects.get_or_create(
            email='nurse1@postcare.demo',
            defaults={'username': 'nurse1@postcare.demo', 'first_name': 'Priya', 'last_name': 'Nair', 'role': 'nurse', 'phone': '+91 98765 43213'}
        )
        nurse_user.set_password('Nurse@123')
        nurse_user.save()

        caregiver_user, _ = User.objects.get_or_create(
            email='caregiver@postcare.demo',
            defaults={'username': 'caregiver@postcare.demo', 'first_name': 'Sunita', 'last_name': 'Kumar', 'role': 'caregiver', 'phone': '+91 98765 43211'}
        )
        caregiver_user.set_password('Caregiver@123')
        caregiver_user.save()

        admin_user, _ = User.objects.get_or_create(
            email='admin@postcare.demo',
            defaults={'username': 'admin@postcare.demo', 'first_name': 'Hospital', 'last_name': 'Admin', 'role': 'admin', 'phone': '+91 98765 43214', 'is_staff': True, 'is_superuser': True}
        )
        admin_user.set_password('Admin@123')
        admin_user.save()

        # 2. Departments
        ortho_dept, _ = Department.objects.get_or_create(name='Orthopedic Surgery', defaults={'description': 'Joint replacements and musculoskeletal reconstructive procedures'})
        cardio_dept, _ = Department.objects.get_or_create(name='Cardiology & CTVS', defaults={'description': 'Cardiac bypass, valvular repairs, and vascular surgeries'})
        general_dept, _ = Department.objects.get_or_create(name='General Surgery', defaults={'description': 'Abdominal and minimally invasive laparoscopic procedures'})

        # 3. Doctor & Nurse Profiles
        doctor_profile, _ = Doctor.objects.get_or_create(
            user=doctor_user,
            defaults={'department': ortho_dept, 'specialization': 'Orthopedic & Joint Arthroplasty', 'license_number': 'MCI-748291-K'}
        )
        nurse_profile, _ = Nurse.objects.get_or_create(
            user=nurse_user,
            defaults={'department': ortho_dept, 'license_number': 'KNC-84920-A'}
        )

        # 4. Patient Profile
        patient_profile, _ = Patient.objects.get_or_create(
            user=patient_user,
            defaults={
                'patient_id': 'P-2026-8941',
                'date_of_birth': date(1972, 5, 14),
                'gender': 'M',
                'blood_group': 'O+',
                'address': 'Flat 402, Green Glen Heights, Bengaluru 560103',
                'emergency_contact_name': 'Sunita Kumar',
                'emergency_contact_phone': '+91 98765 43211',
                'emergency_contact_relation': 'Spouse',
                'surgery_type': 'Total Knee Arthroplasty (L)',
                'surgery_date': date.today() - timedelta(days=14),
                'discharge_date': date.today() - timedelta(days=12),
                'monitoring_end_date': date.today() + timedelta(days=16),
                'primary_doctor': doctor_profile
            }
        )
        patient_profile.assigned_nurses.add(nurse_profile)

        # 5. Caregiver Profile
        Caregiver.objects.get_or_create(
            user=caregiver_user,
            defaults={'patient': patient_profile, 'relationship': 'Spouse'}
        )

        # 6. Discharge Plan
        plan, _ = DischargePlan.objects.get_or_create(
            patient=patient_profile,
            defaults={
                'doctor': doctor_profile,
                'surgery_type': 'Total Knee Arthroplasty (L)',
                'surgery_date': date.today() - timedelta(days=14),
                'discharge_date': date.today() - timedelta(days=12),
                'diagnosis': 'Severe Grade IV Tricompartmental Osteoarthritis of left knee.',
                'wound_care_instructions': 'Keep incision site clean and dry. Report redness or weeping.',
                'activity_restrictions': 'Walker assisted ambulation. Perform home quad sets 3x daily.',
                'diet_instructions': 'High protein recovery diet with adequate hydration.',
                'status': 'published',
                'version': 1.2
            }
        )

        DischargeMedication.objects.get_or_create(
            discharge_plan=plan,
            medicine_name='Cefuroxime Axetil',
            defaults={'dosage': '500 mg', 'frequency': 'Twice daily', 'duration_days': 5, 'instructions': 'Take after food'}
        )
        DischargeMedication.objects.get_or_create(
            discharge_plan=plan,
            medicine_name='Paracetamol / Tramadol',
            defaults={'dosage': '325mg / 37.5mg', 'frequency': 'As needed', 'duration_days': 7, 'instructions': 'For pain'}
        )

        # 7. Active Medications
        med1, _ = Medication.objects.get_or_create(
            patient=patient_profile,
            medicine_name='Cefuroxime Axetil',
            defaults={'dosage': '500 mg', 'frequency': 'Twice daily', 'instructions': 'After meals', 'status': 'completed', 'prescribed_by': doctor_profile}
        )
        med2, _ = Medication.objects.get_or_create(
            patient=patient_profile,
            medicine_name='Enoxaparin Sodium (SubQ)',
            defaults={'dosage': '40 mg / 0.4 mL', 'frequency': 'Once daily at 8:00 PM', 'instructions': 'DVT prophylaxis', 'status': 'active', 'prescribed_by': doctor_profile}
        )

        # 8. 14 Days Check-In History
        scores = [85, 82, 80, 75, 70, 48, 65, 72, 78, 82, 85, 86, 88, 88]
        pains = [6, 5, 5, 6, 7, 8, 5, 4, 3, 2, 2, 1, 1, 1]
        temps = [36.8, 36.9, 37.0, 37.4, 37.6, 38.4, 37.3, 37.0, 36.8, 36.6, 36.5, 36.6, 36.5, 36.5]
        risks = ['low', 'low', 'low', 'medium', 'medium', 'high', 'medium', 'medium', 'low', 'low', 'low', 'low', 'low', 'low']

        for i in range(14):
            day_date = date.today() - timedelta(days=13 - i)
            checkin = RecoveryCheckIn.objects.filter(patient=patient_profile, date=day_date).first()
            if not checkin:
                checkin = RecoveryCheckIn.objects.create(
                    patient=patient_profile,
                    date=day_date,
                    pain_level=pains[i],
                    temperature=temps[i],
                    wound_condition='normal' if risks[i] == 'low' else 'swelling' if risks[i] == 'medium' else 'discharge',
                    symptoms=[] if risks[i] == 'low' else ['Fever / Chills', 'Excessive Pain'],
                    medication_adherence='all' if risks[i] == 'low' else 'some',
                    recovery_score=scores[i]
                )
            if not RiskPrediction.objects.filter(checkin=checkin).exists():
                RiskPrediction.objects.create(
                    checkin=checkin,
                    patient=patient_profile,
                    risk_level=risks[i],
                    confidence=0.94,
                    contributing_factors={'Pain': '30%', 'Wound': '25%', 'Temp': '20%'},
                    recommendation_category='Continue monitoring.'
                )

        # 9. Follow-Up
        FollowUp.objects.get_or_create(
            patient=patient_profile,
            appointment_date=date.today() + timedelta(days=5),
            defaults={
                'appointment_time': '10:30:00',
                'doctor': doctor_profile,
                'department': 'Orthopedic Surgery',
                'purpose': 'Staple Removal & Incision Review',
                'status': 'upcoming'
            }
        )

        # 10. Notifications for Multi-Role Clinical Workflow
        notifications_data = [
            # Doctor Notifications
            {
                'recipient': doctor_user,
                'title': 'CRITICAL ALERT: High Risk Detected for Rahul Sharma',
                'message': 'Daily assessment flagged fever elevation (38.4°C) and acute pain rating 8/10. Attending surgeon review requested.',
                'type': 'high_risk_alert',
                'related_patient': patient_profile,
                'is_read': False,
            },
            {
                'recipient': doctor_user,
                'title': 'Upcoming Consultation: Rahul Sharma',
                'message': 'Post-op review scheduled on 24 Sep @ 10:30 AM (Staple Removal & Incision Review).',
                'type': 'followup_reminder',
                'related_patient': patient_profile,
                'is_read': False,
            },
            {
                'recipient': doctor_user,
                'title': 'Recovery Assessment Logged',
                'message': 'Rahul Sharma submitted today’s recovery check-in. Recovery score computed: 88/100.',
                'type': 'checkin_reminder',
                'related_patient': patient_profile,
                'is_read': False,
            },
            {
                'recipient': doctor_user,
                'title': 'System: Weekly AI Model Retraining Complete',
                'message': 'Decision support pipeline validated with 94.2% accuracy across 2,000 synthetic clinical records.',
                'type': 'system',
                'related_patient': None,
                'is_read': True,
            },
            # Patient Notifications
            {
                'recipient': patient_user,
                'title': 'Evening Medication Reminder',
                'message': 'Time to take Enoxaparin Sodium 40mg (SubQ) as prescribed for DVT prophylaxis.',
                'type': 'medication_reminder',
                'related_patient': patient_profile,
                'is_read': False,
            },
            {
                'recipient': patient_user,
                'title': 'Daily Recovery Assessment Due',
                'message': 'Please complete your recovery check-in before 08:00 PM to inform your care team.',
                'type': 'checkin_reminder',
                'related_patient': patient_profile,
                'is_read': False,
            },
            {
                'recipient': patient_user,
                'title': 'Appointment Confirmed with Dr. Rajesh Varma',
                'message': 'Your follow-up visit on 24 Sep at 10:30 AM has been confirmed by the clinic.',
                'type': 'followup_reminder',
                'related_patient': patient_profile,
                'is_read': True,
            },
            # Nurse Notifications
            {
                'recipient': nurse_user,
                'title': 'High-Risk Alert Escalation: Rahul Sharma',
                'message': 'Attending physician notified. Monitor wound condition and report any drainage changes.',
                'type': 'high_risk_alert',
                'related_patient': patient_profile,
                'is_read': False,
            },
            {
                'recipient': nurse_user,
                'title': 'Daily Ward Round Medication Audit',
                'message': 'Adherence review required for 4 post-op patients in Orthopedic unit.',
                'type': 'medication_reminder',
                'related_patient': None,
                'is_read': False,
            },
            # Caregiver Notifications
            {
                'recipient': caregiver_user,
                'title': 'Caregiver Alert: Medication Due for Rahul',
                'message': 'Please ensure Rahul takes Cefuroxime Axetil 500mg after dinner.',
                'type': 'medication_reminder',
                'related_patient': patient_profile,
                'is_read': False,
            },
        ]

        for item in notifications_data:
            Notification.objects.get_or_create(
                recipient=item['recipient'],
                title=item['title'],
                defaults={
                    'message': item['message'],
                    'type': item['type'],
                    'related_patient': item['related_patient'],
                    'is_read': item['is_read'],
                }
            )

        self.stdout.write(self.style.SUCCESS("Database successfully seeded with realistic multi-role clinical dataset!"))
