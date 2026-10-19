# PostCare AI — Production Deployment Guide

This guide details the step-by-step process to deploy PostCare AI:
- **Backend & Database:** Render (Web Service + Managed PostgreSQL)
- **Frontend:** Vercel (React + Vite Single-Page Application)
- **Repository:** `https://github.com/preethikasudhagar/postcare-ai.git`

---

## Architecture Overview

```
┌─────────────────────────────────┐           ┌───────────────────────────────────────┐
│         Vercel Frontend         │           │          Render Web Service           │
│   (React 18 + Vite SPA)         │           │          (Django 5.1 + Gunicorn)      │
│   https://<app>.vercel.app      │ ──HTTPS──▶│   https://<backend>.onrender.com      │
│   • Client-side routing         │  REST API │   • WhiteNoise static assets          │
│   • VITE_API_BASE_URL           │           │   • JWT Auth + ML Risk Predictor      │
└─────────────────────────────────┘           └──────────────────┬────────────────────┘
                                                                 │
                                                       Internal Private Network
                                                                 │
                                                                 ▼
                                              ┌───────────────────────────────────────┐
                                              │       Render PostgreSQL Database      │
                                              │           (Managed Postgres 16)       │
                                              │   • DATABASE_URL (SSL Required)       │
                                              └───────────────────────────────────────┘
```

---

## Step 1: Deploy Backend & Database on Render

You can deploy using either the **Render Blueprint (Recommended & Fastest)** or **Manual Service Creation**.

### Option A: Using Render Blueprint (Fastest — 1 Click)

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** (top right) ➔ **Blueprint**.
3. Connect your GitHub account and select repository: `preethikasudhagar/postcare-ai`.
4. Render detects `render.yaml` and displays the two resources to create:
   - **Database:** `postcare-ai-db` (PostgreSQL, Free tier)
   - **Web Service:** `postcare-ai-backend` (Python 3, Free tier)
5. Click **Apply**.
6. Render will:
   - Provision the PostgreSQL database.
   - Automatically inject `DATABASE_URL` into the web service.
   - Automatically generate a secure `SECRET_KEY`.
   - Run `./render-build.sh` (installs dependencies, collects static files, trains the tabular ML model, applies migrations).
   - Launch Gunicorn on the allocated `$PORT`.
7. Once deployed, note your backend URL:
   `https://postcare-ai-backend.onrender.com` (or similar).

---

### Option B: Manual Service Creation on Render

If you prefer to configure services individually in the Render UI:

#### 1. Create PostgreSQL Database
1. In Render, click **New +** ➔ **PostgreSQL**.
2. **Name:** `postcare-ai-db`
3. **Database:** `postcare_ai`
4. **User:** `postcare_user`
5. **Region:** Choose closest to you (e.g., Oregon or Frankfurt).
6. **Plan:** Free
7. Click **Create Database**.
8. After it provisions, scroll down to **Connections** and copy the **Internal Database URL** (e.g., `postgres://postcare_user:...@dpg-.../postcare_ai`).

#### 2. Create Django Web Service
1. In Render, click **New +** ➔ **Web Service**.
2. Select repository: `preethikasudhagar/postcare-ai`.
3. Configure settings:
   - **Name:** `postcare-ai-backend`
   - **Region:** Same region as your database.
   - **Branch:** `main`
   - **Root Directory:** Leave empty (runs from repo root).
   - **Runtime:** `Python 3`
   - **Build Command:** `./render-build.sh`
   - **Start Command:** `gunicorn --chdir backend config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Plan:** Free
4. Under **Environment Variables**, add:
   | Key | Value | Notes |
   |---|---|---|
   | `PYTHON_VERSION` | `3.12.0` | Ensures Python 3.12 runtime |
   | `DEBUG` | `False` | Disables debug mode in production |
   | `SECRET_KEY` | *(Click "Generate" or enter random string)* | Production Django secret key |
   | `DATABASE_URL` | *(Paste Internal Database URL from step 1)* | Database connection string |
   | `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` | Permits incoming traffic |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Add your Vercel URL here in Step 3 |
   | `CSRF_TRUSTED_ORIGINS` | `https://your-backend.onrender.com` | Add your Vercel URL here in Step 3 |
5. Under **Health Check Path**, enter: `/api/health/`.
6. Click **Create Web Service**.

---

## Step 2: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository: `preethikasudhagar/postcare-ai`.
4. In the configuration screen:
   - **Framework Preset:** Vite
   - **Root Directory:** Click **Edit** and select `frontend`.
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
   - **Install Command:** `npm install` (default)
