export const getImage = (video, type, size = 'small') => {
    switch (type) {
        case 'thumbnail':
            if (!video.hasOwnProperty('directory')) {
                return 'default-thumbnail.jpg';
            }
            switch (size) {
                case 'small':
                    if (!video.hasOwnProperty('smallResizedThumbnailFile') || !video.smallResizedThumbnailFile) {
                        return 'default-thumbnail.jpg';
                    }
                    return `/static/thumbnails/${encodeURIComponent(video.directory)}`
                        + `/${encodeURIComponent(video.smallResizedThumbnailFile.name)}`;
                case 'medium':
                    if (!video.hasOwnProperty('mediumResizedThumbnailFile') || !video.mediumResizedThumbnailFile) {
                        return 'default-thumbnail.jpg';
                    }
                    return `/static/thumbnails/${encodeURIComponent(video.directory)}`
                        + `/${encodeURIComponent(video.mediumResizedThumbnailFile.name)}`;
                default:
                    throw new Error('Invalid size');
            }
        case 'avatar':
            if (!video.hasOwnProperty('uploader') &&
                !video.hasOwnProperty('name')
            ) return 'default-avatar.jpg';
            return `/static/avatars/${makeSafe(video.extractor, ' -')}/${makeSafe(video.uploader ?? video.name, '_')}.jpg`;
        default:
            throw new Error('Invalid type');
    }
}

export const defaultImage = (e, type) => {
    switch (type) {
        case 'thumbnail':
            e.target.style.objectFit = 'cover';
            e.target.src = '/default-thumbnail.jpg';
            break;
        case 'avatar':
            e.target.src = '/default-avatar.jpg';
            break;
        default:
            throw new Error('Invalid type');
    }
}

const makeSafe = (text, replaceWith) => {
    return encodeURIComponent(text.replace(/[|:&;$%@"<>()+,/\\]/g, replaceWith));
}
