export const getImage = (video, type, size = 'small') => {
    switch (type) {
        case 'thumbnail':
            if (!video || !video.hasOwnProperty('directory')) {
                return 'default-thumbnail.svg';
            }
            switch (size) {
                case 'small':
                    if (!video.hasOwnProperty('smallResizedThumbnailFile') || !video.smallResizedThumbnailFile) {
                        return 'default-thumbnail.svg';
                    }
                    return `/static/thumbnails/${encodeURIComponent(video.directory)}`
                        + `/${encodeURIComponent(video.smallResizedThumbnailFile.name)}`;
                case 'medium':
                    if (!video.hasOwnProperty('mediumResizedThumbnailFile') || !video.mediumResizedThumbnailFile) {
                        return 'default-thumbnail.svg';
                    }
                    return `/static/thumbnails/${encodeURIComponent(video.directory)}`
                        + `/${encodeURIComponent(video.mediumResizedThumbnailFile.name)}`;
                default:
                    throw new Error('Invalid size');
            }
        case 'avatar':
            if (!video) return 'default-avatar.svg';
            if (video.hasOwnProperty('name')) video = { uploaderDocument: video }; // An uploader is being passed instead of a video
            if (
                !video.hasOwnProperty('uploaderDocument')
                || !video.uploaderDocument.hasOwnProperty('extractor')
                || !video.uploaderDocument.hasOwnProperty('id')
            ) return 'default-avatar.svg';
            return `/static/avatars/${makeSafe(video.uploaderDocument.extractor, ' -')}/${makeSafe(video.uploaderDocument.id, '_')}.jpg`;
        default:
            throw new Error('Invalid type');
    }
}

export const defaultImage = (e, type) => {
    switch (type) {
        case 'thumbnail':
            e.target.style.objectFit = 'cover';
            e.target.src = '/default-thumbnail.svg';
            break;
        case 'avatar':
            e.target.src = '/default-avatar.svg';
            break;
        default:
            throw new Error('Invalid type');
    }
}

const makeSafe = (text, replaceWith) => {
    return encodeURIComponent(text.replace(/[|:&;$%@"<>()+,/\\*?]/g, replaceWith));
}
