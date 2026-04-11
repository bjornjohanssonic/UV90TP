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

echo All done! Starting development server...
start "" cmd /k "npm run dev"

timeout /t 10 /nobreak >nul

echo Launching localhost:3000 in Edge (app mode)...
rem Option 1: using full path (more reliable)
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000"

rem Option 2: using start msedge (works if Edge is in PATH)
rem start "" msedge --app="http://localhost:3000"

echo Ready!
pause
