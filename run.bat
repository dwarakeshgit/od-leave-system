@echo off
title CampusFlow Launcher
echo ========================================================
echo   Starting CampusFlow (OD ^& Leave Desk) System
echo ========================================================
echo.
echo 1. Launching Backend Server on http://localhost:5000...
start "CampusFlow Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 2 /nobreak >nul

echo 2. Launching Frontend Dev Server...
start "CampusFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are launching in separate windows!
echo - Frontend: http://localhost:5174 (or http://localhost:5173)
echo - Backend:  http://localhost:5000
echo ========================================================
