import express from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

import { parsedEnv } from '../parse-env.js';

import User from '../models/user.model.js';
import Activity from '../models/activity.model.js';
import { getTargetSquareSize } from '../utilities/file.utility.js';

const router = express.Router();
const avatarUpload = multer({ storage: multer.memoryStorage() });

export const settingsFields = 'avatar desktopPlayerSettings tabletPlayerSettings mobilePlayerSettings hideShorts useLargeLayout fitThumbnails useCircularAvatars useGradientEffect reportBytesUsingIec recordWatchHistory showWatchedHistory resumeVideos enableSponsorblock onlySkipLocked skipSponsor skipSelfpromo skipInteraction skipIntro skipOutro skipPreview skipFiller skipMusicOfftopic enableReturnYouTubeDislike';

router.get('/settings', async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId }, '-_id username isSuperuser ' + settingsFields);
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    res.json({ user: user.toJSON() });
});

router.post('/settings', async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId }, 'username password isSuperuser ' + settingsFields);
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    user.username = req.body.username;
    if (req.body.password) user.password = req.body.password;
    user.desktopPlayerSettings = req.body.desktopPlayerSettings;
    user.tabletPlayerSettings = req.body.tabletPlayerSettings;
    user.mobilePlayerSettings = req.body.mobilePlayerSettings;
    user.hideShorts = req.body.hideShorts;
    user.useLargeLayout = req.body.useLargeLayout;
    user.fitThumbnails = req.body.fitThumbnails;
    user.useCircularAvatars = req.body.useCircularAvatars;
    user.useGradientEffect = req.body.useGradientEffect;
    user.reportBytesUsingIec = req.body.reportBytesUsingIec;
    user.recordWatchHistory = req.body.recordWatchHistory;
    user.showWatchedHistory = req.body.showWatchedHistory;
    user.resumeVideos = req.body.resumeVideos;
    user.enableSponsorblock = req.body.enableSponsorblock;
    user.onlySkipLocked = req.body.onlySkipLocked;
    user.skipSponsor = req.body.skipSponsor;
    user.skipSelfpromo = req.body.skipSelfpromo;
    user.skipInteraction = req.body.skipInteraction;
    user.skipIntro = req.body.skipIntro;
    user.skipOutro = req.body.skipOutro;
    user.skipPreview = req.body.skipPreview;
    user.skipFiller = req.body.skipFiller;
    user.skipMusicOfftopic = req.body.skipMusicOfftopic;
    user.enableReturnYouTubeDislike = req.body.enableReturnYouTubeDislike;

    if (!user.recordWatchHistory) {
        try {
            await Activity.deleteMany({ userDocument: user });
        } catch (err) {
            return res.sendStatus(500);
        }
    }

    try {
        await user.save();
    } catch (err) {
        return res.sendStatus(500);
    }

    user = user.toJSON();
    delete user._id;
    delete user.password;
    delete user.updatedAt;

    res.json(user);
});

router.post('/upload_avatar', avatarUpload.single('avatar'), async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId }, 'username password isSuperuser ' + settingsFields);
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    if (!req.file) return res.status(500).json({ error: 'Missing file' });

    const avatarDirectory = path.join(parsedEnv.OUTPUT_DIRECTORY, 'users', 'avatars');
    const avatar = uuidv4() + '.webp';
    try {
        fs.ensureDirSync(avatarDirectory);

        // Resize uploaded image
        const targetSize = await getTargetSquareSize(req.file.buffer, 256);
        await sharp(req.file.buffer)
            .resize({
                fit: sharp.fit.cover,
                width: targetSize,
                height: targetSize,
            })
            .webp({ quality: 100, lossless: true })
            .toFile(path.join(avatarDirectory, avatar));

        // Remove old avatar image
        if (user.avatar && fs.existsSync(path.join(avatarDirectory, user.avatar))) fs.unlinkSync(path.join(avatarDirectory, user.avatar));

        // Save user
        user.avatar = avatar;
        await user.save();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    return res.status(200).json({ avatar });
});

export default router;
