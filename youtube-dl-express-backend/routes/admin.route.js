import express from 'express';
import path from 'path';
import fs from 'fs-extra';

import Job from '../models/job.model.js';
import DownloadError from '../models/error.model.js';

import Downloader from '../utilities/job.utility.js';
import { spawnSync } from 'child_process';

const router = express.Router();

const downloader = new Downloader();

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
    if (downloader.isDownloading(req.params.jobId)) {
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
                return res.json({ error: 'All jobs downloading or queued' });
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
    if (downloader.isDownloading()) return res.status(500).json(
        { error: 'Cannot attempt to repair error while a job is downloading' }
    );

    let error;
    try {
        error = await DownloadError.findOne({ _id: req.params.errorId });
    } catch (err) {
        return res.status(500).json({ error: 'Could not find error document' });
    }

    const execProcess = await spawnSync(`npm${process.platform === 'win32' ? '.cmd' : ''}`, [
        'run',
        'exec',
        '--',
        '--job-id',
        error.jobDocument,
        '--is-repair',
        '--error-id',
        error._id,
        '--video',
        path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', error.videoPath),
    ], { windowsHide: true });

    if (execProcess.status !== 0) return res.status(500).json(
        {
            error: `Exec failed to repair the download with status code: ${execProcess.status}.`
                + ` Refresh the page to see the updated error.`
        }
    );

    try {
        await DownloadError.findByIdAndDelete(error._id);
    } catch (err) {
        return res.sendStatus(500);
    }

    res.json({ success: 'Video repaired' });
});

export default router;
