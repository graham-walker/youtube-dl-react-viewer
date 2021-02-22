import express from 'express';

import Statistic from '../models/statistic.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
    let statistic;
    try {
        statistic = await Statistic.findOne({ accessKey: 'videos' })
            .populate({
                path: 'statistics.recordViewCountVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.recordLikeCountVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.recordDislikeCountVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.oldestVideo',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            });
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!statistic) {
        try {
            statistic = await new Statistic().save();
        } catch (err) {
            return res.sendStatus(500);
        }
    }

    res.json({ statistic: statistic.toJSON().statistics });
});

export default router;
