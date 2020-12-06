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
    let pattern = {};
    let options = {};
    if (req.query.search) {
        
    }

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

        if (uploaderVideos) [uploaderVideos, uploaderVideosOffset] = limitVideoList(uploaderVideos, video);
        if (playlistVideos) [playlistVideos, playlistVideosOffset] = limitVideoList(playlistVideos, video);
        if (jobVideos) [jobVideos, jobVideosOffset] = limitVideoList(jobVideos, video);

    } catch (err) {
        console.error(err)
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
        uploaderVideosOffset,
        playlistVideosOffset,
        jobVideosOffset,
        similarVideos,
        localVideoPath: slash(path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, video.videoFile.name)),
    });
});

export default router;
