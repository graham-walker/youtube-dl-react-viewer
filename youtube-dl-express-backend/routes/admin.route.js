import express from 'express';
import os from 'os';
import { spawn, spawnSync, execSync } from 'child_process';
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

import Downloader from '../utilities/job.utility.js';
import ErrorManager from '../utilities/error.utility.js';
import { decrementStatistics } from '../utilities/statistic.utility.js';
import { parsedEnv } from '../parse-env.js';
import { logLine, logWarn, logError, history, logStdout } from '../utilities/logger.utility.js';

const router = express.Router();

const downloader = new Downloader();
const errorManager = new ErrorManager();
let updating = false;
let verifying = false;
let deleting = false;
let importing = false;

const verifiedHashesFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'verified_hashes.txt');

router.get('/', async (req, res) => {
    try {
        let jobs = await Job.find({}).sort({ name: 1 }).lean().exec();
        let errors = await DownloadError.find({}).sort({ errorOccurred: -1 }).lean().exec();
        let extractors = await Video.distinct('extractor');
        let adminFiles = (await fs.readdir(parsedEnv.OUTPUT_DIRECTORY, { withFileTypes: true })).filter(file => file.isFile()).map(file => file.name);

        res.json({
            jobs,
            errors,
            extractors,
            adminFiles,
            youtubeDlPath: process.env.YOUTUBE_DL_PATH,
            consoleOutput: history,
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
        });
    } catch (err) {
        res.sendStatus(500);
    }
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
    const [busy, reason] = isBusy(['deleting', 'importing', 'downloading'], req.params.jobId);
    if (busy) return res.status(500).json({ error: 'Cannot save job while ' + reason });

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
    const [busy, reason] = isBusy(['updating', 'retrying', 'deleting', 'importing'], req.params.jobId);
    if (busy) return res.status(500).json({ error: 'Cannot start download while ' + reason });

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
    const [busy, reason] = isBusy(['updating', 'retrying', 'deleting', 'importing', 'downloading']);
    if (busy) return res.status(500).json({ error: (reason === 'retrying import' ? 'Already ' : 'Cannot retry import while ') + reason });

    try {
        let result = await errorManager.repair(req.params.errorId);
        res.json(result);
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        res.sendStatus(500);
    }
});

