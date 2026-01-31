# Git Push Script for Smashers Backend
# Run this script to push the project to GitHub

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Smashers Backend - Git Push" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Configure Git user
Write-Host "[1/7] Configuring Git user..." -ForegroundColor Yellow
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"
Write-Host "  OK" -ForegroundColor Green
Write-Host ""

# Step 2: Initialize Git if needed
Write-Host "[2/7] Checking Git repository..." -ForegroundColor Yellow
if (-not (Test-Path .git)) {
    git init
    Write-Host "  Git initialized" -ForegroundColor Green
} else {
    Write-Host "  Git already initialized" -ForegroundColor Green
}
Write-Host ""

# Step 3: Configure remote
Write-Host "[3/7] Configuring remote..." -ForegroundColor Yellow
$currentRemote = git remote get-url origin 2>$null
if ($currentRemote -ne "https://github.com/ExecuteTyT/Smashers-Backend.git") {
    if ($currentRemote) {
        git remote set-url origin https://github.com/ExecuteTyT/Smashers-Backend.git
    } else {
        git remote add origin https://github.com/ExecuteTyT/Smashers-Backend.git
    }
    Write-Host "  Remote configured" -ForegroundColor Green
} else {
    Write-Host "  Remote already configured" -ForegroundColor Green
}
Write-Host ""

# Step 4: Add files
Write-Host "[4/7] Adding files..." -ForegroundColor Yellow
git add .
$fileCount = (git status --short 2>$null | Where-Object { $_ -match '^[AM]' } | Measure-Object).Count
Write-Host "  Files staged: $fileCount" -ForegroundColor Green
Write-Host ""

# Step 5: Create commit
Write-Host "[5/7] Creating commit..." -ForegroundColor Yellow
$commitMsg = "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
try {
    git commit -m $commitMsg 2>&1 | Out-Null
    Write-Host "  Commit created" -ForegroundColor Green
} catch {
    $status = git status --porcelain
    if ($status) {
        Write-Host "  Warning: Some files not committed" -ForegroundColor Yellow
    } else {
        Write-Host "  Nothing to commit (already up to date)" -ForegroundColor Cyan
    }
}
Write-Host ""

# Step 6: Set branch to main
Write-Host "[6/7] Setting branch to main..." -ForegroundColor Yellow
git branch -M main 2>&1 | Out-Null
Write-Host "  Branch set to main" -ForegroundColor Green
Write-Host ""

# Step 7: Push to GitHub
Write-Host "[7/7] Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "  NOTE: Authentication may be required!" -ForegroundColor Yellow
Write-Host "  Use your GitHub username and Personal Access Token" -ForegroundColor Yellow
Write-Host ""
try {
    git push -u origin main
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Project pushed to GitHub" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository: https://github.com/ExecuteTyT/Smashers-Backend" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Push failed - Authentication required" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "To authenticate:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "  2. Generate new token (classic)" -ForegroundColor Cyan
    Write-Host "  3. Select 'repo' scope" -ForegroundColor Cyan
    Write-Host "  4. Use token as password when prompted" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then run: git push -u origin main" -ForegroundColor Yellow
}

Write-Host ""
