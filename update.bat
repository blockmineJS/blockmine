@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "FROM_START=0"
set "UPDATE_BRANCH=master"
if /i "%~1"=="--from-start" (
    set "FROM_START=1"
    if not "%~2"=="" set "UPDATE_BRANCH=%~2"
) else if not "%~1"=="" (
    set "UPDATE_BRANCH=%~1"
)

if "%FROM_START%"=="0" title BlockMine update

if exist "%USERPROFILE%\.blockmine\update-requested.txt" (
    set /p UPDATE_BRANCH=<"%USERPROFILE%\.blockmine\update-requested.txt"
    del "%USERPROFILE%\.blockmine\update-requested.txt" >nul 2>&1
)
if "%UPDATE_BRANCH%"=="" set "UPDATE_BRANCH=master"

if "!UPDATE_BRANCH:~0,1!"=="-" goto bad_branch
if "!UPDATE_BRANCH:~0,1!"==";" goto bad_branch
if not "!UPDATE_BRANCH!"=="!UPDATE_BRANCH:..=!" goto bad_branch
set "BRANCH_OK=1"
for /f "delims=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._/-" %%C in ("!UPDATE_BRANCH!") do set "BRANCH_OK=0"
if "!BRANCH_OK!"=="0" goto bad_branch

if not exist "package.json" goto missing_repo
if not exist "backend\cli.js" goto missing_repo
if not exist ".git" goto not_git

where git >nul 2>&1
if errorlevel 1 goto git_missing

where node >nul 2>&1
if errorlevel 1 goto node_missing
for /f "delims=" %%M in ('node -p "parseInt(process.versions.node,10)" 2^>nul') do set "NODE_MAJOR=%%M"
if not defined NODE_MAJOR goto node_missing
if %NODE_MAJOR% LSS 22 goto node_old

where npm >nul 2>&1
if errorlevel 1 goto npm_missing

set "PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma/"
set "PRISMA_BINARIES_MIRROR=https://registry.npmmirror.com/-/binary/prisma/"
set "HUSKY=0"

echo.
echo ========================================
echo   BlockMine update  (!UPDATE_BRANCH!)
echo ========================================
echo.

if "%FROM_START%"=="1" goto fetch
echo [BlockMine] Stopping the panel...
taskkill /F /FI "WINDOWTITLE eq BlockMine" >nul 2>&1
call :free_ports

:fetch
echo [BlockMine] git fetch !UPDATE_BRANCH!
git fetch --quiet https://github.com/blockmineJS/blockmine.git +refs/heads/!UPDATE_BRANCH!:refs/panel-update/!UPDATE_BRANCH!
if errorlevel 1 goto update_failed
echo [BlockMine] restore package-lock.json
git checkout -- package-lock.json
if exist frontend\package-lock.json git checkout -- frontend/package-lock.json
echo [BlockMine] git merge --ff-only
git merge --ff-only refs/panel-update/!UPDATE_BRANCH!
if errorlevel 1 goto update_failed
echo [BlockMine] npm install
call npm install --no-fund --no-audit
if errorlevel 1 goto update_failed
echo [BlockMine] npm run build
call npm run build
if errorlevel 1 goto update_failed

if "%FROM_START%"=="1" exit /b 0

echo.
echo [BlockMine] Update finished. Starting panel...
call :free_ports
call "%~dp0start.bat"
exit /b

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

:update_failed
echo.
echo [BlockMine] Update failed.
echo [BlockMine] Only a fast-forward is applied. Local commits or edited files can block it.
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:bad_branch
echo [BlockMine] Branch name is not allowed: !UPDATE_BRANCH!
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:missing_repo
echo [BlockMine] Run update.bat from the BlockMine repository root.
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:not_git
echo [BlockMine] This folder is not a git clone. update.bat only works for a git install.
echo [BlockMine] For npx, update with: npx blockmine
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:git_missing
echo [BlockMine] Git was not found. Install Git and run update.bat again.
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:node_missing
echo [BlockMine] Node.js 22+ was not found. Run start.bat or install it from https://nodejs.org/
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:node_old
echo [BlockMine] Node.js %NODE_MAJOR% is too old. Need 22+.
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1

:npm_missing
echo [BlockMine] npm was not found. Reinstall Node.js from https://nodejs.org/
if "%FROM_START%"=="1" exit /b 1
pause
exit /b 1
