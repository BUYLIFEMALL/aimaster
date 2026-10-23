@echo off
rem VideoToGIF local renderer - Windows installer launcher (no admin rights needed).
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
echo.
pause
