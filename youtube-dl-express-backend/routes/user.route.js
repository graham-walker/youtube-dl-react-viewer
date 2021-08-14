import express from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

import User from '../models/user.model.js';
import Activity from '../models/activity.model.js';

const router = express.Router();
const avatarUpload = multer({ storage: multer.memoryStorage() });

router.get('/settings', async (req, res) => {
    let user;
    try {
        user = await User.findOne(
            { _id: req.userId },
            '-_id username resumeVideos enableSponsorblock useCircularAvatars reportBytesUsingIec avatar recordWatchHistory'
        );
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    res.json({ user: user.toJSON() });
});

router.post('/settings', avatarUpload.single('avatar'), async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId },
            'username password isSuperuser resumeVideos enableSponsorblock useCircularAvatars reportBytesUsingIec avatar recordWatchHistory');
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
    user.enableSponsorblock = req.body.enableSponsorblock;
    user.reportBytesUsingIec = req.body.reportBytesUsingIec;
    user.useCircularAvatars = req.body.useCircularAvatars;
    user.recordWatchHistory = req.body.recordWatchHistory;

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
