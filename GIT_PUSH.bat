@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   Smashers Backend - Git Push
echo ========================================
echo.

echo [1/7] Configuring Git user...
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"
echo   OK
echo.

echo [2/7] Checking Git repository...
if not exist .git (
    git init
    echo   Git initialized
) else (
    echo   Git already initialized
)
echo.

echo [3/7] Configuring remote...
git remote remove origin 2>nul
git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git
echo   Remote configured
echo.

echo [4/7] Adding files...
git add .
echo   Files staged
echo.

echo [5/7] Creating commit...
git commit -m "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
if errorlevel 1 (
    echo   Warning: Commit may have failed or nothing to commit
) else (
    echo   Commit created
)
echo.

echo [6/7] Setting branch to main...
git branch -M main
echo   Branch set to main
echo.

echo [7/7] Pushing to GitHub...
echo   NOTE: Authentication may be required!
echo   Use your GitHub username and Personal Access Token
echo.
git push -u origin main

if errorlevel 1 (
    echo.
    echo ========================================
    echo   Push failed - Authentication required
    echo ========================================
    echo.
    echo To authenticate:
    echo   1. Go to: https://github.com/settings/tokens
    echo   2. Generate new token (classic)
    echo   3. Select 'repo' scope
    echo   4. Use token as password when prompted
    echo.
) else (
    echo.
    echo ========================================
    echo   SUCCESS! Project pushed to GitHub
    echo ========================================
    echo.
    echo Repository: https://github.com/ExecuteTyT/Smashers-Backend
    echo.
)

pause
