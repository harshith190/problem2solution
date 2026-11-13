@echo off
cd /d "%~dp0"
start "P2S Backend" cmd /k "npm run server"
start "P2S Frontend" cmd /k "npm run dev"
