import Video from '../models/video.model.js';
import Statistic from '../models/statistic.model.js';

import { applyTags } from './statistic.utility.js';
import { parsedEnv } from '../parse-env.js';

export const search = async (query, page, user, filter = {}, relevanceMeans = 'uploadDate', relevanceDirection = -1) => {
    let sortField = sortBy(query['sort'], relevanceMeans, relevanceDirection);

    let fields = {
        _id: 1,
        extractor: 1,
        id: 1,
        title: 1,
        smallResizedThumbnailFile: 1,
        mediumResizedThumbnailFile: 1,
        directory: 1,
        uploader: 1,
        videoFile: 1,
        uploadDate: 1,
        duration: 1,
        width: 1,
        height: 1,
        viewCount: 1,
        uploaderDocument: 1,
        likeCount: 1,
        dislikeCount: 1,
    }
    if (sortField.name !== 'videoFile.filesize') fields[sortField.name] = 1;

    let pipeline = [
        {
            $match: query.search
                ? Object.assign({ $text: { $search: query.search } }, filter)
                : filter,
        },
        {
            $project: fields,
        },
        { $addFields: { propertyType: { $type: '$' + sortField.name } } },
        { $addFields: { propertyIsNull: { $cond: { if: { $in: ['$propertyType', ['null', 'missing']] }, then: 1, else: 0 } } } },
        {
            $sort:
                (query['sort'] === 'relevance' && query.search)
                    ? { score: { $meta: 'textScore' }, [sortField.name]: sortField.direction }
                    : { propertyIsNull: 1, [sortField.name]: sortField.direction }
        },
        { $project: { propertyType: 0, propertyIsNull: 0 } },
        { $skip: page * parsedEnv.PAGE_SIZE },
        { $limit: parsedEnv.PAGE_SIZE },
    ];

    let videos = await Video.aggregate(pipeline);

    videos = await Video.populate(videos, { path: 'uploaderDocument', select: 'extractor id name' });
    videos = await attachWatchHistory(videos, user);
    videos = stripIds(videos);

    return videos;
}

export const sortBy = (option, relevanceMeans, relevanceDirection) => {
    switch (option) {
        case 'relevance':
            return { name: relevanceMeans, direction: relevanceDirection };
        case 'newest_date':
            return { name: 'uploadDate', direction: -1 };
        case 'oldest_date':
            return { name: 'uploadDate', direction: 1 };
        case 'longest_duration':
            return { name: 'duration', direction: -1 };
        case 'shortest_duration':
            return { name: 'duration', direction: 1 };
        case 'largest_size':
            return { name: 'videoFile.filesize', direction: -1 };
        case 'smallest_size':
            return { name: 'videoFile.filesize', direction: 1 };
        case 'most_views':
            return { name: 'viewCount', direction: -1 };
        case 'least_views':
            return { name: 'viewCount', direction: 1 };
        case 'most_likes':
            return { name: 'likeCount', direction: -1 };
        case 'least_likes':
            return { name: 'likeCount', direction: 1 };
        case 'most_dislikes':
            return { name: 'dislikeCount', direction: -1 };
        case 'least_dislikes':
            return { name: 'dislikeCount', direction: 1 };
        case 'ratio_likes':
            return { name: 'likeDislikeRatio', direction: -1 };
        case 'ratio_dislikes':
            return { name: 'likeDislikeRatio', direction: 1 };
        case 'newest_download':
            return { name: 'dateDownloaded', direction: -1 };
        case 'oldest_download':
            return { name: 'dateDownloaded', direction: 1 };
        default:
            return { name: relevanceMeans, direction: relevanceDirection };
    }
}

