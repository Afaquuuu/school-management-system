@echo off
echo 🚀 Pushing School Management System to GitHub
echo =============================================

echo.
set /p repo_url="Enter your GitHub repository URL (https://github.com/YOUR_USERNAME/school-management-system.git): "

echo.
echo Adding GitHub remote...
git remote add origin %repo_url%

echo.
echo Renaming branch to main...
git branch -M main

echo.
echo Pushing code to GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! Your code has been pushed to GitHub!
    echo 🌐 Your repository is now live at: %repo_url%
    echo.
    echo ✅ What's now on GitHub:
    echo    - Complete School Management System
    echo    - Multi-tenant SaaS architecture  
    echo    - Role-based authentication
    echo    - Professional documentation
    echo    - 65+ files of production-ready code
    echo.
) else (
    echo ❌ Push failed. Please check your repository URL and try again.
)

echo.
pause