FROM node:20.19.5-alpine3.22
USER 0

# Get arguments from docker-compose.yaml
ARG BACKEND_PORT=5000
ARG YOUTUBE_DL_UPDATE_COMMAND

# Fetch packages required for building, as well as ffmpeg and python3 pip
RUN apk add --no-cache make build-base python3 ffmpeg py3-pip attr \
    && pip install --no-cache-dir --break-system-packages pipx

# Add pipx's bin directory to PATH
ENV PATH="/root/.local/bin:$PATH"

# Add yt-dlp using the update command if specified 
RUN if [ -n "$YOUTUBE_DL_UPDATE_COMMAND" ]; then eval "$YOUTUBE_DL_UPDATE_COMMAND"; fi

# Copy source code into the docker daemon
WORKDIR /opt/youtube-dl-react-viewer
COPY . .

# Throw an error if the .env file does not exist since it contains required values
RUN if [ ! -f .env ]; then \
        echo "Error: .env file not found!" >&2; \
        exit 1; \
    fi

# Ensure the .env file ends with a newline
RUN [ "$(tail -c1 < .env)" != "" ] && echo "" >> .env || true

# Inform the web app that it is running in a Docker container
RUN echo 'RUNNING_IN_DOCKER=true' >> .env
RUN echo 'REACT_APP_RUNNING_IN_DOCKER=true' >> .env

# Fetch dependencies and build frontend
WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-express-backend
RUN npm install --unsafe-perm

WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-react-frontend
RUN npm install --unsafe-perm
RUN npm run build

# Remove packages used for building
RUN apk del make build-base

# Change workdir to the backend folder
WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-express-backend

# Create the entrypoint shell script
RUN echo '#!/bin/sh' >> docker-entrypoint.sh && \
    echo 'node --require dotenv/config index.js' >> docker-entrypoint.sh && \
    chmod 755 docker-entrypoint.sh && \
    mv docker-entrypoint.sh /usr/local/bin/

# Expose the backend service port for TCP traffic
EXPOSE ${BACKEND_PORT}/tcp

# Define a health check for the container
HEALTHCHECK \
    --start-period=10s --interval=30s --timeout=2s --retries=3 \
    CMD nc -zv 127.0.0.1:${BACKEND_PORT}

# Set the entrypoint for the container to docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
