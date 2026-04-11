@echo off
echo Killing all Node.js processes...

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im nodejs.exe >nul 2>&1

cd /d "D:\Projekt\Strava app\strava-dashboard"

if exist ".next" (
    rmdir /s /q .next
    echo .next folder cleared!
) else (
    echo .next folder not found.
)

echo All done! Running npn run dev
npm run dev
pause
