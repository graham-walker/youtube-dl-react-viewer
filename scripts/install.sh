#!/bin/bash
sudo apt-get update
sudo apt-get install xattr
sudo npm install -g pm2
cd -P -- "$(dirname -- "$0")"
cd ..
BACKEND_PORT=$(grep '^BACKEND_PORT=' .env | cut -d '=' -f2)
cd ./youtube-dl-react-frontend
npm install --unsafe-perm
npm run build
cd ..
cd ./youtube-dl-express-backend
npm install --unsafe-perm
npm start
echo
echo "youtube-dl-react-viewer started on http://localhost:$BACKEND_PORT"
echo
echo "Usage:"
echo "  - Start the web app:  pm2 start youtube-dl-react-viewer"
echo "  - Stop the web app:   pm2 stop youtube-dl-react-viewer"
echo "  - View logs:          pm2 logs youtube-dl-react-viewer"
echo "  - Run at pc startup:  pm2 startup youtube-dl-react-viewer"
echo