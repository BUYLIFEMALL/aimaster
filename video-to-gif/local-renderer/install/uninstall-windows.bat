@echo off
rem VideoToGIF local renderer - Windows uninstall (ffmpeg is not removed).
for %%B in ("Google\Chrome" "Chromium" "Microsoft\Edge" "Naver\Naver Whale") do reg delete "HKCU\Software\%%~B\NativeMessagingHosts\xyz.buylife.gif_renderer" /f >nul 2>&1
rmdir /s /q "%LOCALAPPDATA%\BuylifeGifRenderer" >nul 2>&1
echo Removed. Remove the browser extension in the extensions page
pause
