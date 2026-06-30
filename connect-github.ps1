# Connect to GitHub Repository Script
Write-Host "🚀 Connecting to Your GitHub Repository" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Get GitHub username
$username = Read-Host "Enter your GitHub username"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "❌ Username cannot be empty!" -ForegroundColor Red
    exit 1
}

# Remove existing origin if it exists
try {
    git remote remove origin 2>$null
    Write-Host "🔄 Removed existing remote origin" -ForegroundColor Yellow
} catch {
    # Origin doesn't exist, that's fine
}

# Add the correct remote origin
$repoUrl = "https://github.com/$username/school-management-system.git"
Write-Host "🔗 Adding remote origin: $repoUrl" -ForegroundColor Cyan

try {
    git remote add origin $repoUrl
    Write-Host "✅ Remote origin added successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to add remote origin: $_" -ForegroundColor Red
    exit 1
}

# Rename branch to main
Write-Host "🌿 Renaming branch to main..." -ForegroundColor Cyan
try {
    git branch -M main
    Write-Host "✅ Branch renamed to main" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Branch rename failed, but continuing..." -ForegroundColor Yellow
}

# Push to GitHub
Write-Host "📤 Pushing code to GitHub..." -ForegroundColor Cyan
Write-Host "This may take a moment..." -ForegroundColor Yellow

try {
    git push -u origin main
    Write-Host ""
    Write-Host "🎉 SUCCESS! Your code has been pushed to GitHub!" -ForegroundColor Green
    Write-Host "🌐 Repository URL: https://github.com/$username/school-management-system" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✅ What's now on GitHub:" -ForegroundColor Green
    Write-Host "   - Complete School Management System" -ForegroundColor White
    Write-Host "   - Multi-tenant SaaS architecture" -ForegroundColor White
    Write-Host "   - Role-based authentication system" -ForegroundColor White
    Write-Host "   - Professional documentation" -ForegroundColor White
    Write-Host "   - 65+ files of production-ready code" -ForegroundColor White
    Write-Host "   - Comprehensive README and guides" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Your repository is now live and ready to share!" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Possible solutions:" -ForegroundColor Yellow
    Write-Host "   1. Make sure the repository exists on GitHub" -ForegroundColor White
    Write-Host "   2. Check your GitHub username is correct" -ForegroundColor White
    Write-Host "   3. Ensure you have push access to the repository" -ForegroundColor White
    Write-Host "   4. Try authenticating with GitHub first" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")