5. Expand **Environment Variables** and add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_BASE_URL` | `https://postcare-ai-backend.onrender.com` | Your Render backend URL (**no trailing slash**) |
   | `VITE_GOOGLE_CLIENT_ID` | *(Optional Google OAuth Client ID)* | For "Sign in with Google" button |
6. Click **Deploy**.
7. Vercel will build the frontend and assign a live production URL (e.g., `https://postcare-ai.vercel.app`).

---

## Step 3: Link CORS & CSRF Between Frontend and Backend

Now that your Vercel frontend URL is known:

1. Return to [Render Dashboard](https://dashboard.render.com/) ➔ select `postcare-ai-backend` ➔ **Environment**.
2. Update the following environment variables with your real Vercel domain:
   - `CORS_ALLOWED_ORIGINS`:
     ```
     https://postcare-ai.vercel.app,http://localhost:5173
     ```
   - `CSRF_TRUSTED_ORIGINS`:
     ```
     https://postcare-ai.vercel.app,https://postcare-ai-backend.onrender.com
     ```
3. Click **Save Changes**. Render will automatically redeploy the service with the updated security configuration.

---

## Step 4: Seed Initial Healthcare Dataset (Optional)

If your newly provisioned production PostgreSQL database is empty and you want to populate it with the realistic demo clinical dataset (doctors, nurses, patients, discharge plans, vitals history):

1. In Render Dashboard ➔ select `postcare-ai-backend` ➔ click **Shell** tab (top right).
2. Run:
   ```bash
   python backend/manage.py seed_data
   ```
3. This seeds the standard demo accounts:
   - **Doctor:** `doctor@postcare.demo` / `Doctor@123`
   - **Patient:** `patient@postcare.demo` / `Patient@123`
   - **Nurse:** `nurse1@postcare.demo` / `Nurse@123`
   - **Caregiver:** `caregiver@postcare.demo` / `Caregiver@123`
   - **Admin:** `admin@postcare.demo` / `Admin@123`

---

## Production Verification Checklist

- [ ] **Health Endpoint:** Navigate to `https://<backend>.onrender.com/api/health/` ➔ returns `{"status": "healthy"}` with HTTP 200.
- [ ] **Frontend Routing:** Navigate to `https://<frontend>.vercel.app/login` ➔ loads cleanly.
- [ ] **Authentication:** Log in as `patient@postcare.demo` / `Patient@123` ➔ redirects to Patient Dashboard.
- [ ] **Page Refresh:** Press F5 on `/patient/recovery` ➔ reloads cleanly without 404 (handled by `frontend/vercel.json`).
- [ ] **ML Inference:** Submit a daily recovery check-in ➔ verifies Risk Prediction calculation (low/medium/high) powered by the trained Random Forest classifier.
- [ ] **Messaging:** Send a message from patient to doctor ➔ verifies PostgreSQL persistence.
- [ ] **Static Assets:** Verify icons, CSS, and fonts load with HTTP 200 (served by WhiteNoise).

---

## Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| **CORS error in browser console** | `CORS_ALLOWED_ORIGINS` does not match your Vercel URL. | Ensure the exact Vercel URL (e.g. `https://postcare-ai.vercel.app`, no trailing slash) is added to `CORS_ALLOWED_ORIGINS` on Render. |
| **Frontend calls `http://localhost:8000`** | `VITE_API_BASE_URL` was not configured during Vercel build. | In Vercel Project Settings ➔ Environment Variables, set `VITE_API_BASE_URL=https://<backend>.onrender.com` and trigger a **Redeploy**. |
| **404 on refresh on nested pages** | Missing SPA rewrite rule. | Verified: `frontend/vercel.json` contains `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`. |
| **Backend sleeps after 15 min inactivity** | Render free tier spin-down. | The free tier spins down after 15 minutes of inactivity; the first request takes ~30–50s to wake up. For zero-latency uptime, upgrade to the Starter plan ($7/mo) or use a free uptime pinger. |
| **Uploaded wound images disappear on redeploy** | Render disk is ephemeral. | Render's local container filesystem resets on redeploy. For persistent production medical imaging, attach AWS S3 or Cloudflare R2 storage. The frontend gracefully shows an "Image unavailable" badge if an image file is absent. |
| **Database connection fails** | `DATABASE_URL` is missing or wrong region. | Use Render's **Internal Database URL** for services in the same region, ensuring zero egress costs and faster latency. |
