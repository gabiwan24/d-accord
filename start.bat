@echo off
cd /d "%~dp0"

echo Ukulele Akkord Trainer - lokaler Start
echo.

if not exist "node_modules\" (
  echo Installiere Abhaengigkeiten...
  call npm install
  if errorlevel 1 (
    echo Fehler bei npm install.
    pause
    exit /b 1
  )
  echo.
)

echo Starte Entwicklungsserver...
echo Browser: http://localhost:5173
echo Beenden mit Strg+C
echo.

call npm run dev

pause
