@echo off
rem Double-click to run Site Control on this computer with the TEST database.
rem Two black windows open (test database + app). Close both to stop.
rem Test data is wiped when you close the test database window.
cd /d "%~dp0"
set "JAVA_HOME=%LOCALAPPDATA%\Programs\Temurin\jdk-21.0.12.1+1"
set "PATH=%JAVA_HOME%\bin;%PATH%"
if not exist node_modules (
  echo First run: installing tools, please wait...
  call npm install
)
if not exist web\node_modules (
  echo First run: installing app, please wait...
  call npm --prefix web install
)
start "Site Control - test database" cmd /k npm run emulators
timeout /t 15 /nobreak >nul
start "Site Control - app" cmd /k npm --prefix web run dev -- --port 5173
timeout /t 5 /nobreak >nul
rem Owner: use 127.0.0.1 (the test Google sign-in needs it).
start "" http://127.0.0.1:5173