export const getTotals = async (query, filter = {}) => {
    let totals = (await Video.aggregate([
        {
            $match: query.search
                ? Object.assign({ $text: { $search: query.search } }, filter)
                : filter,
        },
        {
            $group: {
                _id: null,
                duration: {
                    $sum: "$duration"
                },
                filesize: {
                    $sum: "$videoFile.filesize"
                },
                count: { $sum: 1 },
            }
        }]))[0];
    if (!totals) return {
        duration: 0,
        filesize: 0,
        count: 0,
        shorts: 0,
    }

    let shorts = (await Video.aggregate([
        {
            $match: query.search
                ? Object.assign({ $text: { $search: query.search } }, { ...filter }, { isShort: true })
                : Object.assign({ ...filter }, { isShort: true }),
        },
        {
            $group: { _id: null, count: { $sum: 1 } }
        }
    ]))[0];
    totals.shorts = shorts ? shorts.count : 0;

    return totals;
}

export const getRandomVideo = async (query, filter = {}) => {
    const pipeline = [
        {
            $match: query.search
                ? Object.assign({ $text: { $search: query.search } }, filter)
                : filter,
        },
        { $project: { extractor: 1, id: 1 } },
        { $sample: { size: 1 } }, // Select one randomly
    ];

    const result = await Video.aggregate(pipeline);
    return result[0] || null;
};

const weightedFields = {
    extractor: { weight: 3, type: 'exact' },
    title: { weight: 5, type: 'includes' },
    altTitle: { weight: 5, type: 'includes' },
    description: { weight: 5, type: 'includes' },
    uploader: { weight: 5, type: 'exact' },
    creator: { weight: 5, type: 'exact' },
    channel: { weight: 5, type: 'exact' },
    location: { weight: 5, type: 'exact' },
    categories: { weight: 5, type: 'dot' },
    tags: { weight: 5, type: 'dot' },
    'chapters.title': { weight: 5, type: 'includes' },
    chapter: { weight: 5, type: 'includes' },
    series: { weight: 5, type: 'exact' },
    season: { weight: 5, type: 'exact' },
    episode: { weight: 5, type: 'exact' },
    track: { weight: 5, type: 'exact' },
    artist: { weight: 5, type: 'exact' },
    genre: { weight: 5, type: 'exact' },
    album: { weight: 5, type: 'exact' },
    albumType: { weight: 5, type: 'exact' },
    albumArtist: { weight: 5, type: 'exact' },
    playlist: { weight: 5, type: 'includes' },
    playlistTitle: { weight: 5, type: 'includes' },
    hashtags: { weight: 5, type: 'dot' },
}

export const fields = Object.keys(weightedFields).join(' ').replace('chapters.title', 'chapters');

export const getSimilarVideos = async (video, filter = {}) => {
    let aggregatedFields = {};
    let statistic = await Statistic.findOne({ accessKey: 'videos' });
    statistic = await applyTags(statistic);
    for (let field in weightedFields) {
        if (weightedFields[field].type === 'dot') {
            aggregatedFields[field] = statistic.statistics[field].map(item => item.name);
        }
    }

    let keywords = [];
    for (let field in weightedFields) {
        if (weightedFields[field].type === 'exact') {
            if (video[field] != undefined) keywords.push(video[field]);
        } else if (weightedFields[field].type === 'dot') {
            keywords.push(...video[field]);
        }
    }
    keywords = keywords.map(keyword => keyword.toLowerCase());

    let videos = await Video
        .find(
            filter,
            'id extractor duration directory smallResizedThumbnailFile uploadDate videoFile viewCount width height uploaderDocument '
            + fields
        )
        .sort({ uploadDate: -1 })
        .lean()
        .exec();
    for (let i = 0; i < videos.length; i++) videos[i].score = 0;

    for (let field in weightedFields) {
        switch (weightedFields[field].type) {
            case 'dot':
                if (parsedEnv.DISPLAY_SIMILAR_VIDEOS === 'complex') {
                    let vector = createVector(aggregatedFields[field], video[field]);
                    let maxScore = vector.length > 0 ? vector.reduce((a, b) => a + b) : 0;
                    if (maxScore > 0) {
                        for (let i = 0; i < videos.length; i++) {
                            let score = dot(vector, createVector(aggregatedFields[field], videos[i][field]));
                            videos[i].score += (score / maxScore) * weightedFields[field].weight;
                        }
                    }
                }
                break;
            case 'exact':
                for (let i = 0; i < videos.length; i++) {
                    if (video[field] === videos[i][field]) {
                        videos[i].score += weightedFields[field].weight;
                    }
                }
                break;
            case 'includes':
                for (let i = 0; i < videos.length; i++) {
                    for (let j = 0; j < keywords.length; j++) {
                        let score = 0;
                        if (!!videos[i][field] && videos[i][field].toLowerCase().includes(keywords[j])) {
                            score++;
                        }
                        videos[i].score += score * weightedFields[field].weight;
                    }
                }
                break;
        }
    }

    videos = videos
        .filter(a => a.score !== 0 && a.extractor + a.id !== video.extractor + video.id)
        .sort((a, b) => b.score - a.score);
    videos.length = Math.min(videos.length, 50);
    if (videos.length === 0) videos = undefined;

    return await Video.populate(videos, { path: 'uploaderDocument', select: 'extractor id name' });
}

