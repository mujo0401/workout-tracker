@echo off
echo ========================================================
echo Starting Workout Tracker Application...
echo ========================================================

echo.
echo Choose which version to run:
echo 1. CPU Version (Lower performance, but more compatible)
echo 2. GPU Version (Higher performance, requires CUDA and GStreamer)
echo.

set /p backend_choice="Enter your choice (1 or 2): "

echo.
echo Killing any processes on ports 3000 and 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /PID %%a /F 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    taskkill /PID %%a /F 2>nul
)

echo.
echo Starting backend services...

:: Start the Python backend with virtual environment
if "%backend_choice%"=="1" (
    start cmd /k "cd backend && workout\Scripts\activate && python app.py"
    echo Starting CPU version of backend...
) else (
    start cmd /k "cd backend && workout\Scripts\activate && python cuda_app.py"
    echo Starting GPU-accelerated version of backend...
)

echo Waiting for backends to start...
timeout /t 5 /nobreak

echo Starting frontend development server...
start cmd /k "cd frontend && npm start"

echo.
echo ========================================================
echo All services started!
echo ========================================================
echo.
echo Node.js backend running at http://localhost:5000
if "%backend_choice%"=="1" (
    echo CPU backend running - expect ~15 FPS performance
) else (
    echo GPU-accelerated backend running - expect up to 30+ FPS with proper setup
)
echo Frontend running at http://localhost:3000
echo.
echo Keep this window open. Close it to stop all services.
echo Press any key to open the application in your browser...
pause > nul
start http://localhost:3000
echo.
echo You can close this window when you're done with the application.
echo.