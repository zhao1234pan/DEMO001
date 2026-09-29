@echo off
chcp 65001 >nul
cd /d "%~dp0"
node export.cjs
if errorlevel 1 (echo 导表失败，请查看上方错误。)
pause
