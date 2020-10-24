import express from 'express';

import Statistic from '../models/statistic.model.js';

const router = express.Router();

router.get('/', async (req, res) => {
    let statistic;
    try {
        statistic = await Statistic.findOne({ accessKey: 'videos' })
            .populate('recordViewCountVideo')
            .populate('recordLikeCountVideo')
            .populate('recordDislikeCountVideo')
            .populate('oldestVideo');
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

    statistic = statistic.toJSON();
    const returnTags = 5;
    statistic.tags.slice(0, returnTags);
    statistic.categories.slice(0, returnTags);
    statistic.hashtags.slice(0, returnTags);

    res.json({ statistic });
});

export default router;
