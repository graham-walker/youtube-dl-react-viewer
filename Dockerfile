FROM node:15-alpine3.12
USER 0

# Fetch packages required for building, as well as ffmpeg and python3 pip
RUN apk add --no-cache make build-base python2 ffmpeg py3-pip

# Copy source code into the docker daemon
WORKDIR /opt/youtube-dl-react-viewer
COPY . .

# Fetch dependencies and build frontend
WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-express-backend
RUN npm install --unsafe-perm

WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-react-frontend
RUN npm install --unsafe-perm
RUN cp .env.sample .env && npm run build

# Remove packages used for building
RUN apk del make build-base python2

# Change workdir to the backend folder
WORKDIR /opt/youtube-dl-react-viewer/youtube-dl-express-backend

# Change the default database hostname from localhost to 'db'
RUN sed -i 's/localhost:27017/db:27017/g' .env.sample

# Create the entrypoint shell script. This will read the .env.sample file, check if the user has specified these in the environment, write to a .env file, and spawn the backend
RUN echo '#!/bin/sh' >> docker-entrypoint.sh && \
    for EXPORT_FULL in $(cat .env.sample); \
    do EXPORT_NAME=$(echo $EXPORT_FULL | cut -d'=' -f 1); \
        echo "\
            if [[ -z \"\${$EXPORT_NAME}\" ]]; then \
                echo 'Using defaults for $EXPORT_FULL'; \
                echo '$EXPORT_FULL' >> .env; \
            else \
                echo \"Using user-defined value for $EXPORT_NAME=\${$EXPORT_NAME}\"; \
                echo \"$EXPORT_NAME=\${$EXPORT_NAME}\" >> .env; \
            fi" >> docker-entrypoint.sh ; \
    done && \
    echo 'node --require dotenv/config index.js' >> docker-entrypoint.sh && \
    chmod 755 docker-entrypoint.sh && \
    mv docker-entrypoint.sh /usr/local/bin/

EXPOSE 5000/tcp
HEALTHCHECK \
    --start-period=10s --interval=30s --timeout=2s --retries=3 \
    CMD nc -zv 127.0.0.1:5000
ENTRYPOINT ["docker-entrypoint.sh"]
