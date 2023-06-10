import express from 'express';

import Statistic from '../models/statistic.model.js';

import { applyTags } from '../utilities/statistic.utility.js';

const router = express.Router();

router.get('/', async (req, res) => {
    let statistic;
    try {
        statistic = await Statistic.findOne({ accessKey: 'videos' })
            .populate({
                path: 'statistics.recordViewCountVideo',
                select: '-_id extractor id title uploader duration directory mediumResizedThumbnailFile viewCount width height uploaderDocument',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.recordLikeCountVideo',
                select: '-_id extractor id title uploader duration directory mediumResizedThumbnailFile viewCount width height uploaderDocument',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.recordDislikeCountVideo',
                select: '-_id extractor id title uploader duration directory mediumResizedThumbnailFile viewCount width height uploaderDocument',
                populate: { path: 'uploaderDocument', select: 'extractor id name' },
            })
            .populate({
                path: 'statistics.oldestVideo',
                select: '-_id extractor id title uploader duration directory mediumResizedThumbnailFile viewCount width height uploaderDocument',
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

    try {
        statistic = statistic.toJSON();
        statistic = await applyTags(statistic, { count: -1 }, 10);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json({ statistic: statistic.statistics });
});

router.get('/tags', async (req, res) => {
    let statistic;
    try {
        statistic = await Statistic.findOne({ accessKey: 'videos' }, '_id');
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

    try {
        statistic = statistic.toJSON();
        statistic.statistics = {};
        statistic = await applyTags(statistic);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json(statistic.statistics);
});

export default router;
