@echo off
cd /d "%~dp0"
call npm install -g pm2
cd .\youtube-dl-react-frontend
call npm install
call npm run build
cd ..
cd .\youtube-dl-express-backend
call npm install
echo Build complete. Run start-server.bat to launch the web app...
pause >nul