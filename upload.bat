@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo   The Homebrew Compendium - upload to GitHub
echo   Repo: https://github.com/alonsojr1980/the-hb-compendium
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git was not found on PATH.
  echo         Install Git from https://git-scm.com/downloads and retry.
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERROR] This folder is not a git repository yet.
  echo.
  echo   Run these once, then run this script again:
  echo     git init
  echo     git branch -M main
  echo     git remote add origin https://github.com/alonsojr1980/the-hb-compendium.git
  echo.
  pause
  exit /b 1
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No "origin" remote is configured.
  echo         Run:  git remote add origin https://github.com/alonsojr1980/the-hb-compendium.git
  echo.
  pause
  exit /b 1
)

if "%~1"=="" (
  set "MSG=Update library"
) else (
  set "MSG=%~1"
)

echo [1/3] Staging all changes...
git add -A

echo [2/3] Committing: "!MSG!"
git commit -m "!MSG!"
if errorlevel 1 (
  echo       [INFO] Nothing to commit - the working tree is already clean.
)

echo [3/3] Pushing to origin...
git push
if errorlevel 1 (
  echo.
  echo [ERROR] Push failed. Check the remote and your credentials:
  echo         git remote -v
  echo.
  pause
  exit /b 1
)

echo.
echo Done. GitHub Pages will rebuild the site from the development/ folder
echo in a minute or two.
echo.
pause
