@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  start "" http://localhost:8000
  py -m http.server 8000
) else (
  where python >nul 2>&1
  if %errorlevel%==0 (
    start "" http://localhost:8000
    python -m http.server 8000
  ) else (
    echo Python nao encontrado. Abra ABRIR_SITE.bat para usar a demonstracao offline.
    pause
  )
)
