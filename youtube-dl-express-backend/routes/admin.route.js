import express from 'express';
import path from 'path';
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

    res.json({ jobs, errors });
});

router.post('/jobs/save/new', async (req, res) => {
    let job;
    try {
        job = new Job({
            name: req.body.name,
            formatCode: req.body.formatCode,
            isAudioOnly: req.body.isAudioOnly,
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
        return res.status(500).json({ error: 'Cannot save job while downloading' });
    }

    let job;
    try {
        job = await Job.findOne({ _id: req.params.jobId });
        job.name = req.body.name;
        job.formatCode = req.body.formatCode;
        job.isAudioOnly = req.body.isAudioOnly;
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
        { error: 'Cannot start download while repairing an error' }
    );
    if (updating) return res.status(500).json(
        { error: 'Cannot start download while a checking youtube-dl for updates' }
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
                return res.json({ success: `Queued ${jobsAdded} jobs` });
            } else {
                return res.json({ error: 'All jobs already downloading or queued' });
            }
        case 'started':
            return res.json({ success: `Job started${jobsAdded > 1 ? `. Queued ${jobsAdded - 1} jobs` : ''}` });
        case 'failed':
            return res.status(500).json({ error: 'Failed to start job' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/jobs/stop', async (req, res) => {
    switch (await downloader.stop()) {
        case 'stopped':
            return res.json({ success: 'All jobs stopped' });
        case 'failed':
            return res.json({ error: 'Failed to stop jobs' });
        case 'none':
            return res.json({ error: 'No jobs are running to stop' });
        default:
            return res.sendStatus(500);
    }
});

router.post('/errors/repair/:errorId', async (req, res) => {
    if (downloader.isBusy()) return res.status(500).json(
        { error: 'Cannot attempt to repair error while a job is downloading' }
    );
    if (errorManager.isBusy()) return res.status(500).json(
        { error: 'Already attempting to repair an error' }
    );
    if (updating) return res.status(500).json(
        { error: 'Cannot attempt to repair error while a checking youtube-dl for updates' }
    );

    try {
        let result = await errorManager.repair(req.params.errorId);
        res.json(result);
    } catch (err) {
        res.sendStatus(500);
    }
});

router.post('/youtube-dl/update', async (req, res) => {
    if (downloader.isBusy()) return res.status(500).json(
        { error: 'Cannot check for updates to youtube-dl while a job is downloading' }
    );
    if (errorManager.isBusy()) return res.status(500).json(
        { error: 'Cannot check for updates to youtube-dl while repairing an error' }
    );
    if (updating) return res.status(500).json(
        { error: 'Already checking youtube-dl for updates' }
    );

    updating = true;
    try {
        let updateProcess = spawnSync('youtube-dl', ['-U'], { encoding: 'utf-8' });
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
