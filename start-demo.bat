@echo off
REM ============================================================
REM  FCPortal — one-click local demo launcher (Windows)
REM
REM  Starts the Firebase Emulator Suite, backend API, and
REM  frontend dev server, then seeds sample demo data and opens
REM  the app in your browser. Safe to run multiple times.
REM
REM  Requirements (install once, see DEMO.md):
REM    - Node.js  (https://nodejs.org)
REM    - A JDK 21+ (needed by the Firestore/Storage emulators)
REM  If a "portable-node" and/or "portable-jdk" folder exists
REM  next to this project folder, they are used automatically —
REM  no installation needed in that case.
REM ============================================================
setlocal
cd /d "%~dp0"

REM --- Prefer bundled portable Node/JDK if present next to this project ---
if exist "..\portable-node\node.exe" (
  set "PATH=%~dp0..\portable-node;%PATH%"
  echo Using bundled portable Node.js
)
REM JAVA_HOME is set in its own block: variables are expanded when a whole
REM parenthesized block is parsed, so it can't be set and read in the same one.
if exist "..\portable-jdk" (
  for /d %%J in ("..\portable-jdk\jdk-*") do set "JAVA_HOME=%%~fJ"
)
if exist "..\portable-jdk" (
  set "PATH=%JAVA_HOME%\bin;%PATH%"
  echo Using bundled portable JDK
)
REM Use bundled emulator files so nothing has to be downloaded on first run.
if exist "..\emulators-cache" set "FIREBASE_EMULATORS_PATH=%~dp0..\emulators-cache"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Node.js was not found. Install it from https://nodejs.org and re-run this script.
  pause
  exit /b 1
)
where java >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERROR] Java was not found. Install a JDK ^(17+^) or place a "portable-jdk" folder next to this project.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing frontend dependencies, this is a one-time step...
  call npm install || goto :error
)
if not exist "backend\node_modules" (
  echo Installing backend dependencies, this is a one-time step...
  call npm install --prefix backend || goto :error
)

echo.
echo Starting Firebase emulators, backend, and frontend in separate windows...
start "FCPortal - Emulators" cmd /k "npm run demo:emulators"

echo Waiting for emulators to come up...
:waitemu
curl.exe -s -o nul --max-time 2 http://127.0.0.1:4000
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto :waitemu
)

start "FCPortal - Backend" cmd /k "npm run demo:backend"

echo Waiting for the backend to come up...
:waitbackend
curl.exe -s -o nul --max-time 2 http://localhost:5000/api/health
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto :waitbackend
)

echo Seeding demo accounts and sample data...
call npm run demo:seed-users
call npm run demo:seed-data

start "FCPortal - Frontend" cmd /k "npm run demo:frontend"

echo Waiting for the frontend to come up...
:waitfrontend
curl.exe -s -o nul --max-time 2 http://localhost:5173
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto :waitfrontend
)

start "" "http://localhost:5173"

echo.
echo ============================================================
echo  All set! The app is open at http://localhost:5173
echo  Sign in with any demo tile — password: Demo@12345
echo.
echo  Three windows are now running the demo (emulators, backend,
echo  frontend). Close them when you're done, or just close this
echo  window last — the others can stay open while you use the app.
echo ============================================================
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Setup failed. See the messages above.
pause
exit /b 1
