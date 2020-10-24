import express from 'express';

import User from '../models/user.model.js';

const router = express.Router();

router.get('/settings', async (req, res) => {
    let user;
    try {
        user = await User.findOne(
            { _id: req.userId },
            '-_id username resumeVideos enableSponsorblock useCircularAvatars reportBytesUsingIec'
        );
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    res.json({ user: user.toJSON() });
});

router.post('/settings', async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId });
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.sendStatus(500);

    user.username = req.body.username;
    if (req.body.password) user.password = req.body.password;
    user.resumeVideos = req.body.resumeVideos;
    user.enableSponsorblock = req.body.enableSponsorblock;
    user.reportBytesUsingIec = req.body.reportBytesUsingIec;
    user.useCircularAvatars = req.body.useCircularAvatars;

    try {
        await user.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.json(req.body);
});

export default router;
