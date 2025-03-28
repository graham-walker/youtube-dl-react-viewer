import express from 'express';
import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import mongoose from 'mongoose';

import Job from '../models/job.model.js';
import DownloadError from '../models/error.model.js';
import Uploader from '../models/uploader.model.js';
import Video from '../models/video.model.js';
import Playlist from '../models/playlist.model.js';
import Statistic from '../models/statistic.model.js';
import Version from '../models/version.model.js';
import ApiKey from '../models/apikey.model.js';

import Downloader from '../utilities/job.utility.js';
import ErrorManager from '../utilities/error.utility.js';
import Importer from '../utilities/import.utility.js';
import { decrementStatistics } from '../utilities/statistic.utility.js';
import { parsedEnv } from '../parse-env.js';
import { logLine, logError, history, historyUpdated } from '../utilities/logger.utility.js';
import { updateYoutubeDl, getYoutubeDlVersion } from '../utilities/job.utility.js';
import { makeSafe } from '../utilities/file.utility.js';
import { isQuoted, stripQuotes, escapeRegex } from '../utilities/video.utility.js';

const router = express.Router();

const downloader = new Downloader();
const errorManager = new ErrorManager();
const importer = new Importer();
let updating = false;
let verifying = false;
let deleting = false;
let verifyingStopRequested = false;

const verifiedHashesFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'verified_hashes.txt');

let youtubeDlVersion = getYoutubeDlVersion();

router.get('/', async (req, res) => {
    try {
        let jobs = await Job.find({}).sort({ name: 1 }).lean().exec();
        let errors = await DownloadError.find({}).sort({ errorOccurred: -1 }).lean().exec();
        let extractors = await Video.distinct('extractor');
        let adminFiles = (await fs.readdir(parsedEnv.OUTPUT_DIRECTORY, { withFileTypes: true })).filter(file => file.isFile()).map(file => file.name);
        let apiKeys = await ApiKey.find({}).sort({ createdAt: 1 }).lean().exec();

        res.json({
            jobs,
            errors,
            extractors,
            adminFiles,
            youtubeDlPath: parsedEnv.YOUTUBE_DL_PATH,
            youtubeDlVersion,
            consoleOutput: history,
            historyUpdated,
            apiKeys,
            currentUserId: req.userId,
        });
    } catch (err) {
        res.sendStatus(500);
    }
});

router.get('/logs', async (req, res) => {
    try {
        let adminFiles = (await fs.readdir(parsedEnv.OUTPUT_DIRECTORY, { withFileTypes: true })).filter(file => file.isFile()).map(file => file.name);

        res.json({
            adminFiles,
            consoleOutput: history,
            historyUpdated,
        });
    } catch (err) {
        res.sendStatus(500);
    }
});

