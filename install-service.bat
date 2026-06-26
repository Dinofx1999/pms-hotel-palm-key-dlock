@echo off
REM ════════════════════════════════════════════════════════════════════
REM  Palm Lock Agent — Cai thanh WINDOWS SERVICE (tu chay khi bat may).
REM  CHAY BANG QUYEN ADMINISTRATOR (chuot phai > Run as administrator).
REM  Khong can cai Node/npm/PM2 — moi thu da dong goi san trong thu muc nay.
REM ════════════════════════════════════════════════════════════════════
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "SVC=PalmLockAgent"
set "NSSM=%~dp0nssm.exe"
set "PORT=2000"

REM --- kiem tra quyen admin ---
net session >nul 2>&1
if errorlevel 1 (
  echo [LOI] Hay chay file nay bang quyen ADMINISTRATOR ^(chuot phai ^> Run as administrator^).
  pause & exit /b 1
)

if not exist "%NSSM%" (
  echo [LOI] Khong thay nssm.exe. Tai NSSM ^(nssm.cc^) va dat nssm.exe ^(ban win64^) canh file nay.
  pause & exit /b 1
)

REM --- chon cach chay: uu tien .exe dong goi; neu khong co thi node.exe portable; cuoi cung node he thong ---
if exist "%~dp0palm-lock-agent.exe" (
  set "RUN=%~dp0palm-lock-agent.exe"
  set "ARGS="
) else if exist "%~dp0node.exe" (
  set "RUN=%~dp0node.exe"
  set "ARGS=%~dp0agent.js"
) else (
  set "RUN=node"
  set "ARGS=%~dp0agent.js"
)

echo Dang go service cu (neu co)...
"%NSSM%" stop %SVC% >nul 2>&1
"%NSSM%" remove %SVC% confirm >nul 2>&1

echo Dang cai service "%SVC%" ...
"%NSSM%" install %SVC% "%RUN%" %ARGS%
"%NSSM%" set %SVC% AppDirectory "%~dp0"
"%NSSM%" set %SVC% AppEnvironmentExtra LOCK_AGENT_PORT=%PORT%
"%NSSM%" set %SVC% Start SERVICE_AUTO_START
"%NSSM%" set %SVC% AppStdout "%~dp0service-out.log"
"%NSSM%" set %SVC% AppStderr "%~dp0service-err.log"
"%NSSM%" set %SVC% AppStopMethodSkip 6
"%NSSM%" start %SVC%

echo.
echo ===================================================================
echo  Da cai + chay service "%SVC%" o cong %PORT% (tu khoi dong khi bat may).
echo  Kiem tra: mo trinh duyet http://127.0.0.1:%PORT%/status
echo ===================================================================
sc query %SVC% | findstr STATE
pause
