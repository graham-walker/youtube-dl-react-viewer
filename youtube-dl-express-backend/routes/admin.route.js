import express from 'express';
import os from 'os';
import { spawnSync } from 'child_process';
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

import Downloader from '../utilities/job.utility.js';
import ErrorManager from '../utilities/error.utility.js';
import { decrementStatistics } from '../utilities/statistic.utility.js';

const router = express.Router();

const downloader = new Downloader();
const errorManager = new ErrorManager();
let updating = false;
let verifying = false;
let deleting = false;

router.get('/', async (req, res) => {
    let jobs;
    let errors;
    let extractors;
    try {
        jobs = await Job.find({}).sort({ name: 1 }).lean().exec();
        errors = await DownloadError.find({}).sort({ errorOccurred: -1 }).lean().exec();
        extractors = await Video.distinct('extractor');
    } catch (err) {
        res.sendStatus(500);
    }

    res.json({
        jobs,
        errors,
        extractors,
        youtubeDlPath: process.env.YOUTUBE_DL_PATH
    });
});

router.post('/jobs/save/new', async (req, res) => {
    let job;
    try {
        job = new Job({
            name: req.body.name,
            formatCode: req.body.formatCode,
            isAudioOnly: req.body.isAudioOnly,
            downloadComments: req.body.downloadComments,
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
    const [busy, reason] = isBusy(['deleting', 'downloading'], req.params.jobId);
    if (busy) return res.status(500).json({ error: 'Cannot save job while' + reason });

    let job;
    try {
        job = await Job.findOne({ _id: req.params.jobId });
        job.name = req.body.name;
        job.formatCode = req.body.formatCode;
        job.isAudioOnly = req.body.isAudioOnly;
        job.downloadComments = req.body.downloadComments;
        job.urls = req.body.urls;
        job.arguments = req.body.arguments;
        job.overrideUploader = req.body.overrideUploader;
        await job.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.json({ jobId: job._id, name: job.name });
});

router.post('/jobs/download/', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'retrying', 'deleting'], req.params.jobId);
    if (busy) return res.status(500).json({ error: 'Cannot start download while' + reason });

    if (!Array.isArray(req.body)
        || req.body.length === 0
        || req.body.filter(jobId => typeof jobId !== 'string').length > 0
    ) {
        return res.sendStatus(500);
    }
    const jobsAdded = downloader.queue(req.body);
    switch (await downloader.download()) {
        case 'not-started':
            if (jobsAdded > 0) {
                return res.json({ success: 'Job started, check the console for progress' });
            } else {
                return res.json({ error: 'Job already started' });
            }
        case 'started':
            return res.json({ success: 'Job started, check the console for progress' });
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

router.post('/errors/repair/:errorId', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'retrying', 'deleting', 'downloading']);
    if (busy) return res.status(500).json({ error: (reason === 'retrying import' ? 'Already ' : 'Cannot retry import while ') + reason });

    try {
        let result = await errorManager.repair(req.params.errorId);
        res.json(result);
    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
        res.sendStatus(500);
    }
});

router.post('/youtube-dl/update', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'retrying', 'downloading']);
    if (busy) return res.status(500).json({ error: (reason === 'updating youtube-dl' ? 'Already ' : 'Cannot update youtube-dl while ') + reason });

    updating = true;
    try {
        let updateProcess = spawnSync(parsedEnv.YOUTUBE_DL_PATH, ['-U'], { encoding: 'utf-8' });
        if (updateProcess.status === 0) {
            let message = updateProcess.stdout.split(os.EOL);
            if (message[message.length - 1] === '') message.pop();
            message = message.pop();
            updating = false;
            if (message.startsWith('ERROR')) return res.status(500).json({ error: message });
            return res.json({ success: message });
        } else {
            updating = false;
            return res.status(500).json({ error: 'Failed to check for updates' });
        }
    } catch (err) {
        updating = false;
        return res.sendStatus(500);
    }
});

