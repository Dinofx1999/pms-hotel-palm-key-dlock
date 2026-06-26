@echo off
REM Go Palm Lock Agent khoi Windows Service. Chay bang quyen Administrator.
setlocal
cd /d "%~dp0"
set "SVC=PalmLockAgent"
set "NSSM=%~dp0nssm.exe"

net session >nul 2>&1
if errorlevel 1 ( echo [LOI] Chay bang quyen ADMINISTRATOR. & pause & exit /b 1 )

"%NSSM%" stop %SVC%
"%NSSM%" remove %SVC% confirm
echo Da go service %SVC%.
pause
