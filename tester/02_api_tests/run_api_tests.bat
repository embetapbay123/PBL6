@echo off
setlocal
title PBL6 Testing - 2. API Tests (Node fetch)
color 0B
cd /d "%~dp0.."
echo ===============================================================================
echo        PBL6 - KIEM THU API TU DONG (API AUTOMATION TESTING)
echo ===============================================================================
echo  Server  : lay tu tester\config\server.config.json
echo  Bao cao : tester\reports\api\api.html
echo  Postman : tester\02_api_tests\postman\ (import vao Postman/Newman neu can)
echo ===============================================================================
echo.
node run-tests.mjs --suite api %*
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" (
  color 0C
  echo [CANH BAO] Co test case that bai - xem bao cao HTML.
) else (
  color 0A
  echo [HOAN TAT] Da sinh bao cao API Test.
)
echo.
pause
exit /b %CODE%
