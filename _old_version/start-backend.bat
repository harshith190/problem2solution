@echo off
cd /d "%~dp0"
start "P2S Backend" cmd /k "npm run server"
