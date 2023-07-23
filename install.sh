sudo apt-get update
sudo apt-get install xattr
sudo npm install -g pm2
cd -P -- "$(dirname -- "$0")"
cd ./youtube-dl-react-frontend
npm install --unsafe-perm
npm run build
cd ..
cd ./youtube-dl-express-backend
npm install --unsafe-perm
echo "Build complete. Run start-server.sh to launch the web app..."