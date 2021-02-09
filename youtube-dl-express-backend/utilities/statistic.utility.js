export const incrementStatistics = (video, statistics) => {
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
    if (video.uploadDate && (!statistics.lastDateUploaded || video.uploadDate.getTime() > statistics.lastDateUploaded.getTime())) {
        statistics.lastDateUploaded = video.uploadDate;
    }
    if (video.uploadDate && (!statistics.oldestVideoUploadDate || video.uploadDate.getTime() < statistics.oldestVideoUploadDate.getTime())) {
        statistics.oldestVideoUploadDate = video.uploadDate;
        statistics.oldestVideo = video._id;
    }
    const props = ['tags', 'categories', 'hashtags'];
    for (let i = 0; i < props.length; i++) {
        for (let j = 0; j < video[props[i]].length; j++) {
            const index = statistics[props[i]].map(e => e.name).indexOf(video[props[i]][j]);
            if (index === -1) {
                statistics[props[i]].push({ name: video[props[i]][j], count: 1 });
            } else {
                statistics[props[i]][index].count++;
            }
        }
    }

    return statistics;
}
