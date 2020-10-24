import express from 'express';
import path from 'path';
import slash from 'slash';

import Video from '../models/video.model.js';

import {
    sortBy,
    getTotals,
    getRandomVideo,
    fields,
    getSimilarVideos,
} from '../utilities/video.utility.js';

const router = express.Router();

router.get('/search/:page', async function (req, res) {
    const page = parseInt(req.params.page) || 0;
    let pattern = {};
    let options = {};
    if (req.query.search) {
        pattern = { $text: { $search: req.query.search } };
        options = { score: { $meta: 'textScore' } };
    }

    let videos;
    try {
        videos = await Video.find(pattern, options)
            .select('-_id extractor id title mediumResizedThumbnailFile directory uploader videoFile uploadDate duration width height viewCount')
            .sort(sortBy(req.query['sort'], req.query.search))
            .skip(page * parseInt(process.env.PAGE_SIZE))
            .limit(parseInt(process.env.PAGE_SIZE))
            .lean()
            .exec();
    } catch (err) {
        return res.sendStatus(500);
    }

    let totals;
    let randomVideo;
    if (page === 0) {
        try {
            totals = await getTotals(pattern);
        } catch (err) {
            return res.sendStatus(500);
        }
        try {
            randomVideo = await getRandomVideo(totals.count, pattern, options);
        } catch (err) {
            return res.sendStatus(500);
        }
    }

    res.json({
        videos,
        totals,
        randomVideo,
    });
});

router.get('/:extractor/:id', async (req, res) => {
    let video;
    let uploaderVideos;
    let playlistVideos;
    let jobVideos;
    try {
        video = (await Video.findOne({
            extractor: req.params.extractor,
            id: req.params.id
        }, 'id extractor viewCount uploadDate videoFile directory resolution'
        + ' uploaderDocument fps webpageUrl dateDownloaded width height'
        + ' likeCount dislikeCount subtitleFiles jobDocument mediumResizedThumbnailFile'
        + ' license ageLimit seasonNumber episodeNumber trackNumber discNumber'
        + ' releaseYear format tbr asr vbr vcodec acodec ext ' + fields
        )
            .populate('uploaderDocument jobDocument')
            .exec()
        )?.toJSON();
        if (!video) return res.sendStatus(404);

        if (video.uploader) uploaderVideos = await Video.find(
            { uploader: video.uploader },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height')
            .sort({ uploadDate: -1 })
            .lean()
            .exec();

        if (video.playlist) playlistVideos = await Video.find(
            { playlist: video.playlist },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height')
            .sort({ playlistIndex: 1 })
            .lean()
            .exec();

        jobVideos = await Video.find(
            { jobDocument: video.jobDocument },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height')
            .sort({ dateDownloaded: -1 })
            .lean()
            .exec();

    } catch (err) {
        return res.sendStatus(500);
    }

    let similarVideos;
    try {
        similarVideos = await getSimilarVideos(video);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json({
        video,
        uploaderVideos,
        playlistVideos,
        jobVideos,
        similarVideos,
        localVideoPath: slash(path.join(process.env.OUTPUT_DIRECTORY, 'videos', video.directory, video.videoFile.name)),
    });
});

export default router;