router.post('/youtube-dl/update', async (req, res) => {
    const [busy, reason] = isBusy(['updating', 'retrying', 'importing', 'downloading']);
    if (busy) return res.status(500).json({ error: (reason === 'updating youtube-dl' ? 'Already ' : 'Cannot update youtube-dl while ') + reason });

    updating = true;
    try {
        if (parsedEnv.YOUTUBE_DL_UPDATE_COMMAND) {
            try {
                let output = execSync(parsedEnv.YOUTUBE_DL_UPDATE_COMMAND);
                updating = false;
                logStdout(output);
                return res.json({ success: output.toString() });
            } catch (err) {
                if (parsedEnv.VERBOSE) logError(err.toString());
                updating = false;
                return res.status(500).json({ error: `Command failed YOUTUBE_DL_UPDATE_COMMAND=${parsedEnv.YOUTUBE_DL_UPDATE_COMMAND}` });
            }
        } else {
            let updateProcess = spawnSync(parsedEnv.YOUTUBE_DL_PATH, ['-U'], { encoding: 'utf-8' });
            if (updateProcess.status === 0) {
                logStdout(updateProcess.stdout);
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
        }
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
            const channelIconFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'avatars/' + uploader.extractor, uploader.id.replace(/[|:&;$%@"<>()+,/\\*?]/g, '_') + '.jpg');
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
            return res.json({ success: 'All uploader icons downloaded' });
        } else {
            logLine('Finished downloading uploader icons');
        }
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        if (!sentResponse) return res.sendStatus(500);
    }
});

router.post('/verify_hashes', async (req, res) => {
    const [busy, reason] = isBusy(['deleting', 'verifying']);
    if (busy) return res.status(500).json({ error: (reason === 'verifying hashes' ? 'Already ' : 'Cannot verify hashes while ') + reason });

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
        const [busy, reason] = isBusy(['retrying', 'deleting', 'downloading', 'importing', 'verifying']);
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
    }
});

router.post('/import', async (req, res) => {
    let sentResponse = false;
    try {
        let { folder, jobName, subfolders, copy, continueOnFailed, overrideExt } = req.body;

        if (overrideExt && overrideExt.startsWith('.')) overrideExt = overrideExt.slice(1);

        if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) return res.status(500).json({ error: 'Folder does not exist' });

        let job = await Job.findOne({ name: jobName });
        if (!job) return res.status(500).json({ error: 'Job does not exist' });

        const [busy, reason] = isBusy(['updating', 'retrying', 'deleting', 'downloading', 'importing'], req.params.jobId);
        if (busy) return res.status(500).json({ error: (reason === 'importing videos' ? 'Already ' : 'Cannot import videos while ') + reason });

        importing = true;
        res.json({ success: 'Import started, check the console for progress' });
        sentResponse = true;
        logLine(`Importing videos from: ${folder}`);

        const importErrorFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'import_errors.txt');
        fs.removeSync(importErrorFile); // Delete the error file from the last import

        let files = await walk(folder, subfolders ? 0 : 1000);

        let addedVideoCount = 0;
        let alreadyAddedVideoCount = 0;
        let failed = 0;

        for (let i = 0; i < files.length; i++) {
            if (files[i].isFile() && files[i].name.endsWith('.info.json')) {
                const infojsonFile = path.join(files[i].path, files[i].name);
                logLine(`Found video metadata file: ${infojsonFile}`);

                try {
                    // Parse the video metadata file
                    let infojsonData;
                    try {
                        infojsonData = JSON.parse(fs.readFileSync(infojsonFile, 'utf8'));
                    } catch (err) {
                        logError('Unable to parse metadata');
                        throw err;
                    }

                    // Check metadata for required properties
                    let requiredProperties = ['id', 'extractor', 'title', 'extractor_key'];
                    if (!overrideExt) requiredProperties.push('ext');

                    for (let i = 0; i < requiredProperties.length; i++) {
                        if (!infojsonData.hasOwnProperty(requiredProperties[i])) {
                            const err = `Metadata missing required property: ${requiredProperties[i]}`;
                            logError(err);
                            throw new Error(err);
                        }
                    }

                    // Make sure video isn't duplicate
                    if (await Video.countDocuments({ id: infojsonData.id, extractor: infojsonData.extractor }) > 0) {
                        alreadyAddedVideoCount++;
                        logWarn('Already downloaded video will be skipped');
                        continue;
                    }

                    const basename = files[i].name.slice(0, -'info.json'.length);
                    const videoFileName = basename + (overrideExt ? overrideExt : infojsonData.ext);

                    // Get the downloaded date
                    let downloaded;
                    try {
                        downloaded = (await fs.stat(path.join(files[i].path, videoFileName))).birthtime.getTime(); // Should default to ctime on OSs that do not support birthtime
                    } catch (err) {
                        logError('Unable to get downloaded date from file');
                        throw err;
                    }

                    // Get all files related to the video file
                    let relatedFiles = files.filter(file =>
                        file.isFile()
                        && file.name.startsWith(basename) // Possible conflict if all videos are in the same folder and the basename starts the same as a different video
                        && file.path === files[i].path
                    );

                    // Create the new directory
                    const outputPath = path.join(
                        parsedEnv.OUTPUT_DIRECTORY,
                        'videos',
                        infojsonData.extractor.toString(),
                        infojsonData.id.toString(),
                        Math.floor(new Date().getTime() / 1000).toString()
                    );
                    await fs.ensureDir(outputPath);

                    // Move/copy files
                    for (let i = 0; i < relatedFiles.length; i++) {
                        let inputFile = path.join(relatedFiles[i].path, relatedFiles[i].name);
                        logLine(`${copy ? 'Copying' : 'Moving'} file: ${inputFile}`)
                        try {
                            let outputFile = path.join(outputPath, relatedFiles[i].name);
                            if (copy) {
                                await fs.copyFile(inputFile, outputFile);
                            } else {
                                await fs.move(inputFile, outputFile);
                            }
                        } catch (err) {
                            logError(`Failed to ${copy ? 'copy' : 'move'} file`);
                            throw err;
                        }
                    }

                    logLine('Adding video to the database');
                    // On non-Windows platforms npm incorrectly escapes the "$" character which can appear in the filename so node is used here instead
                    let execArguments = [
                        '--job-id',
                        job._id,
                        '--downloaded',
                        downloaded,
                        '--is-import',
                        '--video',
                        path.join(outputPath, videoFileName),
                    ];
                    if (process.platform === 'win32') {
                        execArguments.unshift('--');
                        execArguments.unshift('exec');
                        execArguments.unshift('run');
                    } else {
                        execArguments.unshift('exec.js');
                        execArguments.unshift('dotenv/config');
                        execArguments.unshift('--require');
                    }
                    const execProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'node', execArguments, { windowsHide: true });
                    execProcess.stdout.on('data', (data) => logStdout(data));
                    execProcess.stderr.on('data', (data) => logStdout(data));
                    const exitCode = await new Promise((resolve, reject) => execProcess.on('close', resolve));

                    if (exitCode !== 0) {
                        let err = `Exec exited with status code ${exitCode}`;
                        logError(err);
                        throw new Error(err);
                    }

                    try {
                        await fs.appendFile(
                            path.join(parsedEnv.OUTPUT_DIRECTORY, 'archive.txt'),
                            infojsonData.extractor_key.toLowerCase() + ' ' + infojsonData.id + (process.platform === 'win32' ? '\r\n' : '\n')
                        );
                    }
                    catch (err) {
                        logError('Failed to append to archive.txt');
                        throw err;
                    }
                    addedVideoCount++;
                } catch (err) {
                    await fs.appendFile(importErrorFile, `${infojsonFile}\r\n${err.toString()}\r\n\r\n`);
                    failed++;
                    if (!continueOnFailed) {
                        logError('Stopping importing because of an error');
                        break;
                    }
                }
            }
        }

        logLine(`Imported ${addedVideoCount.toLocaleString()} videos (${alreadyAddedVideoCount.toLocaleString()} already downloaded, ${failed} failed)`);
        if (failed > 0) logLine('Check import_errors.txt');

        importing = false;
    } catch (err) {
        importing = false;
        if (!sentResponse) return res.status(500).json({ error: 'Failed to start import' });
        if (parsedEnv.VERBOSE) logError(err);
    }
});

