@echo off
:: Self-elevate to Administrator if not already running as Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Demande des droits Administrateur...
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

title Configuration Domaine elmokhtar.crm
cd /d "%~dp0"

echo ========================================================
echo     CONFIGURATION DU DOMAINE elmokhtar.crm (ADMIN)
echo ========================================================
echo.

set "LOCAL_IP=192.168.1.3"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" /c:"Adresse IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set "LOCAL_IP=%%b"
)

echo [1/3] Adresse IP locale : %LOCAL_IP%

:: Modifier le fichier hosts
echo [2/3] Ajout de elmokhtar.crm dans le fichier hosts Windows...
findstr /i "elmokhtar.crm" "%WINDIR%\System32\drivers\etc\hosts" >nul
if %errorLevel% neq 0 (
    echo. >> "%WINDIR%\System32\drivers\etc\hosts"
    echo 127.0.0.1       elmokhtar.crm >> "%WINDIR%\System32\drivers\etc\hosts"
    echo %LOCAL_IP%     elmokhtar.crm >> "%WINDIR%\System32\drivers\etc\hosts"
    echo    -> Succes : Domaine elmokhtar.crm enregistre !
) else (
    echo    -> Le domaine elmokhtar.crm est deja present dans hosts.
)

:: Vider le cache DNS
ipconfig /flushdns >nul

:: Configurer le pare-feu
echo [3/3] Configuration du pare-feu Windows...
netsh advfirewall firewall delete rule name="El Mokhtar CRM Frontend" >nul 2>&1
netsh advfirewall firewall add rule name="El Mokhtar CRM Frontend" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1

netsh advfirewall firewall delete rule name="El Mokhtar CRM Backend" >nul 2>&1
netsh advfirewall firewall add rule name="El Mokhtar CRM Backend" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1

echo    -> Ports 5173 et 3000 ouverts dans le pare-feu.

echo.
echo ========================================================
echo     CONFIGURATION REUSSIE !
echo ========================================================
echo.
echo   Ce PC peut maintenant ouvrir : http://elmokhtar.crm:5173
echo   Sur les telephones du Wifi   : http://%LOCAL_IP%:5173
echo.
echo ========================================================
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
