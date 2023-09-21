import express from 'express';
import path from 'path';
import slash from 'slash';
import axios from 'axios';
import fs from 'fs-extra';

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
import { logError } from '../utilities/logger.utility.js';

const router = express.Router();

router.get('/search/:page', async function (req, res) {
    const page = parseInt(req.params.page) || 0;

    let videos;
    try {
        videos = await search(req.query, page);
    }
    catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }

    let totals;
    let randomVideo;
    if (page === 0) {
        try {
            totals = await getTotals(req.query);
        } catch (err) {
            if (parsedEnv.VERBOSE) logError(err);
            return res.sendStatus(500);
        }
        try {
            randomVideo = await getRandomVideo(req.query, totals.count);
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
            { uploaderDocument: video.uploaderDocument },
            '-_id extractor id title uploader duration directory smallResizedThumbnailFile viewCount width height uploaderDocument')
            .populate('uploaderDocument', 'extractor id name')
            .sort({ uploadDate: -1 })
            .lean()
            .exec();

        if (video.playlistDocument) playlistVideos = await Video.find(
            { playlistDocument: video.playlistDocument },
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
        if (parsedEnv.VERBOSE) logError(err)
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
                logError('Failed to get sponsor segments');
                if (parsedEnv.VERBOSE) logError(err);
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
                        (!comment.hasOwnProperty('author') || typeof comment.author !== 'string' || !comment.author)
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

export default router;
