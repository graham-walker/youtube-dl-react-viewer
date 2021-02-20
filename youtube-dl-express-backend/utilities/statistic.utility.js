export const incrementStatistics = (video, statistics, keepArrayFormat = false) => {
    
    // If a mongoose object was passed, convert it into a plain object as incrementing
    // the statistics converts the statistics into a form that is faster to increment
    // but will make the document validation fail
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

    // Convert tags, categories, and hashtags from Array to Object for much faster lookup times
    const props = ['tags', 'categories', 'hashtags'];
    for (let prop of props) {
        if (Array.isArray(statistics[prop])) {
            let indexed = {};
            statistics[prop].map(e => {
                indexed[e.name] = e.count;
            });
            statistics[prop] = indexed;
        }
        for (let name of video[prop]) {
            if (statistics[prop].hasOwnProperty(name)) {
                statistics[prop][name]++;
            } else {
                statistics[prop][name] = 1;
            }
        }
    }

    if (keepArrayFormat) return convertStatistics(statistics);
    return statistics;
}

export const convertStatistics = (statistics) => {
    const props = ['tags', 'categories', 'hashtags'];
    for (let prop of props) {
        let converted = [];
        for (const [name, count] of Object.entries(statistics[prop])) {
            converted.push({ name, count });
        }
        statistics[prop] = converted;
    }
    return statistics;
}
