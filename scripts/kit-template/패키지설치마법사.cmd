@echo off
rem AIMaster package install wizard (Windows) - double-click this file
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0KIT\setup.ps1"
echo.
pause
