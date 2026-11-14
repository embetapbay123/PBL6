@echo off
setlocal
title PBL6 Testing - 5. Security Tests (black-box)
color 0B
cd /d "%~dp0.."
echo ===============================================================================
echo        PBL6 - KIEM THU BAO MAT HOP DEN (SECURITY TESTING)
echo ===============================================================================
echo  Pham vi : xac thuc, phan quyen, injection, header, cookie, ro ri du lieu
echo  Bao cao : tester\reports\security\security.html
echo ===============================================================================
echo.
node run-tests.mjs --suite security %*
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" (
  color 0C
  echo [CANH BAO] Co test case that bai - xem bao cao HTML.
) else (
  color 0A
  echo [HOAN TAT] Da sinh bao cao Security Test.
)
echo.
pause
exit /b %CODE%
