import express from 'express';
import os from 'os';
import { spawnSync } from 'child_process';
import axios from 'axios';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

import Job from '../models/job.model.js';
import DownloadError from '../models/error.model.js';
import Uploader from '../models/uploader.model.js';
import Video from '../models/video.model.js';

import Downloader from '../utilities/job.utility.js';
import ErrorManager from '../utilities/error.utility.js';

const router = express.Router();

const downloader = new Downloader();
const errorManager = new ErrorManager();

let updating = false;

router.get('/', async (req, res) => {
    let jobs;
    let errors;
    try {
        jobs = await Job.find({}).sort({ name: 1 }).lean().exec();
        errors = await DownloadError.find({}).sort({ errorOccurred: -1 }).lean().exec();
    } catch (err) {
        res.sendStatus(500);
    }

    res.json({ jobs, errors, youtubeDlPath: process.env.YOUTUBE_DL_PATH });
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
    if (downloader.isBusy(req.params.jobId)) {
        return res.status(500).json({ error: 'Cannot save while downloading' });
    }

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
    if (errorManager.isBusy()) return res.status(500).json(
        { error: 'Cannot download while repairing an error' }
    );
    if (updating) return res.status(500).json(
        { error: 'Cannot download while checking for updates' }
    );

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
                return res.json({ success: 'Job(s) started, check the console for progress' });
            } else {
                return res.json({ error: 'Job(s) already running' });
            }
        case 'started':
            return res.json({ success: 'Job(s) started, check the console for progress' });
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
            return res.json({ error: 'None running' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/errors/repair/:errorId', async (req, res) => {
    if (downloader.isBusy()) return res.status(500).json(
        { error: 'Cannot repair error while downloading' }
    );
    if (errorManager.isBusy()) return res.status(500).json(
        { error: 'Currently repairing another error' }
    );
    if (updating) return res.status(500).json(
        { error: 'Cannot repair error while checking for updates' }
    );

    try {
        let result = await errorManager.repair(req.params.errorId);
        res.json(result);
    } catch (err) {
        if (parsedEnv.VERBOSE) console.error(err);
        res.sendStatus(500);
    }
});

router.post('/youtube-dl/update', async (req, res) => {
    if (downloader.isBusy()) return res.status(500).json(
        { error: 'Cannot check for updates while downloading' }
    );
    if (errorManager.isBusy()) return res.status(500).json(
        { error: 'Cannot check for updates while repairing errors' }
    );
    if (updating) return res.status(500).json(
        { error: 'Already checking for updates' }
    );

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

let verifyingHashes = false;
router.post('/verify_hashes', async (req, res) => {
    const verifiedHashesFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'checked_hashes.txt');

    if (verifyingHashes) return res.status(500).json({ error: 'Currently verifying hashes' });
    verifyingHashes = true;
    res.json({ success: 'Started verifying hashes, results will be saved to checked_hashes.txt' });

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
    verifyingHashes = false;
});

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

        if (md5 === currentMd5) {
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
    const verifiedHashesFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'checked_hashes.txt');
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