router.post('/statistics/recalculate', async (req, res) => {
    try {
        let version = await Version.findOne({ accessKey: 'version' });
        if (!version) version = await new Version().save();

        const cancel = req.query?.cancel === 'true';

        version.recalculateOnRestart = !cancel;

        await version.save();

        return res.json({ success: cancel ? 'Canceled' : 'Statistics will be recalculated the next time the web app is restarted. During that time the web app will not be accessible' });
    } catch (err) {
        if (parsedEnv.VERBOSE) logError(err);
        return res.sendStatus(500);
    }
});

const isBusy = (check = ['updating', 'retrying', 'deleting', 'downloading', 'importing', 'verifying'], jobId = null) => {
    // Ordered by shortest expected operation
    if (updating && check.includes('updating')) return [true, 'updating youtube-dl'];
    if (errorManager.isBusy() && check.includes('retrying')) return [true, 'retrying import'];
    if (deleting && check.includes('deleting')) return [true, 'deleting videos'];
    if (downloader.isBusy(jobId) && check.includes('downloading')) return [true, 'downloading videos'];
    if (importing && check.includes('importing')) return [true, 'importing videos'];
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
            shasum.update(data);
        }).on('end', () => {
            resolve(shasum.digest('hex'));
        }).on('error', (err) => {
            reject(err);
        });
    });
}

const walk = async (folder, depth = 0) => {
    if (depth > 1000) return;
    let files = await fs.readdir(folder, { withFileTypes: true });
    let originalLength = files.length;
    for (let i = 0; i < originalLength; i++) {
        files[i].path = folder;
        files[i].depth = depth;
        if (files[i].isDirectory()) {
            let moreFiles = await walk(path.join(folder, files[i].name), depth + 1);
            if (moreFiles) files = files.concat(moreFiles);
        }
    }
    return files;
}

export default router;
