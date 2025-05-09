import express from 'express';

import Video from '../models/video.model.js';
import Playlist from '../models/playlist.model.js';

import { search, getRandomVideo } from '../utilities/video.utility.js';

const router = express.Router();

router.get('/:extractor/:id', async (req, res) => {
    let playlist;
    try {
        playlist = await Playlist.findOne({
            extractor: req.params.extractor,
            id: req.params.id,
        }, 'extractor name uploaderName statistics description').populate('statistics.newestVideo');
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!playlist) return res.sendStatus(404);

    res.json({ playlist: playlist.toJSON() });
});

router.get('/:extractor/:id/:page', async (req, res) => {
    const page = parseInt(req.params.page) || 0;

    let playlist;
    try {
        playlist = await Playlist.findOne({
            extractor: req.params.extractor,
            id: req.params.id,
        });
    }
    catch (err) {
        return res.sendStatus(500);
    }
    if (!playlist) return res.sendStatus(404);

    const filter = req.user?.hideShorts ? { playlistDocument: playlist._id, isShort: false } : { playlistDocument: playlist._id };

    let videos;
    let totals = {};
    try {
        videos = await search(req.query, page, req.user, filter, 'playlistIndex', 1);
        totals.count = (await Video.countDocuments(filter)) || 0;
        totals.shorts = (await Video.countDocuments(Object.assign({ ...filter }, { isShort: true })) || 0)
    } catch (err) {
        return res.sendStatus(500);
    }

    let randomVideo;
    try {
        randomVideo = await getRandomVideo({}, filter);
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
