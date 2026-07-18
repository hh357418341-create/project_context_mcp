@echo off
setlocal
title Project Context Web

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or later and try again.
  pause
  exit /b 1
)

if not exist "dist\cli.js" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo npm was not found. Install Node.js 22 or later and try again.
    pause
    exit /b 1
  )

  if not exist "node_modules" (
    echo Project dependencies are missing. Run "npm install" in this folder first.
    pause
    exit /b 1
  )

  echo Building Project Context...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build failed. Review the error above and try again.
    pause
    exit /b 1
  )
)

echo Starting Project Context Web...
echo Keep this window open while using the Web interface.
echo Press Ctrl+C or close this window to stop the service.
echo.

node "dist\cli.js" ui %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Project Context Web exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
