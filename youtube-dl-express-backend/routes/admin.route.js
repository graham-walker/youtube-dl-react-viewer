import express from 'express';
import os from 'os';
import { spawnSync } from 'child_process';

import Job from '../models/job.model.js';
import DownloadError from '../models/error.model.js';

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

export default router;
