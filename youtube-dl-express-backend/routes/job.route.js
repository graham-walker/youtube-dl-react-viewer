import express from 'express';

import Video from '../models/video.model.js';
import Job from '../models/job.model.js';

import { search, getRandomVideo } from '../utilities/video.utility.js';

const router = express.Router();

router.get('/:_id', async (req, res) => {
    let job;
    try {
        job = await Job.findOne({
            _id: req.params._id,
        }, 'name statistics').populate('statistics.newestVideo');
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!job) return res.sendStatus(404);

    res.json({ job: job.toJSON() });
});

router.get('/:_id/:page', async (req, res) => {
    const page = parseInt(req.params.page) || 0;

    let job;
    try {
        job = await Job.findOne({
            _id: req.params._id,
        }, '_id');
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!job) return res.sendStatus(404);

    const filter = req.user?.hideShorts ? { jobDocument: job._id, isShort: false } : { jobDocument: job._id };

    let videos;
    let totals = {};
    try {
        videos = await search(req.query, page, filter, 'dateDownloaded', -1);
        totals.count = (await Video.countDocuments(filter)) || 0;
        totals.shorts = (await Video.countDocuments(Object.assign({ ...filter }, { isShort: true })) || 0)
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
