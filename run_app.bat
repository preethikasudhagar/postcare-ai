@echo off
title PostCare AI Launcher
echo ===================================================
echo           Starting PostCare AI Platform
echo ===================================================
echo.

echo [1/2] Starting Django Backend Server (Port 8000)...
start "PostCare AI - Backend (Django)" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && python manage.py runserver 8000"

echo [2/2] Starting Vite Frontend Server (Port 5173)...
start "PostCare AI - Frontend (React Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ===================================================
echo Backend API:       http://127.0.0.1:8000
echo Frontend Web App:  http://localhost:5173
echo ===================================================
echo.
echo Open http://localhost:5173 in your browser to use the app.
echo.
pause
