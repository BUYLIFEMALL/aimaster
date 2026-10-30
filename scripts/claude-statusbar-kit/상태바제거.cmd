@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo node를 찾을 수 없습니다.& pause & exit /b 1)
node "%~dp0install.js" --uninstall
pause
