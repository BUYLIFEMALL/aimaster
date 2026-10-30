@echo off
chcp 65001 >nul
where node >nul 2>nul || (echo node를 찾을 수 없습니다. https://nodejs.org 에서 LTS 버전을 설치해 주세요.& pause & exit /b 1)
node "%~dp0install.js"
pause
