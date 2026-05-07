# GitHub Repository Creation Script
# Run this script after installing GitHub CLI

Write-Host "🚀 School Management System - GitHub Repository Setup" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if gh is installed
try {
    $ghVersion = gh --version
    Write-Host "✅ GitHub CLI is installed: $($ghVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   Download from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "   Or run: winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# Authenticate with GitHub
Write-Host "`n🔐 Authenticating with GitHub..." -ForegroundColor Cyan
try {
    gh auth status
    Write-Host "✅ Already authenticated with GitHub" -ForegroundColor Green
} catch {
    Write-Host "🔑 Please authenticate with GitHub..." -ForegroundColor Yellow
    gh auth login
}

# Create the repository
Write-Host "`n📁 Creating GitHub repository..." -ForegroundColor Cyan
$repoName = "school-management-system"
$description = "Complete Multi-Tenant School Management SaaS with Authentication, Role-based Access Control, and Modern UI"

try {
    gh repo create $repoName --public --description $description --source=. --remote=origin --push
    Write-Host "✅ Repository created successfully!" -ForegroundColor Green
    Write-Host "🌐 Repository URL: https://github.com/$(gh api user --jq .login)/$repoName" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create repository. Error: $_" -ForegroundColor Red
    Write-Host "💡 You may need to create it manually at https://github.com/new" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "Your school management system is now on GitHub!" -ForegroundColor Green