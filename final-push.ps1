cd C:\Files\Development\VS\Smashers\smashers-backend

Write-Host "Setting up Git..." -ForegroundColor Cyan
git config user.email "smashers-backend@braidx.tech"
git config user.name "Smashers Backend"

Write-Host "Adding files..." -ForegroundColor Cyan
git add .

Write-Host "Creating commit..." -ForegroundColor Cyan
$commitResult = git commit -m "Initial commit: Smashers Backend API with Django parser, PostgreSQL, and Telegram integration" 2>&1
Write-Host $commitResult

Write-Host "Setting branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "Authentication may be required!" -ForegroundColor Yellow
git push -u origin main
