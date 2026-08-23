@echo off
rem 一键启动 personal-os（Next.js 开发服务器）并打开网页
cd /d "E:\我的项目\personal-os"
start "personal-os dev" cmd /k "npm run dev"
timeout /t 6 /nobreak >nul
start "" "http://localhost:3000/"
