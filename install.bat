@echo off
cd .\youtube-dl-react-frontend
call npm install
call npm run build
cd ..
cd .\youtube-dl-express-backend
call npm install -g pm2 
call npm install
echo Dependencies installed. Run start-server.bat to launch the web app...
pause >nul