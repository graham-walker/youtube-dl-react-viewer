cd -P -- "$(dirname -- "$0")"
cd ./youtube-dl-react-frontend
npm install --unsafe-perm
npm run build
cd ..
cd ./youtube-dl-express-backend
apt-get install xattr
npm install -g pm2
npm install --unsafe-perm
echo "Dependencies installed. Run start-server.sh to launch the web app..."