@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy-demo-all.ps1" %*
set "DEPLOY_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %DEPLOY_EXIT%
