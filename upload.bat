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

set "BRANCH="
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
if "%BRANCH%"=="" set "BRANCH=main"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=Update library"

echo [1/4] Staging all changes...
git add -A

echo [2/4] Committing: "%MSG%"
git commit -m "%MSG%"
if errorlevel 1 echo       [INFO] Nothing to commit - the working tree is already clean.

echo.
echo [3/4] Syncing with origin/%BRANCH% (fetch + rebase)...
git fetch origin
if errorlevel 1 goto fetch_fail

git rev-parse --verify --quiet "refs/remotes/origin/%BRANCH%" >nul 2>nul
if errorlevel 1 (
  echo       [INFO] origin/%BRANCH% does not exist yet - first push, skipping rebase.
) else (
  git pull --rebase origin %BRANCH%
  if errorlevel 1 goto rebase_fail
)

echo.
echo [4/4] Pushing to origin/%BRANCH%...
git push
if errorlevel 1 goto push_fail
goto done

:fetch_fail
echo.
echo [ERROR] Could not fetch from origin. Check your network and GitHub credentials
echo         (see the README for signing in with a browser).
goto end

:rebase_fail
echo.
echo [ERROR] Could not rebase onto origin/%BRANCH% - there is probably a merge conflict.
echo         Resolve the conflict, then run:  git rebase --continue
echo         Or keep your local copy and stop the rebase:  git rebase --abort
goto end

:push_fail
echo.
echo [ERROR] Push failed. Check the remote and your credentials:
echo         git remote -v
goto end

:done
echo.
echo Done. GitHub Pages will rebuild the site from the development/ folder
echo in a minute or two.

:end
echo.
pause
