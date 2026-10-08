@echo off
setlocal enabledelayedexpansion
title El Mokhtar CRM Server
cd /d "%~dp0"

echo ========================================================
echo       EL MOKHTAR TRAVEL CRM - DEMARRAGE SERVEUR
echo ========================================================
echo.

:: Detecter IP locale
set "LOCAL_IP=192.168.1.3"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" /c:"Adresse IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set "LOCAL_IP=%%b"
)

echo [1/2] Lancement du Backend (Port 3000)...
start "El Mokhtar CRM - Backend" cmd /k "cd /d "%~dp0backend" && npm run start:dev"

echo [2/2] Lancement du Frontend (Port 5173)...
start "El Mokhtar CRM - Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

ping 127.0.0.1 -n 3 >nul

echo.
echo ========================================================
echo       SERVEURS DEMARRES AVEC SUCCES !
echo ========================================================
echo.
echo   Acces Local (ce PC)  : http://elmokhtar.crm:5173  ou  http://localhost:5173
echo   Acces Reseau / Wifi  : http://%LOCAL_IP%:5173
echo.
echo ========================================================

:: Ouvrir le navigateur
start http://elmokhtar.crm:5173
