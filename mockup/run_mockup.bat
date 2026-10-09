@echo off
setlocal
title PS5 Homebrew Compendium - Mockup server

REM ---------------------------------------------------------------------------
REM  run_mockup.bat - serve the mockup over HTTP and open it in a browser.
REM
REM  Usage:
REM    run_mockup.bat            -> serve on port 8080 and open the browser
REM    run_mockup.bat 8090       -> serve on port 8090
REM    run_mockup.bat 8090 nobrowser  -> serve without opening a browser (dev)
REM
REM  Works whether this file sits in mockup\ or in the repository root.
REM ---------------------------------------------------------------------------

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"
set "OPENBROWSER=1"
if /I "%~2"=="nobrowser" set "OPENBROWSER=0"

REM Move to the folder containing this script.
cd /d "%~dp0"

REM Pick the folder that actually contains index.html (mockup\ or cwd).
if exist "%CD%\index.html" (
  set "SERVE=%CD%"
) else if exist "%CD%\mockup\index.html" (
  set "SERVE=%CD%\mockup"
) else (
  echo [ERROR] Could not find index.html next to this script or in .\mockup\
  echo.
  pause
  exit /b 1
)
cd /d "%SERVE%"

REM Locate Python (prefer the py launcher, fall back to python).
set "PY="
where py >nul 2>nul && set "PY=py"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo [ERROR] Python was not found on PATH.
  echo         Install Python 3 from https://www.python.org/downloads/ and retry.
  echo.
  pause
  exit /b 1
)

set "URL=http://127.0.0.1:%PORT%/"

echo ============================================================
echo   PS5 Homebrew Compendium - MOCKUP
echo ============================================================
echo   Folder : %SERVE%
echo   URL    : %URL%
echo   Stop   : press Ctrl+C in this window
echo ------------------------------------------------------------
echo   Note: this prototype must be served over HTTP.
echo         Opening index.html directly (file://) blocks the data fetch.
echo ============================================================
echo.

if "%OPENBROWSER%"=="1" start "" "%URL%"

REM Bind to 127.0.0.1 deliberately (avoids the IPv6 "localhost" mismatch).
%PY% -m http.server %PORT% --bind 127.0.0.1

echo.
echo Server stopped.
pause