router.post('/download_uploader_icons', async (req, res) => {
    let sentResponse = false;
    try {
        if (!parsedEnv.YOUTUBE_V3_API_KEY) return res.status(500).json({ error: 'Environment variable YOUTUBE_V3_API_KEY is not set' });

        const uploaders = await Uploader
            .find({ extractor: 'youtube' }, '-_id id name')
            .collation({ locale: 'en' })
            .sort({ name: 1 })
            .lean()
            .exec();

        if (uploaders.length === 0) return res.status(500).json({ error: 'No valid uploaders' });

        for (let uploader of uploaders) {
            const channelIconFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'avatars/youtube', uploader.name.replace(/[|:&;$%@"<>()+,/\\*?]/g, '_') + '.jpg');
            if (req.query?.force !== 'true' && (await fs.exists(channelIconFile))) continue;

            let channelRes;
            try {
                channelRes = await axios.get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${uploader.id}&fields=items%2Fsnippet%2Fthumbnails&key=${parsedEnv.YOUTUBE_V3_API_KEY}`);
            } catch (err) {
                if (err?.response?.data?.error?.message === 'API key not valid. Please pass a valid API key.') {
                    return res.status(500).json({ error: 'Invalid API key' });
                }
                console.error('Failed to lookup icon for ' + uploader.name);
                if (parsedEnv.VERBOSE) console.error(err);
                continue;
            }

            if (!sentResponse) {
                res.json({ success: 'Downloading uploader icons, check the console for progress' });
                sentResponse = true;
            }

            try {
                const channelIconUrl = channelRes.data.items[0].snippet.thumbnails.high.url;
                let channelIconRes = await axios.request({ url: channelIconUrl, method: 'GET', responseType: 'arraybuffer' });
                await fs.writeFile(channelIconFile, channelIconRes.data);
                console.log('Downloaded icon for ' + uploader.name);
            } catch (err) {
                console.error('Failed to download icon for ' + uploader.name);
                if (parsedEnv.VERBOSE) console.error(err);
            }
        }
        if (!sentResponse) {
            return res.json({ success: 'All uploader icons downloaded' });
        } else {
            console.log('Finished downloading uploader icons');
        }
    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
        if (!sentResponse) return res.sendStatus(500);
    }
});

router.post('/verify_hashes', async (req, res) => {
    const [busy, reason] = isBusy(['deleting', 'verifying']);
    if (busy) return res.status(500).json({ error: (reason === 'verifying hashes' ? 'Already ' : 'Cannot verify hashes while ') + reason });

    const verifiedHashesFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'verified_hashes.txt');

    verifying = true;
    res.json({ success: 'Started verifying hashes, results will be saved to verified_hashes.txt' });

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
        }

        await fs.appendFile(verifiedHashesFile, 'FINISHED HASH VERIFICATION ' + new Date().toISOString() + '\r\n');
        await fs.appendFile(verifiedHashesFile, mismatches + ' MISMATCHES');
        console.log(`Finished verifying hashes, ${mismatches} mismatches`);
    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
    }
    verifying = false;
});

router.post('/delete', async (req, res) => {
    try {
        const preventRedownload = !!req.body.preventRedownload;

        let pipeline = [];
        let match = {};

        if (req.body.uploader) match.uploader = req.body.uploader;
        if (req.body.extractor) match.extractor = req.body.extractor;
        if (req.body.id) match.id = req.body.id;

        if (req.body.uploadStart || req.body.uploadEnd) match.uploadDate = {};
        if (req.body.uploadStart) match.uploadDate.$gte = new Date(req.body.uploadStart);
        if (req.body.uploadEnd) match.uploadDate.$lte = new Date(req.body.uploadEnd);

        if (req.body.playlist) {
            pipeline.push({
                $lookup: {
                    from: Playlist.collection.name,
                    localField: 'playlistDocument',
                    foreignField: '_id',
                    as: 'lookupPlaylist'
                }
            });
            match['lookupPlaylist.id'] = req.body.playlist;
        }

        if (req.body.job) {
            pipeline.push({
                $lookup: {
                    from: Job.collection.name,
                    localField: 'jobDocument',
                    foreignField: '_id',
                    as: 'lookupJob'
                }
            });
            match['lookupJob.name'] = req.body.job;
        }

        pipeline.push({ $match: match }, { $project: { _id: 0, extractor: 1, id: 1, directory: 1 } });

        const videos = await Video.aggregate(pipeline).exec();

        if (videos.length === 0) return res.status(500).json({ error: 'No videos match the query' });
        if (req.query.preview === 'true') return res.json({ success: `${videos.length} video${videos.length !== 1 ? 's' : ''} will be deleted` });

        // Delete videos
        const [busy, reason] = isBusy(['retrying', 'deleting', 'downloading', 'verifying']);
        if (busy) return res.status(500).json({ error: (reason === 'deleting videos' ? 'Already ' : 'Cannot delete videos while ') + reason });

        res.json({ success: `Deleting ${videos.length} video${videos.length !== 1 ? 's' : ''}, check the console for progress` });
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
                            console.log(uploader.statistics.totalVideoCount);
                            if (uploader.statistics.totalVideoCount <= 0) {
                                await uploader.deleteOne();
                            } else {
                                await uploader.save();
                            }
                        }
                    }

                    // session.commitTransaction();
                    // session.endSession();
                    console.log(`Deleted video ${videoName}`);
                } catch (err) {
                    // session.abortTransaction();
                    // session.endSession();
                    console.log(`Failed to delete video ${videoName}`)
                    if (parsedEnv.VERBOSE) console.error(err);
                }
            }
            deleting = false;
            console.log('Finished deleting videos');
        } catch (err) {
            deleting = false;
            throw err;
        }
    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
    }
});

const isBusy = (check = ['updating', 'retrying', 'deleting', 'downloading', 'verifying'], jobId = null) => {
    // Ordered by shortest expected operation
    if (updating && check.includes('updating')) return [true, 'updating youtube-dl'];
    if (errorManager.isBusy() && check.includes('retrying')) return [true, 'retrying import'];
    if (deleting && check.includes('deleting')) return [true, 'deleting videos'];
    if (downloader.isBusy(jobId) && check.includes('downloading')) return [true, 'downloading videos'];
    if (verifying && check.includes('verifying')) return [true, 'verifying hashes'];
    return [false, null];
}

const verifyFileHash = async (file, directory) => {
    if (file === null) return 0;

    const md5 = file.md5;
    const filename = path.join(directory, file.name);

    try {
        // If SKIP_HASHING=true md5 will be undefined 
        if (md5 === undefined) {
            await logHashResult('SKIPPED', filename);
            return 0;
        }

        let currentMd5 = await generateFileHash(filename);

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
        if (parsedEnv.VERBOSE) console.error(err);
    }

    return 0;
}

const logHashResult = async (result, filename) => {
    const verifiedHashesFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'verified_hashes.txt');
    const message = `${result}\t\t${filename}`;
    console.log(message);
    await fs.appendFile(verifiedHashesFile, message + '\r\n');
}

const generateFileHash = async (filename) => {
    return new Promise((resolve, reject) => {
        let shasum = crypto.createHash('md5');
        let readStream = fs.createReadStream(filename);
        readStream.on('data', (data) => {
            shasum.update(data);
        }).on('end', () => {
            resolve(shasum.digest('hex'));
        }).on('error', (err) => {
            reject(err);
        });
    });
}

export default router;
