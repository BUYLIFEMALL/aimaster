@echo off
rem VideoToGIF local renderer - Chrome starts this file; it runs host.ps1 with the built-in Windows PowerShell.
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0host.ps1" %*
