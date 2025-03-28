import express from 'express';

import User from '../models/user.model.js';
import Video from '../models/video.model.js';
import Activity from '../models/activity.model.js';

const router = express.Router();

router.get('/recall/:page', async function (req, res) {
    let user;
    try {
        user = await User.findOne({ _id: req.userId });
    } catch (err) {
        return res.sendStatus(401);
    }
    if (!user) return res.sendStatus(401);

    const page = parseInt(req.params.page) || 0;
    let activities;
    let count;
    try {
        activities = await Activity.find({ userDocument: user._id }).sort({ createdAt: -1 }).skip(page * 25).limit(25).populate({
            path: 'videoDocument',
            populate: {
                path: 'uploaderDocument'
            }
        });
        if (page === 0) count = await Activity.countDocuments({ userDocument: user._id });
    }
    catch (err) {
        return res.sendStatus(500);
    }

    res.json({
        activities,
        count,
        user: page === 0 ? user : undefined,
    });
});

router.post('/clear', async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId });
    } catch (err) {
        return res.sendStatus(401);
    }
    if (!user) return res.sendStatus(401);

    try {
        await Activity.deleteMany({ userDocument: user });
        res.sendStatus(200);
    } catch (err) {
        res.sendStatus(500);
    }
});

router.post('/update', async (req, res) => {
    let user;
    try {
        user = await User.findOne({ _id: req.userId });
    } catch (err) {
        return res.sendStatus(401);
    }
    if (!user) return res.sendStatus(401);

    switch (req.body.eventType) {
        case 'watched':
            if (!user.recordWatchHistory) return res.sendStatus(405);
            try {
                let activity = await Activity.findOne({
                    videoDocument: req.body.videoId,
                    userDocument: user._id,
                    eventType: req.body.eventType
                }).sort({ createdAt: -1 }).exec();
                let video = await Video.findOne({ _id: activity.videoDocument }, 'duration');
                activity.stopTime = Math.max(Math.min(req.body.stopTime, video.duration), 0);
                await activity.save();
            } catch (err) { return res.sendStatus(500); }
            break;
        default:
            return res.sendStatus(500);
    }

    res.sendStatus(200);
});

export default router;
