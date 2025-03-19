import sharp from 'sharp';

export const makeSafe = (text, replaceWith) => {
    return encodeURIComponent(text.replace(/[|:&;$%@"<>()+,/\\*?]/g, replaceWith));
}

export const getTargetSquareSize = async (imageData, maxSize) => {
    const metadata = await sharp(imageData).metadata();
    const smallestSize = Math.min(metadata.width, metadata.height) || maxSize;
    return Math.min(smallestSize, maxSize);
}
