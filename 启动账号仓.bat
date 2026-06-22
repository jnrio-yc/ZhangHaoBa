@echo off
chcp 65001 >nul
title 账号仓
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

REM 1) 若已构建发布版，直接运行（无控制台、秒开）
set "APP_EXE="
for %%f in ("src-tauri\target\release\*.exe") do set "APP_EXE=%%f"

if defined APP_EXE (
    echo 正在启动账号仓...
    start "" "%APP_EXE%"
    exit /b
)

REM 2) 否则以开发模式启动（首次编译 Rust 需要几分钟，请勿关闭此窗口）
echo 正在以开发模式启动账号仓...
echo 首次编译 Rust 后端需要几分钟，请勿关闭此窗口。编译完成后会自动弹出应用窗口。
echo.
call npm run tauri dev

if errorlevel 1 (
    echo.
    echo ============================================
    echo 启动失败。请确认：
    echo   1. VS Build Tools（C++ 工作负载）已安装完成
    echo   2. Rust 工具链已安装
    echo 若 Build Tools 仍在安装中，请等其完成后再双击本文件。
    echo ============================================
    pause
)
