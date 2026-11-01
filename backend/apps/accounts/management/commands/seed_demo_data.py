import os
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import User
from apps.patients.models import Department, Doctor, Nurse, Patient, Caregiver
from apps.discharge.models import DischargePlan, DischargeMedication, DischargeFollowUp
from apps.medications.models import Medication, MedicationLog
from apps.recovery.models import RecoveryCheckIn, RiskPrediction
from apps.followups.models import FollowUp
from apps.notifications.models import Notification

class Command(BaseCommand):
    help = 'Idempotently seeds database with 50 Patients, 12 Doctors, 15 Caregivers, and full clinical dataset'

    def add_arguments(self, parser):
        parser.add_argument('--force-refresh', action='store_true', help='Update existing demo records with fresh dates')

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== PostCare AI: Seeding Realistic Clinical Dataset ==="))

        today = timezone.now().date()

        # ------------------------------------------------------------------
        # 1. Departments (8 Core Specialties)
        # ------------------------------------------------------------------
        dept_defs = [
            ('Orthopedic Surgery', 'Joint replacements, arthroscopy, and musculoskeletal reconstruction'),
            ('Cardiology', 'Interventional cardiology, heart failure, and cardiovascular medicine'),
            ('General Surgery', 'Abdominal, laparoscopic, GI, and minimally invasive procedures'),
            ('Neurosurgery', 'Spine surgery, cranial decompressions, and neurological interventions'),
            ('Cardiothoracic Surgery', 'Cardiac bypass (CABG), valvular replacements, and thoracic surgeries'),
            ('Urology', 'Endourology, stone management, prostatectomies, and renal procedures'),
            ('Gynecology', 'Obstetrics, hysterectomies, pelvic reconstructions, and maternal care'),
            ('Oncology', 'Surgical oncology, tumor resections, and multidisciplinary cancer care'),
        ]

        departments = {}
        for name, desc in dept_defs:
            dept = Department.objects.filter(name=name).first()
            if not dept:
                dept = Department.objects.create(name=name, description=desc)
            departments[name] = dept
        self.stdout.write(f"  [OK] {len(departments)} Departments verified.")

        # ------------------------------------------------------------------
        # 2. 12 Doctors across all 8 Specialties
        # ------------------------------------------------------------------
        doctor_defs = [
            ('doctor@postcare.demo', 'Rajesh', 'Varma', '+91 98765 43212', 'MCI-748291-K', 'Orthopedic Surgery', 'Orthopedic & Joint Arthroplasty'),
            ('dr.sen@postcare.demo', 'Ananya', 'Sen', '+91 98765 43220', 'MCI-882103-B', 'Cardiology', 'Interventional Cardiology & Electrophysiology'),
            ('dr.rathore@postcare.demo', 'Vikramaditya', 'Rathore', '+91 98765 43221', 'MCI-554219-C', 'General Surgery', 'Advanced Laparoscopic & Gastrointestinal Surgery'),
            ('dr.deshpande@postcare.demo', 'Sunita', 'Deshpande', '+91 98765 43222', 'MCI-339102-D', 'Neurosurgery', 'Complex Spine & Minimally Invasive Neurosurgery'),
            ('dr.swaminathan@postcare.demo', 'Arvind', 'Swaminathan', '+91 98765 43223', 'MCI-994120-E', 'Cardiothoracic Surgery', 'Adult Cardiac Bypass (CABG) & Valve Repair'),
            ('dr.nambiar@postcare.demo', 'Meera', 'Nambiar', '+91 98765 43224', 'MCI-441209-F', 'Urology', 'Endourology & Robotic Uro-Oncology'),
            ('dr.akhtar@postcare.demo', 'Farhan', 'Akhtar', '+91 98765 43225', 'MCI-665190-G', 'Gynecology', 'Minimally Invasive Gynecological Surgery & Pelvic Floor'),
            ('dr.krishnan@postcare.demo', 'Deepa', 'Krishnan', '+91 98765 43226', 'MCI-228491-H', 'Oncology', 'Surgical Oncology & Breast Reconstruction'),
            ('dr.kulkarni@postcare.demo', 'Rohan', 'Kulkarni', '+91 98765 43227', 'MCI-773124-J', 'Orthopedic Surgery', 'Sports Medicine & Arthroscopic Reconstruction'),
            ('dr.mukherjee@postcare.demo', 'Shalini', 'Mukherjee', '+91 98765 43228', 'MCI-119482-L', 'Cardiology', 'Clinical Cardiology & Heart Failure Care'),
            ('dr.ghosh@postcare.demo', 'Amitav', 'Ghosh', '+91 98765 43229', 'MCI-660231-M', 'General Surgery', 'Trauma, Hernia, and Colorectal Surgery'),
            ('dr.singhania@postcare.demo', 'Preeti', 'Singhania', '+91 98765 43230', 'MCI-881923-N', 'Neurosurgery', 'Cerebrovascular & Skull Base Neurosurgery'),
        ]

        doctors = []
        for email, fn, ln, phone, lic, d_name, spec in doctor_defs:
            u = User.objects.filter(email=email).first()
            if not u:
                u = User.objects.filter(username=email).first()
            if not u:
                u = User.objects.create(
                    email=email,
                    username=email,
                    first_name=fn,
                    last_name=ln,
                    role='doctor',
                    phone=phone
                )
                u.set_password('Doctor@123')
                u.save()
            else:
                if u.role != 'doctor':
                    u.role = 'doctor'
                    u.save()

            dept = departments.get(d_name)
            doc_prof = Doctor.objects.filter(user=u).first()
            if not doc_prof:
                doc_prof = Doctor.objects.create(
                    user=u,
                    department=dept,
                    specialization=spec,
                    license_number=lic,
                    approval_status='approved'
                )
            else:
                doc_prof.approval_status = 'approved'
                if dept:
                    doc_prof.department = dept
                doc_prof.specialization = spec
                doc_prof.save()

            doctors.append(doc_prof)
        self.stdout.write(f"  [OK] {len(doctors)} Active Approved Doctors verified.")

        # Ensure demo nurse exists
        nurse_user = User.objects.filter(email='nurse1@postcare.demo').first()
        if not nurse_user:
            nurse_user = User.objects.create(
                email='nurse1@postcare.demo',
                username='nurse1@postcare.demo',
                first_name='Priya',
                last_name='Nair',
                role='nurse',
                phone='+91 98765 43213'
            )
            nurse_user.set_password('Nurse@123')
            nurse_user.save()
        nurse_profile = Nurse.objects.filter(user=nurse_user).first()
        if not nurse_profile:
            nurse_profile = Nurse.objects.create(
                user=nurse_user,
                department=departments['Orthopedic Surgery'],
                license_number='KNC-84920-A'
            )

        # ------------------------------------------------------------------
        # 3. 15 Caregivers
        # ------------------------------------------------------------------
        caregiver_defs = [
            ('caregiver@postcare.demo', 'Sunita', 'Kumar', '+91 98765 43211', 'Spouse'),
            ('caregiver.02@postcare.demo', 'Ramesh', 'Sharma', '+91 98765 43241', 'Son'),
            ('caregiver.03@postcare.demo', 'Priya', 'Patel', '+91 98765 43242', 'Daughter'),
            ('caregiver.04@postcare.demo', 'Kavita', 'Joshi', '+91 98765 43243', 'Mother'),
            ('caregiver.05@postcare.demo', 'Anand', 'Verma', '+91 98765 43244', 'Brother'),
            ('caregiver.06@postcare.demo', 'Lakshmi', 'Iyer', '+91 98765 43245', 'Sister'),
            ('caregiver.07@postcare.demo', 'Suresh', 'Nair', '+91 98765 43246', 'Spouse'),
            ('caregiver.08@postcare.demo', 'Neha', 'Gupta', '+91 98765 43247', 'Daughter'),
            ('caregiver.09@postcare.demo', 'Rajesh', 'Kulkarni', '+91 98765 43248', 'Son'),
            ('caregiver.10@postcare.demo', 'Sneha', 'Reddy', '+91 98765 43249', 'Sister'),
            ('caregiver.11@postcare.demo', 'Amit', 'Rao', '+91 98765 43250', 'Brother'),
            ('caregiver.12@postcare.demo', 'Pooja', 'Mehta', '+91 98765 43251', 'Spouse'),
            ('caregiver.13@postcare.demo', 'Manoj', 'Tiwari', '+91 98765 43252', 'Son'),
            ('caregiver.14@postcare.demo', 'Rekha', 'Pillai', '+91 98765 43253', 'Mother'),
            ('caregiver.15@postcare.demo', 'Sanjay', 'Hegde', '+91 98765 43254', 'Professional Caregiver'),
        ]

        caregivers = []
        for email, fn, ln, phone, rel in caregiver_defs:
            u = User.objects.filter(email=email).first()
            if not u:
                u = User.objects.filter(username=email).first()
            if not u:
                u = User.objects.create(
                    email=email,
                    username=email,
                    first_name=fn,
                    last_name=ln,
                    role='caregiver',
                    phone=phone
                )
                u.set_password('Caregiver@123')
                u.save()
            else:
                if u.role != 'caregiver':
                    u.role = 'caregiver'
                    u.save()

            cg_prof = Caregiver.objects.filter(user=u).first()
            if not cg_prof:
                cg_prof = Caregiver.objects.create(user=u, relationship=rel)
            caregivers.append(cg_prof)
        self.stdout.write(f"  [OK] {len(caregivers)} Caregivers verified.")

        # ------------------------------------------------------------------
        # 4. 50 Patients
        # ------------------------------------------------------------------
        patient_specs = [
            # 1 (Primary Demo)
            ('patient@postcare.demo', 'P-2026-8941', 'Rahul', 'Kumar', 54, 'M', 'O+', 'Total Knee Arthroplasty (L)', 0, 14, 12, 'Severe Grade IV Tricompartmental Osteoarthritis'),
            # 2..50
            ('patient.02@postcare.demo', 'P-2026-0002', 'Anita', 'Roy', 62, 'F', 'B+', 'Coronary Artery Bypass Graft (CABG)', 1, 16, 11, 'Triple vessel coronary artery disease (TVCAD) with preserved EF'),
            ('patient.03@postcare.demo', 'P-2026-0003', 'Vikram', 'Mehta', 45, 'M', 'A+', 'Laparoscopic Cholecystectomy', 2, 7, 5, 'Symptomatic cholelithiasis with recurrent biliary colic'),
            ('patient.04@postcare.demo', 'P-2026-0004', 'Sangeeta', 'Das', 38, 'F', 'AB+', 'Lumbar Microdiscectomy', 3, 10, 8, 'L4-L5 left paracentral disc herniation with severe radiculopathy'),
            ('patient.05@postcare.demo', 'P-2026-0005', 'Anil', 'Sengupta', 68, 'M', 'O-', 'Aortic Valve Replacement (AVR)', 4, 18, 12, 'Critical calcific aortic stenosis with syncope episodes'),
            ('patient.06@postcare.demo', 'P-2026-0006', 'Meena', 'Patel', 51, 'F', 'B-', 'Percutaneous Nephrolithotomy (PCNL)', 5, 8, 6, 'Right staghorn renal calculus (2.8 cm) causing hydronephrosis'),
            ('patient.07@postcare.demo', 'P-2026-0007', 'Kavita', 'Menon', 43, 'F', 'A-', 'Total Abdominal Hysterectomy', 6, 9, 6, 'Multiple large symptomatic uterine leiomyomas with menorrhagia'),
            ('patient.08@postcare.demo', 'P-2026-0008', 'Sunita', 'Rao', 57, 'F', 'O+', 'Modified Radical Mastectomy', 7, 12, 9, 'Infiltrating ductal carcinoma (Right breast, T2N1M0) ER+/PR+'),
            ('patient.09@postcare.demo', 'P-2026-0009', 'Sanjay', 'Deshmukh', 29, 'M', 'B+', 'Anterior Cruciate Ligament (ACL) Reconstruction', 8, 6, 4, 'Complete ACL tear (Right) with medial meniscus posterior horn bucket-handle tear'),
            ('patient.10@postcare.demo', 'P-2026-0010', 'Deepa', 'Krishnan', 65, 'F', 'A+', 'Off-Pump Coronary Artery Bypass (OPCAB)', 9, 15, 10, 'Double vessel coronary disease (LAD + RCA) with proximal critical stenosis'),
            ('patient.11@postcare.demo', 'P-2026-0011', 'Devendra', 'Joshi', 49, 'M', 'AB-', 'Inguinal Hernia Repair (Mesh)', 10, 5, 3, 'Right indirect reducible inguinal hernia with chronic groin discomfort'),
            ('patient.12@postcare.demo', 'P-2026-0012', 'Aruna', 'Nair', 58, 'F', 'O+', 'Cervical Spine Fusion (ACDF)', 11, 11, 8, 'C5-C6 cervical disc degenerative stenosis with progressive myelopathy'),
            ('patient.13@postcare.demo', 'P-2026-0013', 'Girish', 'Babu', 71, 'M', 'B+', 'Transurethral Resection of Prostate (TURP)', 5, 6, 4, 'Benign prostatic hyperplasia (BPH) with recurrent urinary retention'),
            ('patient.14@postcare.demo', 'P-2026-0014', 'Radhika', 'Sharma', 48, 'F', 'A+', 'Total Hip Arthroplasty (R)', 0, 13, 10, 'Avascular necrosis of right femoral head (Ficat Stage IV)'),
            ('patient.15@postcare.demo', 'P-2026-0015', 'Karthik', 'Raman', 34, 'M', 'O+', 'Laparoscopic Appendectomy', 2, 4, 3, 'Acute suppurative appendicitis with localized peritonitis'),
            ('patient.16@postcare.demo', 'P-2026-0016', 'Pooja', 'Chopra', 31, 'F', 'B+', 'Ovarian Cystectomy', 6, 5, 3, 'Right ovarian dermoid cyst (7 cm) with intermittent torsion symptoms'),
            ('patient.17@postcare.demo', 'P-2026-0017', 'Harish', 'Venkatesh', 64, 'M', 'A-', 'Robotic Partial Nephrectomy', 5, 11, 8, 'Left renal lower pole mass (cT1a, 3.2 cm clear cell RCC)'),
            ('patient.18@postcare.demo', 'P-2026-0018', 'Swati', 'Desai', 53, 'F', 'O+', 'Thyroidectomy (Total)', 7, 7, 5, 'Papillary thyroid carcinoma (Bethesda Category VI, 2.4 cm)'),
            ('patient.19@postcare.demo', 'P-2026-0019', 'Naveen', 'Chandra', 59, 'M', 'B-', 'Mitral Valve Repair', 4, 17, 12, 'Severe degenerative mitral regurgitation with P2 prolapse'),
            ('patient.20@postcare.demo', 'P-2026-0020', 'Bhavna', 'Shah', 46, 'F', 'AB+', 'Colon Resection & Anastomosis', 2, 14, 9, 'Sigmoid colon diverticular stricture with recurrent diverticulitis'),
            ('patient.21@postcare.demo', 'P-2026-0021', 'Ravi', 'Shankar', 39, 'M', 'O+', 'Rotator Cuff Repair', 8, 9, 6, 'Full-thickness supraspinatus tendon tear (Right) from traumatic strain'),
            ('patient.22@postcare.demo', 'P-2026-0022', 'Indira', 'Subramaniam', 74, 'F', 'A+', 'Femoral Shaft ORIF', 0, 15, 11, 'Closed displaced fracture of left femoral shaft following slip at home'),
            ('patient.23@postcare.demo', 'P-2026-0023', 'Manish', 'Khurana', 56, 'M', 'B+', 'Endovascular Aortic Aneurysm Repair (EVAR)', 1, 10, 7, 'Infrarenal abdominal aortic aneurysm (5.6 cm diameter)'),
            ('patient.24@postcare.demo', 'P-2026-0024', 'Lalitha', 'Hegde', 60, 'F', 'O-', 'Laparoscopic Ventral Hernia Repair', 10, 8, 5, 'Recurrent incisional hernia with omental incarceration'),
            ('patient.25@postcare.demo', 'P-2026-0025', 'Prakash', 'Gowda', 67, 'M', 'A+', 'Spinal Decompression & Fusion L4-S1', 3, 14, 10, 'Grade II L4-L5 degenerative spondylolisthesis with neurogenic claudication'),
            ('patient.26@postcare.demo', 'P-2026-0026', 'Meera', 'Ranganathan', 37, 'F', 'B+', 'Myomectomy (Uterine Fibroids)', 6, 7, 4, 'Symptomatic intramural uterine fibroid (8 cm) preserving fertility'),
            ('patient.27@postcare.demo', 'P-2026-0027', 'Ajay', 'Malhotra', 52, 'M', 'O+', 'Ureteroscopy & Stone Extraction', 5, 4, 2, 'Impacted left proximal ureteral calculus (9 mm) with renal colic'),
            ('patient.28@postcare.demo', 'P-2026-0028', 'Tanuja', 'Chatterjee', 49, 'F', 'AB+', 'Sentinel Lymph Node Dissection', 7, 8, 5, 'Early-stage left breast carcinoma post-lumpectomy axillary staging'),
            ('patient.29@postcare.demo', 'P-2026-0029', 'Ashok', 'Trivedi', 70, 'M', 'A-', 'Carotid Endarterectomy (CEA)', 4, 11, 7, 'High-grade right internal carotid artery stenosis (85%) with TIA history'),
            ('patient.30@postcare.demo', 'P-2026-0030', 'Rashmi', 'Kulkarni', 44, 'F', 'B+', 'Laparoscopic Sleeve Gastrectomy', 2, 6, 4, 'Class III severe obesity (BMI 42.4) with metabolic syndrome'),
            ('patient.31@postcare.demo', 'P-2026-0031', 'Gopal', 'Naidu', 63, 'M', 'O+', 'Radical Prostatectomy', 5, 13, 9, 'Localized adenocarcinoma of the prostate (Gleason 3+4, PSA 8.2)'),
            ('patient.32@postcare.demo', 'P-2026-0032', 'Shweta', 'Agarwal', 33, 'F', 'A+', 'Carpal Tunnel Release', 8, 3, 2, 'Severe chronic bilateral carpal tunnel syndrome unresponsive to splints'),
            ('patient.33@postcare.demo', 'P-2026-0033', 'Vipin', 'Rawat', 50, 'M', 'B-', 'Video-Assisted Thoracoscopic Surgery (VATS)', 4, 9, 6, 'Right solitary pulmonary nodule wedge resection for biopsy'),
            ('patient.34@postcare.demo', 'P-2026-0034', 'Nandini', 'Prasad', 69, 'F', 'O+', 'Shoulder Hemiarthroplasty', 0, 16, 12, 'Comminuted four-part proximal humerus fracture (Right)'),
            ('patient.35@postcare.demo', 'P-2026-0035', 'Chetan', 'Bhagat', 47, 'M', 'A+', 'Craniotomy for Subdural Hematoma', 11, 18, 13, 'Chronic left frontoparietal subdural hematoma with mass effect'),
            ('patient.36@postcare.demo', 'P-2026-0036', 'Anupama', 'Dhar', 55, 'F', 'B+', 'Laparoscopic Splenectomy', 10, 8, 5, 'Immune thrombocytopenic purpura (ITP) refractory to medical therapy'),
            ('patient.37@postcare.demo', 'P-2026-0037', 'Mahesh', 'Bhatt', 61, 'M', 'O-', 'Microvascular Decompression', 3, 12, 8, 'Refractory right trigeminal neuralgia with V2/V3 nerve root compression'),
            ('patient.38@postcare.demo', 'P-2026-0038', 'Kalyani', 'Sundaram', 42, 'F', 'AB+', 'Bilateral Salpingo-Oophorectomy', 6, 6, 4, 'Risk-reducing prophylactic salpingo-oophorectomy in BRCA1 carrier'),
            ('patient.39@postcare.demo', 'P-2026-0039', 'Subhash', 'Kapoor', 72, 'M', 'A+', 'Bladder Tumor Resection (TURBT)', 5, 5, 3, 'Non-muscle invasive urothelial carcinoma of bladder (TaG2)'),
            ('patient.40@postcare.demo', 'P-2026-0040', 'Geeta', 'Srivastava', 58, 'F', 'B+', 'Wide Local Excision for Melanoma', 7, 7, 5, 'Cutaneous malignant melanoma (Breslow depth 1.4 mm, Left arm)'),
            ('patient.41@postcare.demo', 'P-2026-0041', 'Dinesh', 'Karthik', 26, 'M', 'O+', 'Meniscectomy & Cartilage Repair', 8, 4, 3, 'Complex tear of lateral meniscus with chondral defect (Right knee)'),
            ('patient.42@postcare.demo', 'P-2026-0042', 'Usha', 'Bhandari', 66, 'F', 'A-', 'Ankle Fracture ORIF', 0, 10, 7, 'Unstable trimalleolar fracture of right ankle with syndesmotic disruption'),
            ('patient.43@postcare.demo', 'P-2026-0043', 'Vijay', 'Mallya', 59, 'M', 'B+', 'Peripheral Vascular Bypass', 1, 14, 9, 'Critical left limb ischemia due to superficial femoral artery occlusion'),
            ('patient.44@postcare.demo', 'P-2026-0044', 'Padma', 'Lakshmi', 45, 'F', 'O+', 'Pelvic Floor Reconstruction', 6, 8, 5, 'Grade III uterine and anterior vaginal wall prolapse'),
            ('patient.45@postcare.demo', 'P-2026-0045', 'Rameshwar', 'Singh', 68, 'M', 'AB-', 'Shock Wave Lithotripsy (ESWL)', 5, 3, 2, 'Right renal pelvic calculus (12 mm) causing recurrent hematuria'),
            ('patient.46@postcare.demo', 'P-2026-0046', 'Vidya', 'Balan', 51, 'F', 'A+', 'Laparoscopic Adrenalectomy', 10, 7, 4, 'Functional left adrenal cortical adenoma (Conn syndrome)'),
            ('patient.47@postcare.demo', 'P-2026-0047', 'Naresh', 'Goyal', 65, 'M', 'B+', 'Coronary Angioplasty & Stenting (PTCA)', 9, 5, 3, 'Post-infarction angina with culprit subtotal stenosis in LAD'),
            ('patient.48@postcare.demo', 'P-2026-0048', 'Smriti', 'Irani', 40, 'F', 'O+', 'Pituitary Adenoma Resection (Endoscopic)', 11, 13, 9, 'Non-functioning pituitary macroadenoma with optic chiasm abutment'),
            ('patient.49@postcare.demo', 'P-2026-0049', 'Jagdish', 'Khattar', 73, 'M', 'A+', 'Mediastinal Mass Excision', 4, 15, 10, 'Anterior mediastinal thymoma (Masaoka Stage I, 5 cm)'),
            ('patient.50@postcare.demo', 'P-2026-0050', 'Renuka', 'Chowdhury', 57, 'F', 'B-', 'Lumpectomy & Sentinel Node Biopsy', 7, 6, 4, 'Left breast upper outer quadrant invasive ductal carcinoma (1.8 cm)'),
        ]

        patients = []
        for idx, (email, uhid, fn, ln, age, gender, bg, surg, doc_idx, surg_days_ago, disch_days_ago, diag) in enumerate(patient_specs):
            u = User.objects.filter(email=email).first()
            if not u:
                u = User.objects.filter(username=email).first()
            if not u:
                u = User.objects.create(
                    email=email,
                    username=email,
                    first_name=fn,
                    last_name=ln,
                    role='patient',
                    phone=f"+91 98765 {43260 + idx}"
                )
                u.set_password('Patient@123')
                u.save()

            doc = doctors[doc_idx % len(doctors)]
            dob = today - timedelta(days=age * 365 + 45)
            surg_date = today - timedelta(days=surg_days_ago)
            disch_date = today - timedelta(days=disch_days_ago)
            mon_end = today + timedelta(days=20)

            p = Patient.objects.filter(patient_id=uhid).first()
            if not p:
                p = Patient.objects.filter(user=u).first()
            if not p:
                p = Patient.objects.create(
                    patient_id=uhid,
                    user=u,
                    date_of_birth=dob,
                    gender=gender,
                    blood_group=bg,
                    address=f"Apartment {101 + idx}, PostCare Residency, Ward {idx % 8 + 1}, Bengaluru",
                    emergency_contact_name=f"Family Contact of {fn}",
                    emergency_contact_phone=f"+91 98765 {43300 + idx}",
                    emergency_contact_relation='Relative',
                    surgery_type=surg,
                    surgery_date=surg_date,
                    discharge_date=disch_date,
                    monitoring_end_date=mon_end,
                    primary_doctor=doc,
                    is_active=True,
                )
            else:
                p.primary_doctor = doc
                p.surgery_type = surg
                p.surgery_date = surg_date
                p.discharge_date = disch_date
                p.monitoring_end_date = mon_end
                p.is_active = True
                p.save()

            # Assign caregiver for first 15 patients
            if idx < len(caregivers):
                cg = caregivers[idx]
                cg.patient = p
                cg.save()

            patients.append((p, diag, surg_days_ago, disch_days_ago))

        self.stdout.write(f"  [OK] {len(patients)} Patients verified and linked.")

        # ------------------------------------------------------------------
        # 5. Discharge Plans for all 50 Patients
        # ------------------------------------------------------------------
        for p, diag, surg_days_ago, disch_days_ago in patients:
            plan = DischargePlan.objects.filter(patient=p).first()
            if not plan:
                plan = DischargePlan.objects.create(
                    patient=p,
                    doctor=p.primary_doctor,
                    surgery_type=p.surgery_type,
                    surgery_date=p.surgery_date,
                    discharge_date=p.discharge_date,
                    diagnosis=diag,
                    wound_care_instructions='Keep the surgical incision dry and clean. Inspect daily for redness or excessive exudate. Report temperature over 38.0°C.',
                    activity_restrictions='Avoid strenuous weight-bearing activities for 3 weeks. Short walking periods encouraged with assistive devices if prescribed.',
                    diet_instructions='High-protein, fiber-rich balanced hydration diet to promote rapid tissue recovery and normal bowel motility.',
                    general_instructions='Take prescribed medications strictly on schedule. Attend scheduled clinical follow-up consultations.',
                    status='published',
                    version=1.0,
                    published_at=timezone.now() - timedelta(days=disch_days_ago),
                )

            # Ensure at least 2 discharge medications
            dm1 = DischargeMedication.objects.filter(discharge_plan=plan, medicine_name='Cefuroxime Axetil').first()
            if not dm1:
                DischargeMedication.objects.create(
                    discharge_plan=plan,
                    medicine_name='Cefuroxime Axetil',
                    dosage='500 mg',
                    frequency='Twice daily',
                    duration_days=5,
                    instructions='Take post meals'
                )

            dm2 = DischargeMedication.objects.filter(discharge_plan=plan, medicine_name='Paracetamol').first()
            if not dm2:
                DischargeMedication.objects.create(
                    discharge_plan=plan,
                    medicine_name='Paracetamol',
                    dosage='650 mg',
                    frequency='Every 8 hours as needed',
                    duration_days=7,
                    instructions='For mild to moderate pain'
                )

        self.stdout.write(f"  [OK] 50 Discharge Plans with medications verified.")

        # ------------------------------------------------------------------
        # 6. Active Medications & Medication Logs
        # ------------------------------------------------------------------
        for p, _, _, _ in patients:
            m1 = Medication.objects.filter(patient=p, medicine_name='Cefuroxime Axetil 500mg').first()
            if not m1:
                m1 = Medication.objects.create(
                    patient=p,
                    medicine_name='Cefuroxime Axetil 500mg',
                    dosage='500 mg',
                    frequency='Twice daily',
                    duration_days=7,
                    instructions='After meals',
                    status='completed',
                    prescribed_by=p.primary_doctor
                )

            m2 = Medication.objects.filter(patient=p, medicine_name='Paracetamol 650mg').first()
            if not m2:
                m2 = Medication.objects.create(
                    patient=p,
                    medicine_name='Paracetamol 650mg',
                    dosage='650 mg',
                    frequency='Every 8 hours as needed',
                    duration_days=10,
                    instructions='Post meals for pain relief',
                    status='active',
                    prescribed_by=p.primary_doctor
                )

            m3 = Medication.objects.filter(patient=p, medicine_name='Pantoprazole 40mg').first()
            if not m3:
                m3 = Medication.objects.create(
                    patient=p,
                    medicine_name='Pantoprazole 40mg',
                    dosage='40 mg',
                    frequency='Once daily before breakfast',
                    duration_days=14,
                    instructions='Empty stomach gastroprotection',
                    status='active',
                    prescribed_by=p.primary_doctor
                )

            # Generate last 3 days of logs for medication adherence telemetry
            for m in [m2, m3]:
                for day_offset in range(3):
                    log_date = today - timedelta(days=day_offset)
                    status_choice = 'taken' if (abs(hash(p.patient_id + str(day_offset))) % 10) != 0 else 'missed'
                    log_item = MedicationLog.objects.filter(medication=m, date=log_date).first()
                    if not log_item:
                        MedicationLog.objects.create(medication=m, date=log_date, status=status_choice)

        self.stdout.write("  [OK] Active medications and adherence logs generated.")

        # ------------------------------------------------------------------
        # 7. Daily Recovery Check-Ins & Risk Predictions (Historical & Realistic)
        # ------------------------------------------------------------------
        high_risk_indices = {2, 4, 7, 21}
        med_risk_indices = {5, 8, 12, 16, 24, 28, 32, 36, 42, 46}

        checkin_count = 0
        prediction_count = 0

        for idx, (p, diag, surg_days_ago, disch_days_ago) in enumerate(patients):
            days_tracked = min(14, max(3, disch_days_ago + 1))
            is_high = idx in high_risk_indices
            is_med = idx in med_risk_indices

            for day_idx in range(days_tracked):
                c_date = today - timedelta(days=(days_tracked - 1 - day_idx))
                progress_factor = day_idx / max(1, days_tracked - 1)

                if is_high:
                    pain = max(6, int(8 - progress_factor * 1))
                    temp = 38.2 if day_idx >= (days_tracked - 2) else 37.6
                    wound = 'discharge' if day_idx == (days_tracked - 1) else 'swelling'
                    symptoms = ['Fever / Chills', 'Excessive Pain']
                    adherence = 'some'
                    risk_cat = 'high'
                    conf = 0.94
                elif is_med:
                    pain = max(4, int(6 - progress_factor * 2))
                    temp = 37.2
                    wound = 'mild_redness' if day_idx < (days_tracked // 2) else 'normal'
                    symptoms = ['Mild Dizziness'] if day_idx == 0 else []
                    adherence = 'all'
                    risk_cat = 'medium'
                    conf = 0.89
                else:
                    pain = max(1, int(4 - progress_factor * 3))
                    temp = 36.6
                    wound = 'normal'
                    symptoms = []
                    adherence = 'all'
                    risk_cat = 'low'
                    conf = 0.95

                checkin = RecoveryCheckIn.objects.filter(patient=p, date=c_date).first()
                if not checkin:
                    checkin = RecoveryCheckIn.objects.create(
                        patient=p,
                        date=c_date,
                        pain_level=pain,
                        temperature=temp,
                        wound_condition=wound,
                        symptoms=symptoms,
                        medication_adherence=adherence,
                        additional_notes='Daily self-reported vitals and post-op symptoms.',
                    )
                checkin.calculate_score()
                checkin.save()
                checkin_count += 1

                # Risk Prediction
                rp = RiskPrediction.objects.filter(checkin=checkin).first()
                if not rp:
                    RiskPrediction.objects.create(
                        checkin=checkin,
                        patient=p,
                        risk_level=risk_cat,
                        confidence=conf,
                        contributing_factors={
                            'Pain Index': f"{pain * 10}%",
                            'Temperature': f"{temp}°C",
                            'Wound Condition': wound
                        },
                        recommendation_category=(
                            'Urgent attending surgeon review required. Monitor temperature.' if risk_cat == 'high'
                            else 'Perform regular incision dressing and monitor pain.' if risk_cat == 'medium'
                            else 'Steady recovery trajectory. Continue standard post-op care.'
                        )
                    )
                prediction_count += 1

        self.stdout.write(f"  [OK] {checkin_count} Recovery Check-Ins & {prediction_count} Risk Predictions verified.")

        # ------------------------------------------------------------------
        # 8. Follow-Up Appointments (Upcoming & Completed)
        # ------------------------------------------------------------------
        fu_count = 0
        for idx, (p, _, _, _) in enumerate(patients):
            upcoming_date = today + timedelta(days=((idx % 12) + 3))
            fu_up = FollowUp.objects.filter(patient=p, appointment_date=upcoming_date).first()
            if not fu_up:
                FollowUp.objects.create(
                    patient=p,
                    appointment_date=upcoming_date,
                    appointment_time='10:30:00',
                    doctor=p.primary_doctor,
                    department=p.primary_doctor.department.name if p.primary_doctor and p.primary_doctor.department else 'Surgical Ward',
                    purpose='Post-Operative Recovery Review & Surgical Wound Evaluation',
                    status='upcoming',
                    notes='Bring previous discharge summary and medication compliance log.'
                )
            fu_count += 1

            if idx % 2 == 0:
                past_date = today - timedelta(days=((idx % 5) + 2))
                fu_past = FollowUp.objects.filter(patient=p, appointment_date=past_date).first()
                if not fu_past:
                    FollowUp.objects.create(
                        patient=p,
                        appointment_date=past_date,
                        appointment_time='11:15:00',
                        doctor=p.primary_doctor,
                        department=p.primary_doctor.department.name if p.primary_doctor and p.primary_doctor.department else 'Surgical Ward',
                        purpose='Post-Op Day 7 Suture / Staple Check',
                        status='completed',
                        notes='Incision clean. Good range of motion observed.'
                    )
                fu_count += 1

        self.stdout.write(f"  [OK] {fu_count} Follow-Up Appointments verified.")

        # ------------------------------------------------------------------
        # 9. Clinical Notifications & High-Risk Alerts
        # ------------------------------------------------------------------
        notif_count = 0
        for idx in high_risk_indices:
            p, _, _, _ = patients[idx]
            doc = p.primary_doctor
            if doc and doc.user:
                notif_title = f"CRITICAL ALERT: High Risk Detected for {p.user.get_full_name()}"
                notif_item = Notification.objects.filter(recipient=doc.user, title=notif_title).first()
                if not notif_item:
                    Notification.objects.create(
                        recipient=doc.user,
                        title=notif_title,
                        type='high_risk_alert',
                        message=f"Patient {p.user.get_full_name()} ({p.patient_id}) reported acute pain and temperature spike. Please review clinical telemetry.",
                        is_read=False,
                        related_patient=p
                    )
                notif_count += 1

        for idx in range(6):
            p, _, _, _ = patients[idx]
            fu = FollowUp.objects.filter(patient=p, status='upcoming').first()
            if fu and p.user:
                notif_title = f"Consultation Confirmed with {fu.doctor.user.get_full_name() if fu.doctor and fu.doctor.user else 'Doctor'}"
                notif_item = Notification.objects.filter(recipient=p.user, title=notif_title).first()
                if not notif_item:
                    Notification.objects.create(
                        recipient=p.user,
                        title=notif_title,
                        type='followup_reminder',
                        message=f"Your follow-up appointment is scheduled on {fu.appointment_date.strftime('%d %b %Y')} at {fu.appointment_time}.",
                        is_read=False,
                        related_patient=p
                    )
                notif_count += 1

        self.stdout.write(f"  [OK] {notif_count} Clinical Notifications & High-Risk Alerts verified.")

        self.stdout.write(self.style.SUCCESS(
            "\nSUCCESS: Production clinical dataset seeded idempotently with 50 Patients, 12 Doctors, 15 Caregivers, 8 Departments, 50 Discharge Plans, and multi-day telemetry!"
        ))
