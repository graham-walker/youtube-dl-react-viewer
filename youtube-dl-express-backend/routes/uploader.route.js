import express from 'express';

import Video from '../models/video.model.js';
import Uploader from '../models/uploader.model.js';

import { search, getRandomVideo } from '../utilities/video.utility.js';
import { applyTags } from '../utilities/statistic.utility.js';

const router = express.Router();

router.get('/page/:page', async (req, res) => {
    const perPage = 18;
    let uploaders;
    let totalWebsites;
    let totalUploaders;
    let maxPages;
    let page = parseInt(req.params.page);

    if (isNaN(page)) return res.sendStatus(404);
    page--;
    if (page < 0) return res.sendStatus(404);

    try {
        uploaders = await Uploader
            .find({}, '-_id extractor id name playlistCreatedCount statistics.totalVideoCount'
                + ' statistics.totalVideoFilesize statistics.newestVideoDateUploaded')
            .collation({ locale: 'en' })
            .sort({ name: 1 })
            .skip(page * perPage)
            .limit(perPage)
            .lean()
            .exec();
        totalWebsites = (await Uploader.distinct('extractor')).length;
        totalUploaders = await Uploader.countDocuments();
        maxPages = Math.ceil(totalUploaders / perPage);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json({
        uploaders: uploaders,
        totalWebsites: totalWebsites,
        totalUploaders: totalUploaders,
        maxPages: maxPages
    });
});

router.get('/:extractor/:id', async (req, res) => {
    let uploader;
    try {
        uploader = await Uploader.findOne({
            extractor: req.params.extractor,
            id: req.params.id,
        });
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!uploader) return res.sendStatus(404);

    try {
        uploader = uploader.toJSON();
        uploader = await applyTags(uploader, { count: -1 }, 10);
    } catch (err) {
        res.sendStatus(500);
    }

    res.json({ uploader });
});

router.get('/:extractor/:id/:page', async (req, res) => {
    const page = parseInt(req.params.page) || 0;

    let uploader;
    try {
        uploader = await Uploader.findOne({
            extractor: req.params.extractor,
            id: req.params.id,
        });
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!uploader) return res.sendStatus(404);

    const filter = { uploaderDocument: uploader._id };

    let videos;
    let totals = {};
    try {
        videos = await search(req.query, page, filter);
        totals.count = (await Video.countDocuments(filter)) || 0;
    } catch (err) {
        return res.sendStatus(500);
    }

    let randomVideo;
    try {
        randomVideo = await getRandomVideo({}, totals.count, filter);
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