router.post('/api-keys/save/new', async (req, res) => {
    let apiKey;
    try {
        apiKey = new ApiKey({
            name: req.body.name,
            userDocument: req.body.userDocument,
            pattern: req.body.pattern,
            enabled: req.body.enabled,
        });
        await apiKey.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.json(apiKey.toJSON());
});

router.post('/api-keys/save/:apiKeyId', async (req, res) => {
    let apiKey;
    try {
        apiKey = await ApiKey.findOne({ _id: req.params.apiKeyId });
        apiKey.name = req.body.name;
        apiKey.userDocument = req.body.userDocument;
        apiKey.pattern = req.body.pattern;
        apiKey.enabled = req.body.enabled;
        await apiKey.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.json(apiKey.toJSON());
});

router.post('/jobs/save/new', async (req, res) => {
    let job;
    try {
        job = new Job({
            name: req.body.name,
            formatCode: req.body.formatCode,
            isAudioOnly: req.body.isAudioOnly,
            downloadComments: req.body.downloadComments,
            recodeVideo: req.body.recodeVideo,
            urls: req.body.urls,
            arguments: req.body.arguments,
            overrideUploader: req.body.overrideUploader,
        });
        await job.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.json(job.toJSON());
});

router.post('/jobs/save/:jobId', async (req, res) => {
    const [busy, reason] = isBusy(['deleting', 'importing', 'downloading'], req.params.jobId);
    if (busy) return res.status(500).json({ error: 'Cannot save job while ' + reason });

    let job;
    try {
        job = await Job.findOne({ _id: req.params.jobId });
        job.name = req.body.name;
        job.formatCode = req.body.formatCode;
        job.isAudioOnly = req.body.isAudioOnly;
        job.downloadComments = req.body.downloadComments;
        job.recodeVideo = req.body.recodeVideo;
        job.urls = req.body.urls;
        job.arguments = req.body.arguments;
        job.overrideUploader = req.body.overrideUploader;
        await job.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.json({ jobId: job._id, name: job.name });
});

router.post('/jobs/append/:jobId', async (req, res) => {
    let job;
    try {
        job = await Job.findOne({ _id: req.params.jobId });
        if (job.urls.split('\n').includes(req.body.url)) return res.status(500).json({ error: 'URL already added to job' });
        job.urls = `${job.urls.trim() === '' ? job.urls : job.urls.replace(/\n*$/, '\n\n')}# ${req.body.title}\n${req.body.url}\n`;
        await job.save();
    } catch (err) {
        return res.status(500).json({ error: 'Failed to add URL to job' });
    }
    return res.json({ success: 'URL added to job' });
});

router.post('/jobs/download/', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'repairing', 'deleting', 'importing'], req.params.jobId);
    if (busy) return res.status(500).json({ error: 'Cannot start download while ' + reason });

    if (!Array.isArray(req.body)
        || req.body.length === 0
        || req.body.filter(jobId => typeof jobId !== 'string').length > 0
    ) {
        return res.sendStatus(500);
    }
    const jobsAdded = downloader.queue(req.body);

    const result = await downloader.download();
    if (result === 'updated-started') youtubeDlVersion = getYoutubeDlVersion();

    switch (result) {
        case 'not-started':
            if (jobsAdded > 0) {
                return res.json({ success: 'Job started, check the console for progress' });
            } else {
                return res.json({ error: 'Job already started' });
            }
        case 'updated-started':
        case 'started':
            return res.json({ success: 'Job started, check the console for progress', youtubeDlVersion });
        case 'failed':
            return res.status(500).json({ error: 'Failed to start' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/jobs/stop', async (req, res) => {
    switch (await downloader.stop()) {
        case 'stopped':
            return res.json({ success: 'Stopped' });
        case 'failed':
            return res.json({ error: 'Failed to stop' });
        case 'none':
            return res.json({ error: 'No jobs are running' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/errors/repair', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'deleting', 'importing', 'downloading']);
    if (busy) return res.status(500).json({ error: (reason === 'repairing errors' ? 'Already ' : 'Cannot repair while ') + reason });

    const errorId = req.body?.errorId;
    const resolveBy = req.body?.resolveBy;

    const resolveMessage = !!errorId ? (resolveBy === 'retry' ? 'Retry' : 'Deletion') : (resolveBy === 'retry' ? 'Retries' : 'Deletions');

    const errorsAdded = await errorManager.queue(resolveBy, errorId ? [errorId] : undefined);

    const result = await errorManager.repair();
    switch (result) {
        case 'nothing-to-do':
            return res.json({ error: `No errors to repair` });
        case 'not-started':
            if (errorsAdded > 0) {
                return res.json({ success: `${resolveMessage} started, check the console for progress` });
            } else {
                return res.json({ error: `${resolveMessage} already started` });
            }
        case 'started':
            return res.json({ success: `${resolveMessage} started, check the console for progress` });
        case 'failed':
            return res.status(500).json({ error: 'Failed to start' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/errors/stop', async (req, res) => {
    switch (await errorManager.stop()) {
        case 'stopped':
            return res.json({ success: 'Stopped' });
        case 'failed':
            return res.json({ error: 'Failed to stop' });
        case 'none':
            return res.json({ error: 'No repairs are running' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/youtube-dl/update', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'repairing', 'importing', 'downloading']);
    if (busy) return res.status(500).json({ error: (reason === 'updating yt-dlp' ? 'Already ' : 'Cannot update yt-dlp while ') + reason });

    updating = true;
    try {
        const message = updateYoutubeDl();
        updating = false;
        if (message.hasOwnProperty('success')) {
            youtubeDlVersion = getYoutubeDlVersion();
            return res.json({ ...message, youtubeDlVersion });
        }
        return res.status(500).json(message);
    } catch (err) {
        updating = false;
        return res.sendStatus(500);
    }
});

router.post('/download_uploader_icons', async (req, res) => {
    let sentResponse = false;
    try {
        const uploaders = await Uploader
            .find({ $or: [{ extractor: 'youtube' }, { extractor: 'soundcloud' }] }, '-_id id name extractor url')
            .collation({ locale: 'en' })
            .sort({ name: 1 })
            .lean()
            .exec();

        if (uploaders.length === 0) return res.status(500).json({ error: 'No valid uploaders' });

        for (let uploader of uploaders) {
            const channelIconFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'avatars', makeSafe(uploader.extractor, ' -'), makeSafe(uploader.id, '_') + '.jpg');
            if (req.query?.force !== 'true' && (await fs.exists(channelIconFile))) continue;

            if (!sentResponse) {
                res.json({ success: 'Downloading uploader icons, check the console for progress' });
                sentResponse = true;
            }

            let uploaderName;
            try {
                if (!uploader.url) continue;
                uploaderName = uploader.url.split('/').pop();
                if (uploader.extractor === 'youtube' && uploaderName.startsWith('@')) uploaderName = uploaderName.substring(1);

                let iconRes = await axios.request({
                    url: `https://unavatar.io/${encodeURIComponent(uploader.extractor)}/${encodeURIComponent(uploaderName)}?fallback=false`,
                    method: 'GET',
                    responseType: 'arraybuffer'
                });
                await fs.ensureDir(path.dirname(channelIconFile));
                await fs.writeFile(channelIconFile, iconRes.data);
                logLine(`Downloaded icon for ${uploader.extractor}/${uploaderName}`);
            } catch (err) {
                if (err?.response?.status === 404) {
                    logError(`Icon does not exist for ${uploader.extractor}/${uploaderName || uploader.name}`);
                } else if (err?.response?.status === 429) {
                    logError(`Rate limit hit`);
                } else {
                    logError(`Failed to download icon for ${uploader.extractor}/${uploaderName || uploader.name}`);
                }
                if (parsedEnv.VERBOSE) logError(err);
            }
        }
        if (!sentResponse) {
            return res.json({ success: 'All uploader icons already downloaded' });
        } else {
            logLine('Finished downloading uploader icons');
        }
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        if (!sentResponse) return res.sendStatus(500);
    }
});

router.post('/verify_hashes', async (req, res) => {
    if (req.query.stop === 'true') {
        if (verifying) {
            verifyingStopRequested = true;
            return res.json({ success: 'Stop requested' });
        } else {
            return res.json({ error: 'Not verifying hashes' });
        }
    }

    const [busy, reason] = isBusy(['deleting', 'verifying']);
    if (busy) return res.status(500).json({ error: (reason === 'verifying hashes' ? 'Already ' : 'Cannot verify hashes while ') + reason });

    verifying = true;
    verifyingStopRequested = false;
    res.json({ success: 'Started verifying hashes, check the console for progress. Results will be saved to verified_hashes.txt' });

    try {
        let videos = await Video.find({},
            '-_id extractor id directory videoFile mediumResizedThumbnailFile smallResizedThumbnailFile infoFile descriptionFile annotationsFile thumbnailFiles subtitleFiles')
            .lean()
            .exec();

        await fs.writeFile(verifiedHashesFile, 'STARTING HASH VERIFICATION ' + new Date().toISOString() + '\r\n');

        let mismatches = 0;
        for (let video of videos) {
            const directory = path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', video.directory);
            const thumbnailDirectory = path.join(parsedEnv.OUTPUT_DIRECTORY, 'thumbnails', video.directory);

            mismatches += await verifyFileHash(video.videoFile, directory);
            mismatches += await verifyFileHash(video.mediumResizedThumbnailFile, thumbnailDirectory);
            mismatches += await verifyFileHash(video.smallResizedThumbnailFile, thumbnailDirectory);
            mismatches += await verifyFileHash(video.infoFile, directory);
            mismatches += await verifyFileHash(video.descriptionFile, directory);
            mismatches += await verifyFileHash(video.annotationsFile, directory);
            for (let thumbnailFile of video.thumbnailFiles) mismatches += await verifyFileHash(thumbnailFile, directory);
            for (let subtitleFile of video.subtitleFiles) mismatches += await verifyFileHash(subtitleFile, directory);

            if (verifyingStopRequested) {
                await fs.appendFile(verifiedHashesFile, 'STOP REQUESTED ' + new Date().toISOString() + '\r\n');
                await fs.appendFile(verifiedHashesFile, mismatches + ' MISMATCHES');
                logLine(`Stopped verifying hashes, ${mismatches} mismatches`);
                verifying = false;
                return;
            }
        }

        await fs.appendFile(verifiedHashesFile, 'FINISHED HASH VERIFICATION ' + new Date().toISOString() + '\r\n');
        await fs.appendFile(verifiedHashesFile, mismatches + ' MISMATCHES');
        logLine(`Finished verifying hashes, ${mismatches} mismatches`);
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
    }
    verifying = false;
});

router.post('/delete', async (req, res) => {
    try {
        const preventRedownload = !!req.body.preventRedownload;

        let pipeline = [];
        const match = {};

        if (req.body.id) match.id = req.body.id;

        if (mongoose.Types.ObjectId.isValid(req.body.job)) match.jobDocument = new mongoose.Types.ObjectId(req.body.job);
        if (req.body.extractor) match.extractor = req.body.extractor;

        if (req.body.uploadStart || req.body.uploadEnd) match.uploadDate = {};
        if (req.body.uploadStart && typeof req.body.uploadStart === 'string' && !isNaN(new Date(req.body.uploadStart).getTime())) match.uploadDate.$gte = new Date(req.body.uploadStart);
        if (req.body.uploadEnd && typeof req.body.uploadEnd === 'string' && !isNaN(new Date(req.body.uploadEnd).getTime())) match.uploadDate.$lte = new Date(req.body.uploadEnd);

        let uploader = req.body.uploader;
        if (uploader && typeof uploader === 'string') {
            const uploaderIds = await Uploader.find({
                name: isQuoted(uploader) ? stripQuotes(uploader) : { $regex: escapeRegex(uploader), $options: 'i' }
            }, '_id');
            match.uploaderDocument = { $in: uploaderIds.map(doc => doc._id) }
        }

        let playlist = req.body.playlist;
        if (playlist && typeof playlist === 'string') {
            const playlistIds = await Playlist.find({
                name: isQuoted(playlist) ? stripQuotes(playlist) : { $regex: escapeRegex(playlist), $options: 'i' }
            }, '_id');
            match.playlistDocument = { $in: playlistIds.map(doc => doc._id) }
        }

        pipeline.push({ $match: match }, { $project: { _id: 0, extractor: 1, id: 1, directory: 1 } });

        const videos = await Video.aggregate(pipeline).exec();

        if (videos.length === 0) return res.status(500).json({ error: 'No videos match the query' });
        if (req.query.preview === 'true') return res.json({ success: `${videos.length} video${videos.length !== 1 ? 's' : ''} would be deleted` });

        // Delete videos
        const [busy, reason] = isBusy(['repairing', 'deleting', 'downloading', 'importing', 'verifying']);
        if (busy) return res.status(500).json({ error: (reason === 'deleting videos' ? 'Already ' : 'Cannot delete videos while ') + reason });

        res.json({ success: `Deleting ${videos.length} video${videos.length !== 1 ? 's' : ''}, check the console for progress. Video files will not be deleted until the next time the web app is restarted` });
        deleting = true;

        try {
            for (let { extractor, id, directory } of videos) {
                const videoName = `${extractor}/${id}`;
                const videoDir = path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', directory);
                const thumbnailsDir = path.join(parsedEnv.OUTPUT_DIRECTORY, 'thumbnails', directory);

                const session = null; // Replica sets are required to use transactions
                // const session = await mongoose.startSession();
                // session.startTransaction();

                try {
                    // Delete video
                    const video = await Video.findOne({ extractor, id }, null, { session });
                    await video.deleteOne();

                    // Express locks static files while streaming (someone watching the video being deleted) so files can not be deleted immediately
                    // Since the epoch is added to the filename when downloading/importing, files can be safely redownloaded even if they are not deleted right away
                    // Files will be deleted on server restart when they are guaranteed to not be locked
                    await fs.appendFile(path.join(parsedEnv.OUTPUT_DIRECTORY, 'delete_queue.txt'), videoDir + '\r\n' + thumbnailsDir + '\r\n');

                    if (!preventRedownload) {
                        const archiveFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'archive.txt');
                        let archived = (await fs.readFile(archiveFile)).toString().replaceAll('\r\n', '\n').split('\n');
                        archived = archived.filter(video => video !== `${extractor} ${id}`);
                        await fs.writeFile(archiveFile, archived.join('\r\n'));
                    }

                    // Update statistics
                    const statistic = await Statistic.findOne({ accessKey: 'videos' }, null, { session });
                    statistic.statistics = await decrementStatistics(video, statistic, session);
                    await statistic.save();

                    const job = await Job.findById(video.jobDocument, null, { session });
                    job.statistics = await decrementStatistics(video, job, session);
                    await job.save();

                    if (video.playlistDocument) {
                        const playlist = await Playlist.findById(video.playlistDocument, null, { session });
                        if (playlist) {
                            playlist.statistics = await decrementStatistics(video, playlist, session);
                            if (playlist.statistics.totalVideoCount <= 0) {
                                await playlist.deleteOne();
                            } else {
                                await playlist.save();
                            }
                        }
                    }

                    if (video.uploaderDocument) {
                        const uploader = await Uploader.findById(video.uploaderDocument, null, { session });
                        if (uploader) {
                            uploader.statistics = await decrementStatistics(video, uploader, session);
                            if (uploader.statistics.totalVideoCount <= 0) {
                                await uploader.deleteOne();
                            } else {
                                await uploader.save();
                            }
                        }
                    }

                    // session.commitTransaction();
                    // session.endSession();
                    logLine(`Deleted video ${videoName}`);
                } catch (err) {
                    // session.abortTransaction();
                    // session.endSession();
                    logLine(`Failed to delete video ${videoName}`)
                    if (parsedEnv.VERBOSE) logError(err);
                }
            }
            deleting = false;
            logLine('Finished deleting videos');
        } catch (err) {
            deleting = false;
            throw err;
        }
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }
});

router.post('/import', async (req, res) => {
    let { folder, jobName, subfolders, copy, continueOnFailed, overrideExt } = req.body;

    if (overrideExt && overrideExt.startsWith('.')) overrideExt = overrideExt.slice(1);

    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) return res.status(500).json({ error: 'Folder does not exist' });

    let job = await Job.findOne({ name: jobName });
    if (!job) return res.status(500).json({ error: 'Job does not exist' });

    const [busy, reason] = isBusy(['updating', 'repairing', 'deleting', 'downloading', 'importing'], req.params.jobId);
    if (busy) return res.status(500).json({ error: (reason === 'importing videos' ? 'Already ' : 'Cannot import videos while ') + reason });

    const result = await importer.import(folder, job, subfolders, copy, continueOnFailed, overrideExt);
    switch (result) {
        case 'not-started':
            return res.json({ error: 'Import already started' });
        case 'started':
            return res.json({ success: 'Import started, check the console for progress' });
        case 'failed':
            return res.status(500).json({ error: 'Failed to start' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/import/stop', async (req, res) => {
    switch (await importer.stop()) {
        case 'stopped':
            return res.json({ success: 'Stopped' });
        case 'failed':
            return res.json({ error: 'Failed to stop' });
        case 'none':
            return res.json({ error: 'No imports are running' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/statistics/recalculate', async (req, res) => {
    try {
        let version = await Version.findOne({ accessKey: 'version' });
        if (!version) version = await new Version().save();

        const cancel = req.query?.cancel === 'true';

        version.recalculateOnRestart = !cancel;

        await version.save();

        return res.json({ success: cancel ? 'Statistics will not be recalculated the next time the web app is restarted' : 'Statistics will be recalculated the next time the web app is restarted. During that time the web app will not be accessible' });
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }
});

const isBusy = (check = ['updating', 'repairing', 'deleting', 'downloading', 'importing', 'verifying'], jobId = null) => {
    // Ordered by shortest expected operation
    if (updating && check.includes('updating')) return [true, 'updating yt-dlp'];
    if (errorManager.isBusy() && check.includes('repairing')) return [true, 'repairing errors'];
    if (deleting && check.includes('deleting')) return [true, 'deleting videos'];
    if (downloader.isBusy(jobId) && check.includes('downloading')) return [true, 'downloading videos'];
    if (importer.isBusy() && check.includes('importing')) return [true, 'importing videos'];
    if (verifying && check.includes('verifying')) return [true, 'verifying hashes'];
    return [false, null];
}

const verifyFileHash = async (file, directory) => {
    if (file === null) return 0;
    if (verifyingStopRequested) return 0;

    const md5 = file.md5;
    const filename = path.join(directory, file.name);

    try {
        // If SKIP_HASHING=true md5 will be undefined 
        if (md5 === undefined) {
            await logHashResult('SKIPPED', filename);
            return 0;
        }

        let currentMd5 = await generateFileHash(filename);
        if (verifyingStopRequested) return 0;

        if (md5 === currentMd5 || file.filesize === 0) {
            await logHashResult('OK', filename);
        } else {
            await logHashResult('MISMATCH', filename);
            return 1;
        }
    } catch (err) {
        if (err?.code === 'ENOENT') {
            await logHashResult('FILE NOT FOUND', filename);
        } else {
            await logHashResult('FAILED TO TEST', filename);
        }
        if (parsedEnv.VERBOSE) logError(err);
    }

    return 0;
}

const logHashResult = async (result, filename) => {
    const message = `${result}\t\t${filename}`;
    logLine(message);
    await fs.appendFile(verifiedHashesFile, message + '\r\n');
}

const generateFileHash = async (filename) => {
    return new Promise((resolve, reject) => {
        let shasum = crypto.createHash('md5');
        let readStream = fs.createReadStream(filename);
        readStream.on('data', (data) => {
            if (verifyingStopRequested) {
                resolve(undefined);
            } else {
                shasum.update(data);
            }
        }).on('end', () => {
            resolve(shasum.digest('hex'));
        }).on('error', (err) => {
            reject(err);
        });
    });
}

export default router;
