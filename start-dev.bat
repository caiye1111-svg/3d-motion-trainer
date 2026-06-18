@echo off
cd /d "E:\Hermes\3d-motion-trainer"
echo ========================================
echo   3D Motion Sickness Trainer
echo   正在启动开发服务器...
echo ========================================
echo.
echo 编译完成后浏览器访问:
echo   http://localhost:6789
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.
call npx next dev -p 6789
pause
