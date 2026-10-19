# PostCare AI
**Intelligent Post-Operative Patient Discharge Planning & AI Follow-Up Tracking Platform**

---

## 🏥 Project Overview
**PostCare AI** is an intelligent full-stack clinical SaaS web platform designed for post-operative recovery management. It bridges the gap between surgical discharge and outpatient recovery by enabling surgeons to author structured digital discharge plans, allowing patients to record daily biometrics, and leveraging a **Random Forest ML Classification Engine** to identify high-risk complications early.

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

### **Machine Learning & Computer Vision**
- **1. Post-Op Recovery Risk Classifier (`ml/model.joblib`):**
  - Multi-class Random Forest (100 Decision Trees) evaluating 7 daily patient recovery biometrics (pain, temperature, wound status, symptoms count, adherence, surgery type, post-op days).
  - Predicts complication risk tier: `low`, `medium`, `high`.
- **2. Surgical Wound Image Classifier (`ml/wound_model.joblib`):**
  - Clinical Computer Vision Classifier trained on 686 surgical wound photographs from the peer-reviewed SurgWound benchmark (The Ohio State University Wexner Medical Center, *npj Digital Medicine* 2026, Nature, CC-BY-SA-4.0).
  - Evaluates multi-channel RGB/HSV/YCbCr color distributions, tissue chromophore indicators (erythema, fibrinous slough, necrotic eschar), wound margin gradient contrast, and surface texture roughness across patient-independent train/val/test splits.
  - Predicts clinical wound condition: `good` (home care / routine healing), `moderate` (monitoring needed), and `poor` (immediate clinical attention / potential infection or dehiscence).

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

## 💻 How to Run (PowerShell & Command Prompt)

> ⚠️ **Important Note on PowerShell vs CMD:**
> - In **PowerShell** (`PS C:\>`), do **NOT** use `/d`. Simply use `cd "path"`.
> - In **Command Prompt** (`cmd.exe`), `cd /d "path"` is used.

---

### ⚡ Option 1: Running in Windows PowerShell (What you have open)

Open **two separate PowerShell windows**:

#### 🩵 Terminal 1: Backend (Copy & Paste into 1st PowerShell)
```powershell
cd "c:\Users\preet\OneDrive\Desktop\S7 - Project\postcare-ai\backend"
.venv\Scripts\activate
python manage.py runserver 8000
```
*(If PowerShell says "running scripts is disabled", run this single line instead:)*
```powershell
.\.venv\Scripts\python.exe manage.py runserver 8000
```
> ✅ Backend API will be live at **`http://127.0.0.1:8000`**

---

#### 🧡 Terminal 2: Frontend (Copy & Paste into 2nd PowerShell)
```powershell
cd "c:\Users\preet\OneDrive\Desktop\S7 - Project\postcare-ai\frontend"
npm run dev
```
> ✅ Frontend web app will be live at **`http://localhost:5173`**

---

### ⬛ Option 2: Running in Command Prompt (cmd.exe)

If you open the classic Command Prompt (`Win + R` → `cmd` → Enter):

#### 🩵 Terminal 1: Backend (CMD)
```cmd
cd /d "c:\Users\preet\OneDrive\Desktop\S7 - Project\postcare-ai\backend"
.venv\Scripts\activate
python manage.py runserver 8000
```

---

#### 🧡 Terminal 2: Frontend (CMD)
```cmd
cd /d "c:\Users\preet\OneDrive\Desktop\S7 - Project\postcare-ai\frontend"
npm run dev
```

---

### 🚀 Option 3: One-Click Run (Easiest)
Simply double-click **`run_app.bat`** in the project folder (or type `.\run_app.bat` in your terminal). It will launch both the Backend and Frontend in separate windows automatically!

---

### 🌐 Accessing the Application
Once both command prompts are running:
1. Open your web browser (Chrome, Edge, Firefox, etc.).
2. Go to: **`http://localhost:5173`**
3. Log in with any of the demo accounts listed above (e.g., Doctor: `doctor@postcare.demo` / `Doctor@123`).

---

### 🛑 How to Stop the Servers
To stop either server, click on its Command Prompt window and press:
```cmd
Ctrl + C
```
Type `Y` and press `Enter` when prompted to terminate the batch job.

---

### ⚙️ First-Time Database Setup & ML Model Training (If Needed)
If you need to re-apply migrations, retrain the ML models, or re-seed sample patient records:
```cmd
cd /d "c:\Users\preet\OneDrive\Desktop\S7 - Project\postcare-ai\backend"
.venv\Scripts\activate
python manage.py makemigrations
python manage.py migrate
python ../ml/train_model.py
python ../ml/prepare_dataset.py
python ../ml/train_wound_model.py
python manage.py seed_data
```

---

## 📊 Dual ML Architecture & Methodology

PostCare AI operates two specialized, isolated machine learning pipelines:

### 1. Tabular Daily Check-In Risk Engine (`ml/model.joblib`)
```
Patient Daily Check-In (Pain, Temp, Wound Condition, Symptoms, Meds, Surgery Type, Days)
                                    ↓
                       Standard Preprocessing Pipeline
                                    ↓
                     Random Forest Multi-Class Classifier
                                    ↓
            ┌───────────────────────┼───────────────────────┐
            ↓                       ↓                       ↓
         Low Risk               Medium Risk             High Risk
      (Score 80-100)          (Score 50-79)           (Score 0-49)
            ↓                       ↓                       ↓
     Routine Recovery       Caregiver Notification   Doctor Triage Alert
```

### 2. Surgical Wound Computer Vision Classifier (`ml/wound_model.joblib`)
```
Patient Uploads Incision Photograph (JPEG / PNG / WEBP)
                                    ↓
        In-Memory Image Validation & PIL Standardization (256x256 RGB)
                                    ↓
     Multi-Domain Computer Vision Feature Extraction (53 Features)
     - RGB, HSV, YCbCr color moments & erythema indices
     - Tissue chromophore ratios (erythema, fibrinous slough, necrotic eschar)
     - Wound margin spatial contrast (incision bed vs outer periwound skin)
     - Finite-difference gradient magnitude & surface texture roughness
                                    ↓
                 Balanced ExtraTrees Ensemble Classifier
                                    ↓
      Validation-Tuned Decision Thresholds (Prioritizing Acuity)
                                    ↓
            ┌───────────────────────┼───────────────────────┐
            ↓                       ↓                       ↓
      Healing Well              Monitoring             Complication
         (Good)                 (Moderate)                (Poor)
     Home Care Routine        Review in 48h           Immediate Review
```

---

## 📄 License & Attribution
- Post-operative clinical decision support platform. © 2026 PostCare AI Team.
- Surgical wound training benchmark sourced from SurgWound-Bench (OSWUMC - The Ohio State University Wexner Medical Center, *npj Digital Medicine* 2026, Nature Publishing Group) under Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA-4.0).

