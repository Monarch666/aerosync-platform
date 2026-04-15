@echo off
:: AeroSync Satellite Ground Station — Launcher
:: Copyright (c) 2026 Wingspann Global Pvt Ltd — MIT License
title AeroSync Ground Station

echo.
echo  ========================================================
echo   AeroSync Satellite Ground Station
echo   Wingspann Global Pvt Ltd  ^|  MIT License
echo  ========================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    pause & exit /b 1
)

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause & exit /b 1
)

:: Backend venv setup
if not exist "backend\venv" (
    echo [SETUP] Creating Python virtual environment...
    python -m venv backend\venv
    echo [SETUP] Installing backend dependencies...
    backend\venv\Scripts\pip install -r backend\requirements.txt
)

:: Frontend deps
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo.
echo [START] Launching Backend on http://localhost:5000
echo [START] Launching Frontend on http://localhost:3000
echo.
echo  Press Ctrl+C in each window to stop.
echo.

:: Launch backend
start "AeroSync Backend" cmd /k "cd backend && venv\Scripts\python main.py"

:: Wait for backend to start
timeout /t 4 /nobreak >nul

:: Launch frontend
start "AeroSync Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo  Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

pause
