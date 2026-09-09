@echo off
title Servidor Local - Menos Ruido
cd /d "%~dp0"
echo ======================================================
echo    Iniciando servidor local de Menos Ruido...
echo    Se abrira automaticamente en tu navegador web.
echo    (Para detenerlo, simplemente cierra esta ventana)
echo ======================================================
echo.
call npx vite --open
pause
