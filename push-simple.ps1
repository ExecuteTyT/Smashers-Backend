$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Set-Location "C:\Files\Development\VS\Smashers\smashers-backend"

Write-Host "=== Git Setup ===" -ForegroundColor Cyan
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"

Write-Host "=== Adding files ===" -ForegroundColor Cyan
git add .

Write-Host "=== Creating commit ===" -ForegroundColor Cyan
$commitMsg = "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration"
git commit -m $commitMsg

if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed or nothing to commit" -ForegroundColor Yellow
    $status = git status --short
    if ($status) {
        Write-Host "Uncommitted files:" -ForegroundColor Yellow
        Write-Host $status
    }
}

Write-Host "=== Setting branch to main ===" -ForegroundColor Cyan
git branch -M main

Write-Host "=== Pushing to GitHub ===" -ForegroundColor Cyan
Write-Host "Authentication may be required!" -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== SUCCESS! ===" -ForegroundColor Green
    Write-Host "Repository: https://github.com/ExecuteTyT/Smashers-Backend" -ForegroundColor Cyan
} else {
    Write-Host "=== Push failed ===" -ForegroundColor Red
    Write-Host "You may need to authenticate with GitHub" -ForegroundColor Yellow
    Write-Host "Use Personal Access Token as password" -ForegroundColor Yellow
}
