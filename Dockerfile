FROM node:15-alpine3.12
USER 0

# Fetch packages required for building, as well as ffmpeg and python3 pip
RUN apk add --no-cache git make build-base python2 ffmpeg py3-pip

# Copy source code into the docker daemon
WORKDIR /opt/youtube-dl-react-viewer
COPY . .

# Change workdir to the backend folder
WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-express-backend

# Modify the configuration
RUN cp .env.sample .env && \
    sed -i 's/localhost:27017/db:27017/g' .env

# Fetch dependencies
RUN npm install --unsafe-perm
RUN cd ../youtube-dl-react-frontend && \
    npm install --unsafe-perm

# Build frontend
RUN cd ../youtube-dl-react-frontend && \
    cp .env.sample .env && \
    npm run build

# Remove packages used for building
RUN apk del git make build-base python2

EXPOSE 5000/tcp
HEALTHCHECK \
    --start-period=10s --interval=30s --timeout=2s --retries=3 \
    CMD nc -zv 127.0.0.1:5000
ENTRYPOINT ["node", "--require", "dotenv/config", "index.js"]
