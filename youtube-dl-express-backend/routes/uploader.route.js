import express from 'express';

import Video from '../models/video.model.js';
import Uploader from '../models/uploader.model.js';

import { sortBy, getRandomVideo } from '../utilities/video.utility.js';

const router = express.Router();

router.get('/:extractor/:name', async (req, res) => {
    let uploader;
    try {
        uploader = await Uploader.findOne({
            extractor: req.params.extractor,
            name: req.params.name
        });
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!uploader) return res.sendStatus(404);

    uploader = uploader.toJSON();
    const returnTags = 5;
    uploader.tags.slice(0, returnTags);
    uploader.categories.slice(0, returnTags);
    uploader.hashtags.slice(0, returnTags);

    res.json({ uploader });
});

router.get('/:extractor/:name/:page', async (req, res) => {
    const page = parseInt(req.params.page) || 0;
    const pattern = { extractor: req.params.extractor, uploader: req.params.name };

    let videos;
    let totals = {};
    try {
        totals.count = (await Video.countDocuments(pattern)) || 0;
        videos = await Video.find(pattern)
            .select('-_id extractor id title mediumResizedThumbnailFile directory uploader videoFile uploadDate duration width height viewCount')
            .sort(sortBy(req.query['sort']))
            .skip(page * parsedEnv.PAGE_SIZE)
            .limit(parsedEnv.PAGE_SIZE)
            .lean()
            .exec();
    } catch (err) {
        return res.sendStatus(500);
    }

    let randomVideo;
    try {
        randomVideo = await getRandomVideo(totals.count, pattern);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json({
        videos,
        totals,
        randomVideo,
    });
});

export default router;
