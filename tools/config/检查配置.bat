@echo off
chcp 65001 >nul
cd /d "%~dp0"
node export.cjs --check
if errorlevel 1 (echo 配置检查失败。)
pause
