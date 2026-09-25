@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
if /i "%~1"=="__open_browser__" goto open_browser
title BlockMine

set "FORCE_SETUP=0"
set "FORCE_BUILD=0"
if /i "%~1"=="reinstall" set "FORCE_SETUP=1"
if /i "%~1"=="--reinstall" set "FORCE_SETUP=1"
if /i "%~1"=="rebuild" set "FORCE_BUILD=1"
if /i "%~1"=="--rebuild" set "FORCE_BUILD=1"

set "PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma/"
set "PRISMA_BINARIES_MIRROR=https://registry.npmmirror.com/-/binary/prisma/"
set "HUSKY=0"
set "NODE_INSTALL_ATTEMPTED=0"

echo.
echo ========================================
echo   BlockMine  (dev)
echo ========================================
echo.

if not exist "package.json" goto missing_repo
if not exist "backend\cli.js" goto missing_repo

where node >nul 2>&1
if errorlevel 1 goto install_node
goto check_node_version

:install_node
if "%NODE_INSTALL_ATTEMPTED%"=="1" goto node_missing
set "NODE_INSTALL_ATTEMPTED=1"
echo [BlockMine] Node.js not found. Installing LTS via winget...
where winget >nul 2>&1
if errorlevel 1 goto node_missing
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity
if errorlevel 1 goto node_missing
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 goto node_missing

:check_node_version
for /f "delims=" %%M in ('node -p "parseInt(process.versions.node,10)" 2^>nul') do set "NODE_MAJOR=%%M"
if not defined NODE_MAJOR goto install_node
if %NODE_MAJOR% LSS 22 (
    echo [BlockMine] Node.js %NODE_MAJOR% is too old. Need 22+.
    goto install_node
)

echo [BlockMine] Node.js:
call node -v
where npm >nul 2>&1
if errorlevel 1 goto npm_missing

if "%FORCE_SETUP%"=="1" goto install_deps
if not exist "node_modules\" goto install_deps
echo [BlockMine] Dependencies already installed.
goto build_check

:install_deps
echo.
echo [BlockMine] Installing dependencies. First run can take several minutes...
call npm install --no-fund --no-audit
if errorlevel 1 goto deps_failed

:build_check
if "%FORCE_SETUP%"=="1" goto build
if "%FORCE_BUILD%"=="1" goto build
goto start_panel

:build
echo.
echo [BlockMine] Building the panel...
call npm run build
if errorlevel 1 goto build_failed

:start_panel
echo.
echo [BlockMine] Starting development mode...
echo [BlockMine] Panel: http://localhost:5173/
echo [BlockMine] API:   http://127.0.0.1:3001
echo [BlockMine] Browser will open when the panel is ready.
echo [BlockMine] Stop: Ctrl+C
echo.
start "BlockMine-open" /b cmd /c call "%~f0" __open_browser__
call npm run dev
set "EXITCODE=%ERRORLEVEL%"
if exist "%USERPROFILE%\.blockmine\update-requested.txt" goto do_update
echo.
echo [BlockMine] Stopped. Exit code: %EXITCODE%
pause
exit /b %EXITCODE%

:do_update
echo.
echo [BlockMine] Updating from GitHub...
set "UPDATE_BRANCH=master"
set /p UPDATE_BRANCH=<"%USERPROFILE%\.blockmine\update-requested.txt"
del "%USERPROFILE%\.blockmine\update-requested.txt" >nul 2>&1
if "%UPDATE_BRANCH%"=="" set "UPDATE_BRANCH=master"
echo [BlockMine] git fetch %UPDATE_BRANCH%
git fetch --quiet https://github.com/blockmineJS/blockmine.git %UPDATE_BRANCH%
if errorlevel 1 goto update_failed
echo [BlockMine] git merge --ff-only
git merge --ff-only FETCH_HEAD
if errorlevel 1 goto update_failed
echo [BlockMine] npm install
call npm install --no-fund --no-audit
if errorlevel 1 goto update_failed
echo [BlockMine] Update finished. Starting panel...
call :free_ports
goto start_panel

:update_failed
echo.
echo [BlockMine] Update failed.
pause
exit /b 1

:free_ports
echo [BlockMine] Waiting until ports 3001 and 5173 are free...
set /a _port_try=0
:free_ports_loop
set /a _port_try+=1
call :kill_port 3001
call :kill_port 5173
netstat -ano | findstr "LISTENING" | findstr ":3001 " >nul
if not errorlevel 1 (
    if %_port_try% LSS 20 (
        timeout /t 1 /nobreak >nul
        goto free_ports_loop
    )
)
netstat -ano | findstr "LISTENING" | findstr ":5173 " >nul
if not errorlevel 1 (
    if %_port_try% LSS 20 (
        timeout /t 1 /nobreak >nul
        goto free_ports_loop
    )
)
exit /b 0

:kill_port
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%~1 " ^| findstr "LISTENING"') do (
    if not "%%P"=="0" taskkill /F /T /PID %%P >nul 2>&1
)
exit /b 0

:open_browser
set /a _tries=0
:open_browser_wait
set /a _tries+=1
if %_tries% GTR 180 exit /b 0
curl.exe -s -o NUL --connect-timeout 1 http://127.0.0.1:3001/api/health >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto open_browser_wait
)
curl.exe -s -o NUL --connect-timeout 1 http://127.0.0.1:5173/ >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto open_browser_wait
)
start "" "http://localhost:5173/"
exit /b 0

:missing_repo
echo [BlockMine] Run start.bat from the BlockMine repository root.
pause
exit /b 1

:node_missing
echo.
echo [BlockMine] Node.js 22+ is required.
echo [BlockMine] Download: https://nodejs.org/
echo [BlockMine] Install it, close this window, then run start.bat again.
echo.
start https://nodejs.org/
pause
exit /b 1

:npm_missing
echo [BlockMine] npm was not found. Reinstall Node.js from https://nodejs.org/
pause
exit /b 1

:deps_failed
echo.
echo [BlockMine] Failed to install dependencies.
pause
exit /b 1

:build_failed
echo.
echo [BlockMine] Failed to build the panel.
pause
exit /b 1
