import Tag from '../models/tag.model.js';
import Video from '../models/video.model.js';

const tagTypes = ['tags', 'categories', 'hashtags'];

export const incrementStatistics = async (video, parentDocument) => {
    let statistics = parentDocument.statistics;
    if ('toObject' in statistics) statistics = statistics.toObject();

    statistics.totalVideoCount++;

    statistics = addStatistics(video, statistics);

    if (video.viewCount && video.viewCount > statistics.recordViewCount) {
        statistics.recordViewCount = video.viewCount;
        statistics.recordViewCountVideo = video._id;
    }
    if (video.likeCount && video.likeCount > statistics.recordLikeCount) {
        statistics.recordLikeCount = video.likeCount;
        statistics.recordLikeCountVideo = video._id;
    }
    if (video.dislikeCount && video.dislikeCount > statistics.recordDislikeCount) {
        statistics.recordDislikeCount = video.dislikeCount;
        statistics.recordDislikeCountVideo = video._id;
    }
    if (video.uploadDate && (!statistics.newestVideoDateUploaded || video.uploadDate.getTime() > statistics.newestVideoDateUploaded.getTime())) {
        statistics.newestVideoDateUploaded = video.uploadDate;
        statistics.newestVideo = video._id;
    }
    if (video.uploadDate && (!statistics.oldestVideoDateUploaded || video.uploadDate.getTime() < statistics.oldestVideoDateUploaded.getTime())) {
        statistics.oldestVideoDateUploaded = video.uploadDate;
        statistics.oldestVideo = video._id;
    }

    for (let type of tagTypes) {
        for (let videoTagName of video[type]) {
            let tag = await Tag.findOne({ name: videoTagName, type, parentDocument: parentDocument._id });
            if (tag) {
                tag.count += 1;
                await tag.save();
            } else {
                await new Tag({
                    name: videoTagName,
                    type,
                    parentDocument
                }).save();
            }
        }
    }

    return statistics;
}

export const decrementStatistics = async (video, parentDocument, session = null) => {
    let statistics = parentDocument.statistics;
    if ('toObject' in statistics) statistics = statistics.toObject();

    statistics.totalVideoCount--;

    statistics = addStatistics(video, statistics, -1);

    let match = {};
    switch (parentDocument.constructor.modelName) {
        case 'Playlist':
            match = { playlistDocument: parentDocument._id };
            break;
        case 'Job':
            match = { jobDocument: parentDocument._id };
            break;
        case 'Uploader':
            match = { uploaderDocument: parentDocument._id };
            break;
    }

    // Video has already been deleted from the database so it is safe to recalculate the top video
    if (statistics.recordViewCountVideo && statistics.recordViewCountVideo.equals(video._id)) {
        let topVideo = await Video.findOne(match).sort({ viewCount: -1 }).lean().exec();
        statistics.recordViewCount = topVideo ? topVideo.viewCount : 0;
        statistics.recordViewCountVideo = topVideo ? topVideo._id : null;
    }
    if (statistics.recordLikeCountVideo && statistics.recordLikeCountVideo.equals(video._id)) {
        let topVideo = await Video.findOne(match).sort({ likeCount: -1 }).lean().exec();
        statistics.recordLikeCount = topVideo ? topVideo.likeCount : 0;
        statistics.recordLikeCountVideo = topVideo ? topVideo._id : null;
    }
    if (statistics.recordDislikeCountVideo && statistics.recordDislikeCountVideo.equals(video._id)) {
        let topVideo = await Video.findOne(match).sort({ dislikeCount: -1 }).lean().exec();
        statistics.recordDislikeCount = topVideo ? topVideo.dislikeCount : 0;
        statistics.recordDislikeCountVideo = topVideo ? topVideo._id : null;
    }
    if (statistics.newestVideo && statistics.newestVideo.equals(video._id)) {
        let topVideo = await Video.findOne(match).sort({ uploadDate: -1 }).lean().exec();
        statistics.newestVideoDateUploaded = topVideo ? topVideo.uploadDate : null;
        statistics.newestVideo = topVideo ? topVideo._id : null;
    }
    if (statistics.oldestVideo && statistics.oldestVideo.equals(video._id)) {
        let topVideo = await Video.findOne(match).sort({ uploadDate: 1 }).lean().exec();
        statistics.oldestVideoDateUploaded = topVideo ? topVideo.uploadDate : null;
        statistics.oldestVideo = topVideo ? topVideo._id : null;
    }

    for (let type of tagTypes) {
        for (let videoTagName of video[type]) {
            let tag = await Tag.findOne({ name: videoTagName, type, parentDocument: parentDocument._id }, null, { session });
            if (tag) {
                tag.count -= 1;
                if (tag.count <= 0) {
                    await tag.deleteOne();
                } else {
                    await tag.save();
                }
            }
        }
    }

    return statistics;
}

const addStatistics = (video, statistics, multiplier = 1) => {
    statistics.totalDuration += (video.duration || 0) * multiplier;
    statistics.totalFilesize += (video.totalFilesize) * multiplier;
    statistics.totalOriginalFilesize += (video.totalOriginalFilesize) * multiplier;
    statistics.totalVideoFilesize += (video.videoFile.filesize) * multiplier;
    statistics.totalInfoFilesize += (video.infoFile.filesize) * multiplier;
    statistics.totalDescriptionFilesize += (video.descriptionFile?.filesize || 0) * multiplier;
    statistics.totalAnnotationsFilesize += (video.annotationsFile?.filesize || 0) * multiplier;
    statistics.totalThumbnailFilesize += (video.thumbnailFiles.reduce((a, b) => a + (b.filesize || 0), 0)) * multiplier;
    statistics.totalResizedThumbnailFilesize += ((video.mediumResizedThumbnailFile?.filesize || 0) + (video.smallResizedThumbnailFile?.filesize || 0)) * multiplier;
    statistics.totalSubtitleFilesize += (video.subtitleFiles.reduce((a, b) => a + (b.filesize || 0), 0)) * multiplier;
    statistics.totalViewCount += (video.viewCount || 0) * multiplier;
    statistics.totalLikeCount += (video.likeCount || 0) * multiplier;
    statistics.totalDislikeCount += (video.dislikeCount || 0) * multiplier;

    return statistics;
}

export const applyTags = async (statistic, sort = {}, limit = 0) => {
    for (let type of tagTypes) {
        try {
            statistic.statistics[type] = await Tag.find({ type, parentDocument: statistic._id }, '-_id name count').sort(sort).limit(limit).lean().exec();
        } catch (err) {
            throw err;
        }
    }
    return statistic;
}
