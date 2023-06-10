import express from 'express';
import path from 'path';
import slash from 'slash';
import axios from 'axios';

import Video from '../models/video.model.js';
import Activity from '../models/activity.model.js';

import {
    search,
    getTotals,
    getRandomVideo,
    fields,
    getSimilarVideos,
    limitVideoList,
} from '../utilities/video.utility.js';
import { parsedEnv } from '../parse-env.js';

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
    let firstUploaderVideo;
    let firstPlaylistVideo;
    let firstJobVideo;
    const metadataFields = req.query?.metadata === 'true' ? ' comments' : '';

    try {
        video = (await Video.findOne({
            extractor: req.params.extractor,
            id: req.params.id
        }, '_id id extractor viewCount uploadDate videoFile directory resolution'
        + ' uploaderDocument fps webpageUrl dateDownloaded width height'
        + ' likeCount dislikeCount subtitleFiles jobDocument mediumResizedThumbnailFile'
        + ' license ageLimit seasonNumber episodeNumber trackNumber discNumber'
        + ' releaseYear format tbr asr vbr vcodec acodec ext playlistId'
        + ' playlistDocument ' + fields + metadataFields
        )
            .populate('uploaderDocument playlistDocument jobDocument' + metadataFields)
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

        if (uploaderVideos) firstUploaderVideo = uploaderVideos[0];
        if (playlistVideos) firstPlaylistVideo = playlistVideos[0];
        if (jobVideos) firstJobVideo = jobVideos[0];

        if (uploaderVideos) [uploaderVideos, uploaderVideosOffset] = limitVideoList(uploaderVideos, video);
        if (playlistVideos) [playlistVideos, playlistVideosOffset] = limitVideoList(playlistVideos, video);
        if (jobVideos) [jobVideos, jobVideosOffset] = limitVideoList(jobVideos, video);

    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err)
        return res.sendStatus(500);
    }

    let similarVideos;
    try {
        if (parsedEnv.DISPLAY_SIMILAR_VIDEOS !== 'disabled') similarVideos = await getSimilarVideos(video);
    } catch (err) {
        return res.sendStatus(500);
    }

    let resumeTime;
    try {
        if (req.user?.resumeVideos) {
            let activity = await Activity.findOne({ eventType: 'watched', userDocument: req.user._id, videoDocument: video._id }).sort({ createdAt: -1 }).exec();
            resumeTime = activity?.stopTime;
        }
    } catch (err) { return res.sendStatus(500); }

    let activity;
    try {
        if (req.user?.recordWatchHistory) {
            activity = await new Activity({
                eventType: 'watched',
                stopTime: resumeTime ?? 0,
                userDocument: req.user._id,
                videoDocument: video._id,
            }).save();
        }
    } catch (err) { return res.sendStatus(500); }

    delete video._id;

    let sponsorSegments = null;
    if (parsedEnv.SPONSORBLOCK_API_URL && video.extractor === 'youtube' && (req.user?.enableSponsorblock || req.query?.metadata === 'true')) {
        try {
            const sponsorRes = await axios.get(`${parsedEnv.SPONSORBLOCK_API_URL}/api/skipSegments/?videoID=${video.id}&categories=["sponsor","selfpromo","interaction","intro","outro","preview","music_offtopic","filler"]`);
            sponsorSegments = sponsorRes.data;
        } catch (err) {
            if (err?.response?.status !== 404) {
                console.error('Failed to get sponsor segments');
                if (parsedEnv.VERBOSE) console.error(err);
            }
        }
    }

    if (!parsedEnv.EXPOSE_LOCAL_VIDEO_PATH && video?.jobDocument?.arguments) video.jobDocument.arguments = null; // Local path may also be exposed in job arguments

    res.json({
        video,
        uploaderVideos,
        playlistVideos,
        jobVideos,
        uploaderVideosOffset,
        playlistVideosOffset,
        jobVideosOffset,
        firstUploaderVideo,
        firstPlaylistVideo,
        firstJobVideo,
        similarVideos,
        localVideoPath: parsedEnv.EXPOSE_LOCAL_VIDEO_PATH ? slash(path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, video.videoFile.name)) : null,
        resumeTime,
        activityDocument: activity?._id,
        sponsorSegments,
    });
});

router.get('/:extractor/:id/comments', async (req, res) => {
    try {
        let video = (await Video.findOne({ extractor: req.params.extractor, id: req.params.id }, '-_id comments')
            .populate('comments')
            .exec()
        )?.toJSON();

        res.json({ comments: video.comments });
    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
        return res.sendStatus(500);
    }
});

export default router;
