@echo off
rem Double-click to open the Site Control demo on this computer.
rem Close this black window to stop it.
cd /d "%~dp0web"
if not exist node_modules (
  echo First run: installing, please wait...
  call npm install
)
start "" http://localhost:5173
call npm run dev -- --port 5173
