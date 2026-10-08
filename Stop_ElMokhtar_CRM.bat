@echo off
title El Mokhtar CRM - Arret des serveurs
cd /d "%~dp0"

echo ========================================================
echo       ARRET DES SERVEURS EL MOKHTAR TRAVEL CRM
echo ========================================================
echo.

echo Liberation du port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Liberation du port 3000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ========================================================
echo       SERVEURS ARRETES AVEC SUCCES !
echo ========================================================
echo.
ping 127.0.0.1 -n 3 >nul