export const limitVideoList = (videosList, video, limit = 100) => {
    let index = -1;
    videosList.find((videoInList, i) => {
        if (videoInList.id === video.id && videoInList.extractor === video.extractor) {
            index = i;
            return;
        }
    });

    let least = index - Math.floor(limit / 2);
    let len = videosList.length;
    if (least + limit > len) least = len - limit;
    least = (least < 0) ? 0 : least;
    return [videosList.slice(least, least + limit), least];
};

const createVector = (allTags, tags) => {
    let vector = [];
    for (let i = 0; i < allTags.length; i++) vector.push(+tags.includes(allTags[i]));
    return vector;
}

const dot = (vector1, vector2) => {
    return vector1.reduce((sum, element, index) => sum += element * vector2[index], 0);
}

export const detectShort = (video) => {
    // yt-dlp does not directly say if a video is a short in the metadata
    return (
        video.extractor === 'youtube' &&
        video.width <= video.height &&
        (
            (
                video.duration <= 60 &&
                video.uploadDate.getTime() >= new Date('2021-07-13').getTime() // Shorts were introduced July 13, 2021
            ) || (
                video.duration <= 180 &&
                video.uploadDate.getTime() >= new Date('2024-10-15').getTime() // Three minute shorts were introduced October 15, 2024
            )
        )
    );
}

export const attachWatchHistory = async (videos, user) => {
    if (!videos || !videos.length || !user || !user.recordWatchHistory || !user.showWatchedHistory) return videos;

    const videoIds = videos.map(video => video._id);

    // Get the watch history for videos
    const historyEntries = await Video.aggregate([
        { $project: { _id: 1 } },
        { $match: { _id: { $in: videoIds } } },
        {
            $lookup: {
                from: 'activities',
                let: { videoId: '$_id', userId: user._id },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$videoDocument', '$$videoId'] },
                                    { $eq: ['$userDocument', '$$userId'] },
                                    { $eq: ['$eventType', 'watched'] },
                                ],
                            },
                        },
                    },
                    { $sort: { createdAt: -1 } }, // Sort by the most recent history entries
                    { $limit: 1 }, // Only get the most recent history entry
                    { $project: { _id: 0, stopTime: 1 } }, // Return only the stopped watching time
                ],
                as: 'watchHistory',
            },
        },
        {
            $addFields: {
                watchHistory: { $arrayElemAt: ['$watchHistory', 0] } // Convert the array to a single object
            },
        },
    ]);

    // Match and merge the video with it's history entry 
    const historyMap = new Map(historyEntries.map(video => [video._id.toString(), video]));
    return videos.map(video => ({
        ...video,
        watchHistory: historyMap.get(video._id.toString())?.watchHistory || null,
    }));
};

export const stripIds = (videos) => {
    if (!videos) return videos;

    videos.forEach(video => {
        delete video._id;
    });

    return videos;
}

export const escapeRegex = (value) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const isQuoted = (value) => {
    return /^["'].*["']$/.test(value);
}

export const stripQuotes = (value) => {
    return value.replace(/^["']|["']$/g, '');
}
