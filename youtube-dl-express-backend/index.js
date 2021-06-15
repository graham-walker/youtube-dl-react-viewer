import fs from 'fs-extra';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

import authRouter from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import videoRouter from './routes/video.route.js';
import uploaderRouter from './routes/uploader.route.js';
import playlistRouter from './routes/playlist.route.js'
import statisticRouter from './routes/statistic.route.js';
import adminRouter from './routes/admin.route.js';

import authenticationMiddleware from './middleware/authentication.middleware.js';
import globalPasswordMiddleware from './middleware/global-password.middleware.js';
import superuserMiddleware from './middleware/superuser.middleware.js';

import User from './models/user.model.js';

import parsed from './parse-env.js';
import applyUpdates from './utilities/update.utility.js';

(async () => {
    // Parse environment variables
    if (parsed.err) throw parsed.err;
    global.parsedEnv = parsed.env;

    // Connect to the database
    await mongoose.connect(parsedEnv.MONGOOSE_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
    });

    // Apply updates when the version number changes
    await applyUpdates();

    // Create the express server
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(cookieParser());

    // Add routes to the server
    app.use('/api/auth', globalPasswordMiddleware, authRouter);
    app.use('/api/users', [globalPasswordMiddleware, authenticationMiddleware], userRouter);
    app.use('/api/videos', globalPasswordMiddleware, videoRouter);
    app.use('/api/uploaders', globalPasswordMiddleware, uploaderRouter);
    app.use('/api/playlists', globalPasswordMiddleware, playlistRouter);
    app.use('/api/statistics', globalPasswordMiddleware, statisticRouter);
    app.use('/api/admin', [globalPasswordMiddleware, authenticationMiddleware, superuserMiddleware], adminRouter);

    const staticFolders = ['videos', 'thumbnails', 'avatars', 'users/avatars'];
    const outputDirectory = parsedEnv.OUTPUT_DIRECTORY;

    // Create the static folders
    for (let folder of staticFolders) {
        fs.ensureDirSync(path.join(outputDirectory, folder));
        app.use('/static/' + folder, globalPasswordMiddleware, express.static(path.join(outputDirectory, folder)));
    }

    // Transcode videos
    app.use('/transcoded/videos', globalPasswordMiddleware, (req, res) => {
        res.contentType('webm');
        const videoPath = path.join(outputDirectory, 'videos', decodeURIComponent(req.path));
        ffmpeg(videoPath)
            .format('webm')
            .videoBitrate(3500)
            .audioBitrate(128)
            .on('error', function (err) {
                if (parsedEnv.VERBOSE) console.error(err)
            })
            .pipe(res, { end: true });
    });

    // Serve the react app build in production
    if (parsedEnv.NODE_ENV === 'production') {
        app.use(express.static('../youtube-dl-react-frontend/build'));
        app.get('*', (req, res) => {
            res.sendFile(path.join(
                path.join(process.cwd(), '../youtube-dl-react-frontend/build/index.html')
            ));
        });
    }

    // Start the server
    const backendPort = parsedEnv.BACKEND_PORT;
    app.listen(backendPort, () => {
        console.log('Server started on port:', backendPort);
    });

    // Create the superuser
    const superuserUsername = parsedEnv.SUPERUSER_USERNAME;
    const superuserPassword = parsedEnv.SUPERUSER_PASSWORD;
    const user = new User({
        username: superuserUsername,
        password: superuserPassword,
        isSuperuser: true
    });
    user.save(function (err) {
        if (err && (err.name !== 'MongoError' || err.code !== 11000)) {
            throw err;
        }
    });
})().catch(err => {
    console.error(err);
    process.exit(1);
});
