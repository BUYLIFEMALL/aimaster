@echo off
rem VideoToGIF local renderer - Windows uninstall (ffmpeg is not removed).
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\xyz.buylife.gif_renderer" /f >nul 2>&1
rmdir /s /q "%LOCALAPPDATA%\BuylifeGifRenderer" >nul 2>&1
echo Removed. Remove the Chrome extension in chrome://extensions
pause
