import { Router } from 'express';
import path from 'path';
import { parsedEnv } from '../parse-env.js';
import Video from '../models/video.model.js';
import ffmpeg from 'fluent-ffmpeg';
import { logError } from '../utilities/logger.utility.js';

ffmpeg.setFfmpegPath(parsedEnv.FFMPEG_PATH);
ffmpeg.setFfprobePath(parsedEnv.FFPROBE_PATH);

const router = Router();

router.get('/:extractor/:id/audio_only', async (req, res) => {
    const video = await Video.findOne({ extractor: req.params.extractor, id: req.params.id }, '-_id directory duration videoFile.name');
    if (!video) return res.sendStatus(404);

    // Ensure a range header was sent
    const range = req.headers.range;
    if (!range) return res.status(416).send('Range header required');

    // Parse the byte range
    const byteRange = range.match(/bytes=(\d+)-/);
    if (!byteRange) return res.status(400).send('Invalid range header');

    const startByte = parseInt(byteRange[1], 10);
    if (isNaN(startByte)) return res.status(400).send('Invalid start byte');

    const videoPath = path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory, video.videoFile.name);
    const duration = video.duration;
    const audioBitrate = parsedEnv.AUDIO_ONLY_MODE_BITRATE;
    const estimatedTranscodeFilesize = (audioBitrate * duration) / 8; // Divide by 8 to convert bits to bytes
    const startTime = (startByte / estimatedTranscodeFilesize) * duration;

    // Try to prevent seeking past the duration
    if (startTime >= duration) startTime = duration - 0.5;

    // Set headers
    res.status(206); // Partial content
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Range', `bytes ${startByte}-${estimatedTranscodeFilesize - 1}/${estimatedTranscodeFilesize}`);

    ffmpeg(videoPath)
        .seekInput(startTime) // Start converting the video from the start time in seconds
        .format('mp3')
        .audioCodec('libmp3lame') // MP3 codec
        .on('error', (err) => {
            if (parsedEnv.VERBOSE) logError(err);
        })
        .outputOptions([
            `-b:a ${audioBitrate}`,
            '-compression_level 0',  // Use constant bitrate (CBR) so the estimate of the filesize is accurate
            '-ac 2',
            '-ar 44100'
        ])
        .pipe(res, { end: true });
});

export default router;
