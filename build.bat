@echo off
cd /d "%~dp0"
echo [1/2] Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Frontend build failed!
    pause
    exit /b 1
)
echo [2/2] Building Tauri exe...
call npx tauri build
if %errorlevel% neq 0 (
    echo Tauri build failed!
    pause
    exit /b 1
)
echo.
echo Build complete! EXE is in src-tauri\target\release\
pause
