import Tag from '../models/tag.model.js';

export const incrementStatistics = async (video, parentDocument) => {
    let statistics = parentDocument.statistics;
    parentDocument = parentDocument._id;

    if ('toObject' in statistics) statistics = statistics.toObject();

    statistics.totalVideoCount++;
    statistics.totalDuration += video.duration || 0;
    statistics.totalFilesize += video.totalFilesize;
    statistics.totalOriginalFilesize += video.totalOriginalFilesize;
    statistics.totalVideoFilesize += video.videoFile.filesize;
    statistics.totalInfoFilesize += video.infoFile.filesize;
    statistics.totalDescriptionFilesize += video.descriptionFile?.filesize || 0;
    statistics.totalAnnotationsFilesize += video.annotationsFile?.filesize || 0
    statistics.totalThumbnailFilesize += video.thumbnailFiles.reduce((a, b) => a + (b.filesize || 0), 0);
    statistics.totalResizedThumbnailFilesize += (video.mediumResizedThumbnailFile?.filesize || 0) + (video.smallResizedThumbnailFile?.filesize || 0);
    statistics.totalSubtitleFilesize += video.subtitleFiles.reduce((a, b) => a + (b.filesize || 0), 0);
    statistics.totalViewCount += video.viewCount || 0;
    statistics.totalLikeCount += video.likeCount || 0;
    statistics.totalDislikeCount += video.dislikeCount || 0;
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

    const types = ['tags', 'categories', 'hashtags'];
    for (let type of types) {
        for (let videoTagName of video[type]) {
            let tag = await Tag.findOne({ name: videoTagName, type, parentDocument });
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

export const applyTags = async (statistic, sort = {}, limit = 0) => {
    const types = ['tags', 'categories', 'hashtags'];
    for (let type of types) {
        try {
            statistic.statistics[type] = await Tag.find({ type, parentDocument: statistic._id }, '-_id name count').sort(sort).limit(limit).lean().exec();
        } catch (err) {
            throw err;
        }
    }
    return statistic;
}
