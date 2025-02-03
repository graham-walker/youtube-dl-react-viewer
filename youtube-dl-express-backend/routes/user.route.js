import express from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

import { parsedEnv } from '../parse-env.js';

import User from '../models/user.model.js';
import Activity from '../models/activity.model.js';

const router = express.Router();
const avatarUpload = multer({ storage: multer.memoryStorage() });

export const settingsFields = 'hideShorts resumeVideos enableSponsorblock enableReturnYouTubeDislike useCircularAvatars reportBytesUsingIec avatar recordWatchHistory onlySkipLocked skipSponsor skipSelfpromo skipInteraction skipIntro skipOutro skipPreview skipFiller skipMusicOfftopic useLargeLayout fitThumbnails';

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

router.post('/settings', avatarUpload.single('avatar'), async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId }, 'username password isSuperuser ' + settingsFields);
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    if (req.file) {
        try {
            const avatarDirectory = path.join(parsedEnv.OUTPUT_DIRECTORY, 'users/avatars');
            const avatar = uuidv4() + '.webp';
            fs.ensureDirSync(avatarDirectory);
            await sharp(req.file.buffer)
                .resize({
                    fit: sharp.fit.cover,
                    width: 256,
                    height: 256,
                })
                .webp({ quality: 100, lossless: true })
                .toFile(path.join(avatarDirectory, avatar));
            if (user.avatar && fs.existsSync(path.join(avatarDirectory, user.avatar))) fs.unlinkSync(path.join(avatarDirectory, user.avatar));
            user.avatar = avatar;
        } catch (err) {
            return res.status(500).json({ error: 'Failed to change profile image' });
        }
    }

    user.username = req.body.username;
    if (req.body.password) user.password = req.body.password;
    user.resumeVideos = req.body.resumeVideos;
    user.hideShorts = req.body.hideShorts;
    user.enableSponsorblock = req.body.enableSponsorblock;
    user.enableReturnYouTubeDislike = req.body.enableReturnYouTubeDislike;
    user.reportBytesUsingIec = req.body.reportBytesUsingIec;
    user.useCircularAvatars = req.body.useCircularAvatars;
    user.recordWatchHistory = req.body.recordWatchHistory;
    user.onlySkipLocked = req.body.onlySkipLocked;
    user.skipSponsor = req.body.skipSponsor;
    user.skipSelfpromo = req.body.skipSelfpromo;
    user.skipInteraction = req.body.skipInteraction;
    user.skipIntro = req.body.skipIntro;
    user.skipOutro = req.body.skipOutro;
    user.skipPreview = req.body.skipPreview;
    user.skipFiller = req.body.skipFiller;
    user.skipMusicOfftopic = req.body.skipMusicOfftopic;
    user.useLargeLayout = req.body.useLargeLayout;
    user.fitThumbnails = req.body.fitThumbnails;

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

export default router;
