@echo off
echo 🚀 School Management System - GitHub Setup
echo ==========================================

echo.
echo Step 1: Installing GitHub CLI...
echo Please wait while we install GitHub CLI...

REM Try winget first
winget install --id GitHub.cli --silent
if %errorlevel% equ 0 (
    echo ✅ GitHub CLI installed successfully!
    goto authenticate
)

echo ❌ Winget installation failed. Trying alternative method...

REM Try downloading directly
echo Downloading GitHub CLI...
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/cli/cli/releases/latest/download/gh_windows_amd64.msi' -OutFile 'gh_installer.msi'}"
if exist gh_installer.msi (
    echo Installing GitHub CLI...
    msiexec /i gh_installer.msi /quiet
    del gh_installer.msi
    echo ✅ GitHub CLI installed!
) else (
    echo ❌ Download failed. Please install manually from https://cli.github.com/
    pause
    exit /b 1
)

:authenticate
echo.
echo Step 2: Authenticating with GitHub...
gh auth login

echo.
echo Step 3: Creating repository...
gh repo create school-management-system --public --description "Complete Multi-Tenant School Management SaaS with Authentication" --source=. --remote=origin --push

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! Your repository has been created!
    echo 🌐 Repository URL: https://github.com/%USERNAME%/school-management-system
    echo.
    echo Your school management system is now live on GitHub!
) else (
    echo ❌ Repository creation failed. Please try manual setup.
)

echo.
pause