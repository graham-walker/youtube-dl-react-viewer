import express from 'express';
import path from 'path';
import slash from 'slash';
import axios from 'axios';
import fs from 'fs-extra';
import crypto from 'crypto';

import mongoose from 'mongoose';
import Video from '../models/video.model.js';
import Activity from '../models/activity.model.js';
import Job from '../models/job.model.js';
import Uploader from '../models/uploader.model.js';
import Playlist from '../models/playlist.model.js';

import {
    search,
    getTotals,
    getRandomVideo,
    fields,
    getSimilarVideos,
    limitVideoList,
    attachWatchHistory,
    stripIds,
    isQuoted,
    stripQuotes,
    escapeRegex,
} from '../utilities/video.utility.js';
import { parsedEnv } from '../parse-env.js';
import { logError } from '../utilities/logger.utility.js';

const router = express.Router();

router.get('/search/:page', async function (req, res) {
    const page = parseInt(req.params.page) || 0;

    const filter = req.user?.hideShorts ? { isShort: false } : {}

    // Advanced search filtering
    if (mongoose.Types.ObjectId.isValid(req.query.job)) filter.jobDocument = new mongoose.Types.ObjectId(req.query.job);
    if (req.query.extractor && typeof req.query.extractor === 'string') filter.extractor = req.query.extractor;
    
    if (req.query.uploadStart || req.query.uploadEnd) filter.uploadDate = {};
    if (req.query.uploadStart && typeof req.query.uploadStart === 'string' && !isNaN(new Date(req.query.uploadStart).getTime())) filter.uploadDate.$gte = new Date(req.query.uploadStart);
    if (req.query.uploadEnd && typeof req.query.uploadEnd === 'string' && !isNaN(new Date(req.query.uploadEnd).getTime())) filter.uploadDate.$lte = new Date(req.query.uploadEnd);
    
    let uploader = req.query.uploader;
    if (uploader && typeof uploader === 'string') {
        const uploaderIds = await Uploader.find({
            name: isQuoted(uploader) ? stripQuotes(uploader) : { $regex: escapeRegex(uploader), $options: 'i' }
        }, '_id');
        filter.uploaderDocument = { $in: uploaderIds.map(doc => doc._id) }
    }

    let playlist = req.query.playlist;
    if (playlist && typeof playlist === 'string') {
        const playlistIds = await Playlist.find({
            name: isQuoted(playlist) ? stripQuotes(playlist) : { $regex: escapeRegex(playlist), $options: 'i' }
        }, '_id');
        filter.playlistDocument = { $in: playlistIds.map(doc => doc._id) }
    }

    // Process search
    let videos;
    try {
        videos = await search(req.query, page, req.user, filter);
    }
    catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }

    let totals;
    let randomVideo;
    if (page === 0) {
        try {
            totals = await getTotals(req.query, filter);
        } catch (err) {
            if (parsedEnv.VERBOSE) logError(err);
            return res.sendStatus(500);
        }
        try {
            randomVideo = await getRandomVideo(req.query, filter);
        } catch (err) {
            if (parsedEnv.VERBOSE) logError(err);
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

    const filter = req.user?.hideShorts ? { isShort: false } : {};

    try {
        video = (await Video.findOne({
            extractor: req.params.extractor,
            id: req.params.id
        }, '_id id extractor viewCount uploadDate videoFile directory resolution'
        + ' uploaderDocument fps webpageUrl dateDownloaded width height'
        + ' likeCount dislikeCount subtitleFiles jobDocument mediumResizedThumbnailFile'
        + ' license ageLimit seasonNumber episodeNumber trackNumber discNumber'
        + ' releaseYear format tbr asr vbr vcodec acodec ext playlistId'
        + ' playlistDocument commentCount downloadedCommentCount ' + fields
        )
            .populate('uploaderDocument playlistDocument jobDocument')
            .exec()
        )?.toJSON();
        if (!video) return res.sendStatus(404);

        if (video.uploaderDocument) uploaderVideos = await Video.find(
            Object.assign({ uploaderDocument: video.uploaderDocument }, filter),
            'extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
            .populate('uploaderDocument', 'extractor id name')
            .sort({ uploadDate: -1 })
            .lean()
            .exec();

        if (video.playlistDocument) playlistVideos = await Video.find(
            Object.assign({ playlistDocument: video.playlistDocument }, filter),
            'extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
            .populate('uploaderDocument', 'extractor id name')
            .sort({ playlistIndex: 1 })
            .lean()
            .exec();

        jobVideos = await Video.find(
            Object.assign({ jobDocument: video.jobDocument }, filter),
            'extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
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

        uploaderVideos = await attachWatchHistory(uploaderVideos, req.user);
        playlistVideos = await attachWatchHistory(playlistVideos, req.user);
        jobVideos = await attachWatchHistory(jobVideos, req.user);
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err)
        return res.sendStatus(500);
    }

    let similarVideos;
    try {
        if (parsedEnv.DISPLAY_SIMILAR_VIDEOS !== 'disabled') {
            similarVideos = await getSimilarVideos(video, filter);
            similarVideos = await attachWatchHistory(similarVideos, req.user);
        }
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

    try {
        if (req.user?.recordWatchHistory) {
            await new Activity({
                eventType: 'watched',
                stopTime: resumeTime ?? 0,
                userDocument: req.user._id,
                videoDocument: video._id,
            }).save();
        }
    } catch (err) { return res.sendStatus(500); }

    if (req.query?.metadata === 'true') delete video._id;

    // Get sponsor segments
    let sponsorSegments = null;
    if ((req.user?.enableSponsorblock || req.query?.metadata === 'true') && parsedEnv.SPONSORBLOCK_API_URL && video.extractor === 'youtube') {
        try {
            if (parsedEnv.SPONSORBLOCK_K_ANONYMITY) {
                const partialHash = crypto.createHash('sha256').update(video.id).digest('hex').slice(0, 4);
                const sponsorRes = await axios.get(`${parsedEnv.SPONSORBLOCK_API_URL}/api/skipSegments/${partialHash}?categories=["sponsor","selfpromo","interaction","intro","outro","preview","music_offtopic","filler"]`);
                sponsorSegments = sponsorRes.data.find(sponsorVideo => sponsorVideo.videoID === video.id)?.segments || null;
            } else {
                const sponsorRes = await axios.get(`${parsedEnv.SPONSORBLOCK_API_URL}/api/skipSegments/?videoID=${video.id}&categories=["sponsor","selfpromo","interaction","intro","outro","preview","music_offtopic","filler"]`);
                sponsorSegments = sponsorRes.data;
            }
        } catch (err) {
            if (err?.response?.status !== 404) {
                logError('Failed to get sponsor segments');
                if (parsedEnv.VERBOSE) logError(err);
            }
        }
    }

    // Get dislikes
    let returnYouTubeDislikeVotes = null;
    if ((req.user?.enableReturnYouTubeDislike || req.query?.metadata === 'true') && parsedEnv.RETURN_YOUTUBE_DISLIKE_API_URL && video.extractor === 'youtube') {
        try {
            const dislikeRes = await axios.get(`${parsedEnv.RETURN_YOUTUBE_DISLIKE_API_URL}/votes?videoId=${video.id}`);
            returnYouTubeDislikeVotes = dislikeRes.data;
        } catch (err) {
            if (err?.response?.status !== 404) {
                logError('Failed to get dislikes');
                if (parsedEnv.VERBOSE) logError(err);
            }
        }
    }

    if (!parsedEnv.EXPOSE_LOCAL_VIDEO_PATH && video?.jobDocument?.arguments) video.jobDocument.arguments = null; // Local path may also be exposed in job arguments

    res.json({
        video,
        uploaderVideos: stripIds(uploaderVideos),
        playlistVideos: stripIds(playlistVideos),
        jobVideos: stripIds(jobVideos),
        uploaderVideosOffset,
        playlistVideosOffset,
        jobVideosOffset,
        firstUploaderVideo,
        firstPlaylistVideo,
        firstJobVideo,
        similarVideos: stripIds(similarVideos),
        localVideoPath: parsedEnv.EXPOSE_LOCAL_VIDEO_PATH ? slash(path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, video.videoFile.name)) : null,
        resumeTime,
        sponsorSegments,
        returnYouTubeDislikeVotes,
    });
});

router.get('/:extractor/:id/comments', async (req, res) => {
    try {
        let video = (await Video.findOne({ extractor: req.params.extractor, id: req.params.id }, '-_id extractor downloadedCommentCount directory infoFile').exec())?.toJSON();

        if (!video) return res.status(500).json({ error: 'Video does not exist' });

        if (!video.downloadedCommentCount) return res.status(500).json({ error: 'Video has no downloaded comments' });

        let infoFilePath = path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, video.infoFile.name);

        if (!await fs.exists(infoFilePath)) return res.status(500).json({ error: 'Could not find video info.json' });

        let infojsonData = JSON.parse((await fs.readFile(infoFilePath)));

        if (!infojsonData.comments) return res.status(500).json({ error: 'Video has no downloaded comments' });

        switch (video.extractor) {
            case 'youtube':
                if (!Array.isArray(infojsonData.comments)) {
                    logError('Invalid comment schema: Not array');
                    return res.status(500).json({ error: 'Invalid comment schema' });
                }
                for (let i = 0; i < infojsonData.comments.length; i++) {
                    if (typeof infojsonData.comments[i] !== 'object') {
                        logError('Invalid comment schema: Not object');
                        return res.status(500).json({ error: 'Invalid comment schema' });
                    }

                    infojsonData.comments[i] = Object.assign({
                        author: 'Unknown',
                        author_id: 'unknown',
                        parent: 'root',
                        like_count: 0,
                        is_favorited: false,
                        author_thumbnail: '/default-avatar.svg',
                        author_is_uploader: false,
                    }, infojsonData.comments[i]);

                    let comment = infojsonData.comments[i];
                    if (
                        (!comment.hasOwnProperty('author') || typeof comment.author !== 'string') // In the updated comment format author is sometimes an empty string
                        || (!comment.hasOwnProperty('author_id') || typeof comment.author_id !== 'string' || !comment.author_id)
                        || (!comment.hasOwnProperty('id') || typeof comment.id !== 'string' || !comment.id)
                        || (
                            (!comment.hasOwnProperty('text') || typeof comment.text !== 'string' || !comment.text)
                            && (!comment.hasOwnProperty('html') || typeof comment.html !== 'string' || !comment.html)
                        )
                        || (!comment.hasOwnProperty('timestamp') || typeof comment.timestamp !== 'number' || !comment.timestamp || comment.timestamp < 0)
                        || (!comment.hasOwnProperty('parent') || typeof comment.parent !== 'string' || !comment.parent) // Top level is 'root'
                        || (!comment.hasOwnProperty('like_count') || typeof comment.like_count !== 'number')
                        || (!comment.hasOwnProperty('is_favorited') || typeof comment.is_favorited !== 'boolean')
                        || (!comment.hasOwnProperty('author_thumbnail') || typeof comment.author_thumbnail !== 'string' || !comment.author_thumbnail)
                        || (!comment.hasOwnProperty('author_is_uploader') || typeof comment.author_is_uploader !== 'boolean')
                    ) {
                        logError('Invalid comment schema: ' + JSON.stringify(comment));
                        return res.status(500).json({ error: 'Invalid comment schema' });
                    }
                }
                break;
            default:
                return res.status(500).json({ error: 'Comment parser for extractor not implemented' });
        }
        return res.json({ comments: infojsonData.comments });
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }
});

router.get('/:extractor/:id/livechat', async (req, res) => {
    try {
        const extractor = req.params.extractor;
        let video = (await Video.findOne({ extractor, id: req.params.id }, '-_id directory subtitleFiles').exec()
        )?.toJSON();

        switch (extractor) {
            case 'youtube':
                for (let subtitleFile of video.subtitleFiles) {
                    if (subtitleFile.language === 'live_chat') {
                        let comments = (await fs.readFile(path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, subtitleFile.name)))
                            .toString()
                            .replaceAll('\r\n', '\n')
                            .split('\n')
                            .filter(comment => !!comment)
                            .map(comment => {
                                let parsed;
                                try {
                                    parsed = JSON.parse(comment);
                                } catch (err) {
                                    return null;
                                }

                                let message = '';
                                try {
                                    let runs = parsed.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer.message.runs;
                                    for (let run of runs) {
                                        if (run.hasOwnProperty('text')) {
                                            message += run.text;
                                        } else if (run.hasOwnProperty('emoji')) {
                                            if (run.emoji.isCustomEmoji) {
                                                message += run.emoji.shortcuts[0];
                                            } else {
                                                message += run.emoji.emojiId;
                                            }
                                        }
                                    }
                                    if (!message) throw new Error('Empty message');
                                } catch (err) { message = null; }

                                let name = '';
                                try {
                                    name = parsed.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer.authorName.simpleText;
                                    if (!name) throw new Error('Unknown user');
                                } catch (err) { name = 'Unknown user'; }

                                let photo = null;
                                try {
                                    photo = parsed.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer.authorPhoto.thumbnails.pop().url;
                                    if (!photo) throw new Error('Unknown photo');
                                } catch (err) { photo = null; }

                                let offsetMs = null;
                                try {
                                    offsetMs = parseInt(parsed.replayChatItemAction.videoOffsetTimeMsec, 10);
                                    if (isNaN(offsetMs) || (!offsetMs && offsetMs !== 0)) throw new Error('Invalid time');
                                } catch (err) { offsetMs = null; }

                                let date = null;
                                try {
                                    let timestamp = parseInt(parsed.replayChatItemAction.actions[0].addChatItemAction.item.liveChatTextMessageRenderer.timestampUsec, 10);
                                    if (isNaN(timestamp) || (!timestamp && timestamp !== 0)) throw new Error('Invalid timestamp');
                                    date = new Date(timestamp / 1000);
                                } catch (err) { date = null; }

                                if (message && offsetMs !== null) {
                                    return {
                                        name,
                                        photo,
                                        offset: offsetMs / 1000,
                                        date,
                                        message,
                                    };
                                }
                                return null;
                            })
                            .filter(comment => !!comment);
                        if (!comments || comments.length === 0) return res.sendStatus(404);
                        return res.json({ comments });
                    }
                }
                break;
            // case 'twitch': // Twitch rechat extraction is currently broken
            //     break;
            default:
                return res.status(500).json({ error: 'Chat replay for extractor not implemented' });
        }
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }
});

router.get('/advanced_search_options', async (req, res) => {
    try {
        let jobs = await Job.find({}, '_id name').sort({ name: 1 }).lean().exec();
        let extractors = await Video.distinct('extractor');

        return res.status(200).json({ jobs, extractors });
    } catch (err) {
        return res.sendStatus(500);
    }
});

export default router;
