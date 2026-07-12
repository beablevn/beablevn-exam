@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

rem pushd %~dp0 = chuyen den thu muc chua file bat (xu ly duoc ky tu dac biet trong ten thu muc)
pushd "%~dp0"

echo ========================================
echo  BUILD + DEPLOY BAVN EXAM
echo ========================================
echo.

rem === STEP 1: npm run build ===
echo [1/3] npm run build...
echo.
npm run build
set BUILD_CODE=!ERRORLEVEL!

if !BUILD_CODE! NEQ 0 (
    echo.
    echo *** BUILD FAILED (exit code !BUILD_CODE!) ***
    popd & pause & exit /b 1
)

if not exist "dist\index.html" (
    echo.
    echo *** dist\index.html KHONG TON TAI sau build! ***
    popd & pause & exit /b 1
)
echo BUILD OK.
echo.

rem === STEP 2: firebase deploy ===
echo [2/3] firebase deploy --only hosting...
echo.
firebase deploy --only hosting
set FIRE_CODE=!ERRORLEVEL!

if !FIRE_CODE! NEQ 0 (
    echo.
    echo *** FIREBASE DEPLOY FAILED ***
    popd & pause & exit /b 1
)
echo FIREBASE DEPLOY OK.
echo.

rem === STEP 3: git commit + push ===
echo [3/3] git commit + push...
git add -A
set /p COMMIT_MSG="Nhap commit message (Enter de bo qua commit): "
if not "!COMMIT_MSG!"=="" (
    git commit -m "!COMMIT_MSG!"
    git push company main
    git push personal main
) else (
    echo Khong commit. Chi deploy.
)

echo.
echo ========================================
echo  XONG! https://beablevn-exam.web.app
echo  Nho Ctrl+Shift+R de xoa cache.
echo ========================================
echo.
popd
pause
