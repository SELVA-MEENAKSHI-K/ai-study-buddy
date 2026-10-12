@echo off
setlocal
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Backend packages are not ready. Please contact Codex for setup help.
  pause
  exit /b 1
)
if not exist "frontend\node_modules\vite\bin\vite.js" (
  echo Frontend packages are not ready. Please contact Codex for setup help.
  pause
  exit /b 1
)

start "AI Study Buddy Backend" cmd /k "cd /d ""%~dp0"" && ""%~dp0backend\.venv\Scripts\python.exe"" -u -m backend.local_server"
start "AI Study Buddy Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 127.0.0.1"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
