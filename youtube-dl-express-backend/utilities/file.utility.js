import sharp from 'sharp';
import fs from 'fs';
import streamJson from 'stream-json';
import IgnoreFilter from 'stream-json/filters/Ignore.js';
import PickFilter from 'stream-json/filters/Pick.js';
import StreamArrayStreamer from 'stream-json/streamers/StreamArray.js';
import Asm from 'stream-json/Assembler.js';

const { parser } = streamJson;
const { ignore } = IgnoreFilter;
const { pick } = PickFilter;
const { streamArray } = StreamArrayStreamer;

export const makeSafe = (text, replaceWith) => {
    return encodeURIComponent(text.replace(/[|:&;$%@"<>()+,/\\*?]/g, replaceWith));
}

export const getTargetSquareSize = async (imageData, maxSize) => {
    const metadata = await sharp(imageData).metadata();
    const smallestSize = Math.min(metadata.width, metadata.height) || maxSize;
    return Math.min(smallestSize, maxSize);
}

export async function parseInfoJson(filePath, { includeCommentCount = false } = {}) {
    const data = await new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath)
            .pipe(parser())
            .pipe(ignore({ filter: 'comments' }));
        const asm = Asm.connectTo(stream);
        asm.on('done', (a) => resolve(a.current));
        stream.on('error', reject);
    });

    if (includeCommentCount) {
        data.commentCount = await new Promise((resolve, reject) => {
            let count = 0;
            const stream = fs.createReadStream(filePath)
                .pipe(parser())
                .pipe(pick({ filter: 'comments' }))
                .pipe(streamArray());
            stream.on('data', () => { count++; });
            stream.on('end', () => resolve(count));
            stream.on('error', reject);
        });
    }

    return data;
}
