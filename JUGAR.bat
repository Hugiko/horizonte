@echo off
chcp 65001 >nul
title HORIZONTE - La Segunda Tormenta
cd /d "%~dp0"
echo.
echo   =============================================
echo      HORIZONTE  ^|  La Segunda Tormenta
echo   =============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   No se ha encontrado Node.js. Instalandolo...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo   No se pudo instalar. Descarga Node.js LTS de https://nodejs.org y vuelve a abrir JUGAR.bat
    pause
    exit /b 1
  )
  echo   Node.js instalado. Cierra esta ventana y vuelve a abrir JUGAR.bat
  pause
  exit /b 0
)

if not exist "node_modules\" (
  echo   Primera vez: instalando componentes del juego. Tarda un par de minutos...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo   Ha fallado la instalacion. Comprueba internet y vuelve a intentarlo.
    pause
    exit /b 1
  )
)

echo   Preparando el juego...
call npm run build >nul
if errorlevel 1 (
  echo   Error al preparar el juego.
  call npm run build
  pause
  exit /b 1
)

echo   Arrancando... se abrira el navegador. Para cerrar el juego, cierra esta ventana.
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"
node server\index.js
pause
