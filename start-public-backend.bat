@echo off
echo ===================================================
echo   NeighborPlates - Public Cloudflare Tunnel and Backend
echo ===================================================
echo.
echo Starting Spring Boot Backend and Cloudflare Public Tunnel...
echo.

cd /d "%~dp0"

REM 1. Start Spring Boot in a separate terminal window
start "NeighborPlates Backend (Port 8081)" cmd /k "cd backend && mvn spring-boot:run"

REM 2. Start Cloudflare Tunnel in a separate terminal window
start "NeighborPlates Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --url http://localhost:8081"

echo.
echo [OK] Both Backend and Cloudflare Tunnel have been launched in separate windows!
echo Keep both windows open so mobile users can reach your backend.
echo ===================================================
pause
