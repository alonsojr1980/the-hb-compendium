@echo off
setlocal
title The Homebrew Compendium - local server

REM ---------------------------------------------------------------------------
REM  run_site.bat - serve the built site over HTTP and open it in a browser.
REM
REM  Usage:
REM    run_site.bat                  -> serve on port 8080 and open the browser
REM    run_site.bat 8090             -> serve on port 8090
REM    run_site.bat 8090 nobrowser   -> serve without opening a browser (dev/testing)
REM
REM  Works whether this file sits in development\ or in the repository root.
REM ---------------------------------------------------------------------------

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"
set "OPENBROWSER=1"
if /I "%~2"=="nobrowser" set "OPENBROWSER=0"

REM Move to the folder containing this script.
cd /d "%~dp0"

REM Pick the folder that actually contains index.html (development\ or cwd).
if exist "%CD%\index.html" (
  set "SERVE=%CD%"
) else if exist "%CD%\development\index.html" (
  set "SERVE=%CD%\development"
) else (
  echo [ERROR] Could not find index.html next to this script or in .\development\
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
echo   The Homebrew Compendium - local server
echo ============================================================
echo   Folder : %SERVE%
echo   URL    : %URL%
echo   Stop   : press Ctrl+C in this window
echo ------------------------------------------------------------
echo   Served over HTTP because the site fetches library.json;
echo   opening index.html directly (file://) is blocked.
echo ============================================================
echo.

if "%OPENBROWSER%"=="1" start "" "%URL%"

REM Bind to 127.0.0.1 deliberately (avoids the IPv6 "localhost" mismatch).
%PY% -m http.server %PORT% --bind 127.0.0.1

echo.
echo Server stopped.
pause
