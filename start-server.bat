@echo off
REM Eco-Energy Application Server Startup Script (Windows)

echo ===================================
echo   Eco-Energy Application Server
echo ===================================
echo.

REM Check if we're in the right directory
if not exist "firebase-login\index.html" (
    echo Error: Please run this script from the Eco-Energy project root directory
    pause
    exit /b 1
)

REM Navigate to firebase-login directory
cd firebase-login

REM Check for Python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting Python HTTP server on port 8000...
    echo Open your browser to: http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
    goto :end
)

REM Check for Node.js http-server
where http-server >nul 2>&1
if %errorlevel% == 0 (
    echo Starting Node.js http-server on port 8000...
    echo Open your browser to: http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    http-server -p 8000
    goto :end
)

REM Check for PHP
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting PHP server on port 8000...
    echo Open your browser to: http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    php -S localhost:8000
    goto :end
)

echo Error: No suitable server found!
echo.
echo Please install one of the following:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo   - PHP: https://www.php.net/downloads.php
echo.
echo Or manually start a server in the firebase-login directory
pause

:end

