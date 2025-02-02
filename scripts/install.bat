@echo off
cd /d "%~dp0"
cd ..
for /f "tokens=1,2 delims==" %%a in ('type ".env" ^| findstr "^BACKEND_PORT="') do set BACKEND_PORT=%%b
call npm install -g pm2
cd .\youtube-dl-react-frontend
call npm install
call npm run build
cd ..
cd .\youtube-dl-express-backend
call npm install
call npm start
echo.
echo youtube-dl-react-viewer started on http://localhost:%BACKEND_PORT%
echo.
echo Usage:
echo   - Start the web app:  pm2 start youtube-dl-react-viewer
echo   - Stop the web app:   pm2 stop youtube-dl-react-viewer
echo   - View logs:          pm2 logs youtube-dl-react-viewer
pause >nul