import express from 'express';
import path from 'path';
import slash from 'slash';

import Video from '../models/video.model.js';

import {
    search,
    getTotals,
    getRandomVideo,
    fields,
    getSimilarVideos,
    limitVideoList,
} from '../utilities/video.utility.js';

const router = express.Router();

router.get('/search/:page', async function (req, res) {
    const page = parseInt(req.params.page) || 0;

    let videos;
    try {
        videos = await search(req.query, page);
    }
    catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
        return res.sendStatus(500);
    }

    let totals;
    let randomVideo;
    if (page === 0) {
        try {
            totals = await getTotals(req.query);
        } catch (err) {
            if (parsedEnv.VERBOSE) console.error(err);
            return res.sendStatus(500);
        }
        try {
            randomVideo = await getRandomVideo(req.query, totals.count);
        } catch (err) {
            if (parsedEnv.VERBOSE) console.error(err);
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
    let uploaderVideosOffset;
    let playlistVideosOffset;
    let jobVideosOffset;
    try {
        video = (await Video.findOne({
            extractor: req.params.extractor,
            id: req.params.id
        }, 'id extractor viewCount uploadDate videoFile directory resolution'
        + ' uploaderDocument fps webpageUrl dateDownloaded width height'
        + ' likeCount dislikeCount subtitleFiles jobDocument mediumResizedThumbnailFile'
        + ' license ageLimit seasonNumber episodeNumber trackNumber discNumber'
        + ' releaseYear format tbr asr vbr vcodec acodec ext playlistId playlistDocument' + fields
        )
            .populate('uploaderDocument playlistDocument jobDocument')
            .exec()
        )?.toJSON();
        if (!video) return res.sendStatus(404);

        if (video.uploader) uploaderVideos = await Video.find(
            { uploaderDocument: video.uploaderDocument },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
            .populate('uploaderDocument', 'extractor id name')
            .sort({ uploadDate: -1 })
            .lean()
            .exec();

        if (video.playlistId) playlistVideos = await Video.find(
            { extractor: video.extractor, playlistId: video.playlistId },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
            .populate('uploaderDocument', 'extractor id name')
            .sort({ playlistIndex: 1 })
            .lean()
            .exec();

        jobVideos = await Video.find(
            { jobDocument: video.jobDocument },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
            .populate('uploaderDocument', 'extractor id name')
            .sort({ dateDownloaded: -1 })
            .lean()
            .exec();

        if (uploaderVideos) [uploaderVideos, uploaderVideosOffset] = limitVideoList(uploaderVideos, video);
        if (playlistVideos) [playlistVideos, playlistVideosOffset] = limitVideoList(playlistVideos, video);
        if (jobVideos) [jobVideos, jobVideosOffset] = limitVideoList(jobVideos, video);

    } catch (err) {
        console.error(err)
        return res.sendStatus(500);
    }

    let similarVideos;
    try {
        if (parsedEnv.DISPLAY_SIMILAR_VIDEOS !== 'disabled') similarVideos = await getSimilarVideos(video);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json({
        video,
        uploaderVideos,
        playlistVideos,
        jobVideos,
        uploaderVideosOffset,
        playlistVideosOffset,
        jobVideosOffset,
        similarVideos,
        localVideoPath: slash(path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, video.videoFile.name)),
    });
});

export default router;
