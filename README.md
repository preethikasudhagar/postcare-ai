# PostCare AI
**Intelligent Post-Operative Patient Discharge Planning & AI Follow-Up Tracking Platform**

---

## 🏥 Project Overview
**PostCare AI** is an intelligent full-stack clinical SaaS web platform designed for post-operative recovery management. It bridges the gap between surgical discharge and outpatient recovery by enabling surgeons to author structured digital discharge plans, allowing patients to record daily biometrics, and leveraging a **Random Forest ML Classification Engine** to identify high-risk complications early.

> **Academic Healthcare Prototype Disclaimer:** This system is built as an academic software engineering prototype using synthetic demo data. Risk classifications are decision-support aids and do not constitute clinical diagnoses.

---

## 🛠 Technology Stack

### **Frontend**
- **Framework:** React 18 + Vite (JavaScript)
- **Styling & Tokens:** Tailwind CSS 3 (Custom clinical design system)
- **Charts & Data Visualization:** Recharts (Banded lines, donuts, bar comparators)
- **Icons:** Lucide React
- **HTTP Client:** Axios (JWT interceptors with silent refresh)
- **State & Routing:** React Context API + React Router v6 (Role-guarded routes)

### **Backend**
- **Web Framework:** Python 3.12 + Django 5.1
- **API Architecture:** Django REST Framework (DRF)
- **Authentication:** JSON Web Tokens (`djangorestframework-simplejwt`)
- **Database:** PostgreSQL 16 (Production/Docker) with SQLite fallback

### **Machine Learning**
- **Algorithm:** Random Forest Multi-Class Classifier (100 Decision Trees)
- **Libraries:** scikit-learn, NumPy, Pandas, Joblib
- **Evaluation:** 94.2% Accuracy, 93.9% Macro F1-Score

---

## 👥 Demo User Credentials

| Role | Email | Password | Primary Purpose |
|---|---|---|---|
| **Patient** | `patient@postcare.demo` | `Patient@123` | Log daily check-ins, view meds & discharge plan |
| **Doctor** | `doctor@postcare.demo` | `Doctor@123` | High-risk triage, author plans, inspect vitals |
| **Nurse** | `nurse1@postcare.demo` | `Nurse@123` | Patient triage, send reminders, escalate alerts |
| **Caregiver** | `caregiver@postcare.demo` | `Caregiver@123` | View loved one's recovery progression |
| **Admin** | `admin@postcare.demo` | `Admin@123` | Role provisioning, ML telemetry, architecture |

---

## 🚀 Quickstart & Setup Guide

### 1. Backend Setup & Database Seeding
```bash
# Navigate to backend directory
cd backend

# Activate Python virtualenv (or use uv)
.venv\Scripts\activate

# Run database migrations
python manage.py makemigrations
python manage.py migrate

# Train ML model and seed realistic patient history
python ../ml/train_model.py
python manage.py seed_data

# Start Django Development Server
python manage.py runserver 8000
```

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite Development Server
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 📊 ML Architecture & Methodology

```
Patient Check-in (Pain, Temp, Wound, Symptoms, Meds)
                     ↓
             Data Preprocessing
                     ↓
        Random Forest Multi-Class Classifier
                     ↓
   ┌─────────────────┬─────────────────┐
   ↓                 ↓                 ↓
Low Risk         Medium Risk       High Risk
(Score 80-100)  (Score 50-79)     (Score 0-49)
                     ↓
       Clinical Escalation Alert
```

---

## 📄 License & Academic Attribution
Developed as an academic software engineering and healthcare informatics project. © 2026 PostCare AI Team.
