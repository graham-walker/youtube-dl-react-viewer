import express from 'express';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs-extra';

import { parsedEnv } from '../parse-env.js';

import Video from '../models/video.model.js';
import Uploader from '../models/uploader.model.js';

import { search, getRandomVideo } from '../utilities/video.utility.js';
import { applyTags } from '../utilities/statistic.utility.js';
import { makeSafe, getTargetSquareSize } from '../utilities/file.utility.js';

const router = express.Router();
const avatarUpload = multer({ storage: multer.memoryStorage() });

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
        // Uploaders with 0 videos are playlist uploaders. They should not be shown since playlists are not searchable yet
        uploaders = await Uploader
            .find({}, '-_id extractor id name statistics.totalVideoCount'
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
        uploader = await applyTags(uploader, { count: -1 }, 5);
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

    const filter = req.user?.hideShorts ? { uploaderDocument: uploader._id, isShort: false } : { uploaderDocument: uploader._id };

    let videos;
    let totals = {};
    try {
        videos = await search(req.query, page, req.user, filter);
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

router.post('/:extractor/:id/upload_avatar', avatarUpload.single('avatar'), async (req, res) => {
    if (!req.user || !req.user.isSuperuser) return res.sendStatus(403);
    if (!req.file) return res.status(500).json({ error: 'Missing file' });

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
        const avatarDirectory = path.join(parsedEnv.OUTPUT_DIRECTORY, 'avatars', makeSafe(uploader.extractor, ' -'));
        const avatarFilename = makeSafe(uploader.id, '_') + '.jpg';

        fs.ensureDirSync(avatarDirectory);

        const targetSize = await getTargetSquareSize(req.file.buffer, 512);
        await sharp(req.file.buffer)
            .resize({
                fit: sharp.fit.cover,
                width: targetSize,
                height: targetSize,
            })
            .jpeg()
            .toFile(path.join(avatarDirectory, avatarFilename));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    return res.sendStatus(200);
});

export default router;
