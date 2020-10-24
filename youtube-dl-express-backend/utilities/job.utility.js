import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

import Job from '../models/job.model.js';

export default class Downloader {
    constructor() {
        this.downloading = false;
        this.queued = [];
        this.currentJob = undefined;
        this.process;
    }

    queue(jobList) {
        const length = this.queued.length;
        this.queued = this.queued.concat(jobList);
        this.queued = Array.from(new Set(this.queued));
        return this.queued.length - length;
    }

    async download(chained = false) {
        // if not downloading or chaining
        if (!this.downloading || chained) {
            this.downloading = true;

            let job;
            try {
                job = await Job.findOne({ _id: this.queued[0] });
            } catch (err) {
                this.stop();
                return 'failed';
            }
            if (!job) {
                this.stop();
                return 'failed';
            }

            // get arguments
            let parsedArguments;
            let parsedUrls;
            let youtubeDlVersion;
            try {
                parsedArguments = parseArguments(job.arguments);
                parsedUrls = parseUrls(job.urls);
                youtubeDlVersion = await getYoutubeDlVersion();
            } catch (err) {
                this.stop();
                return 'failed';
            }

            fs.ensureDirSync(process.env.OUTPUT_DIRECTORY);

            let jobArguments = [
                '--exec',
                `npm run exec -- --youtube-dl-version ${youtubeDlVersion} --job-id ${job._id}${process.env.VERBOSE.toLowerCase() === 'true' ? ' --debug' : ''} --video`,
                '--write-info-json',
                '--prefer-ffmpeg',
                '--output',
                `${process.env.OUTPUT_DIRECTORY}/videos/%(extractor)s/%(id)s/%(title)s - %(uploader)s - %(upload_date)s.%(ext)s`,
                '--format',
                job.formatCode,
                '--download-archive',
                path.join(process.env.OUTPUT_DIRECTORY, 'archive.txt'),
            ];
            if (process.env.VERBOSE.toLowerCase() === 'true') jobArguments.push('--verbose');
            if (process.platform === 'win32') jobArguments.push('--ffmpeg-location', process.env.FFMPEG_PATH);
            if (job.isAudioOnly) jobArguments.push('--extract-audio');
            jobArguments = parsedArguments.concat(jobArguments);
            jobArguments = jobArguments.concat(parsedUrls);

            // start process
            this.process = downloadVideos(jobArguments);

            console.log('Downloading job ' + job.name);
            this.process.on('close', async (code) => {
                job.lastCompleted = new Date();
                await job.save();
                console.log();
                console.log(`youtube-dl exited with code ${code}`);
                console.log(`Job ${job.name} finished`);

                this.queued.shift();
                if (this.queued.length > 0) {
                    this.download(true);
                } else {
                    this.downloading = false;
                }
            });
            return 'started';
        } else {
            return 'not-started';
        }
    }

    stop() {
        if (this.downloading) {
            this.downloading = false;
            this.queued = [];
            if (this.process) this.process.kill();
            return 'stopped';
        } else {
            return 'none';
        }
    }

    isDownloading(jobId) {
        return this.downloading && this.queued[0] === jobId;
    }
}

const parseArguments = (text) => {
    let parsedArguments = text.split(/\r?\n/)
        .filter(argument => (!argument.startsWith('#') && !argument.startsWith(';') && !argument.startsWith(']')))
        .map(line => tokenizeArgString(line))
        .filter(argument => argument.length != 0);

    return [].concat.apply([], parsedArguments).map(args => args.replace(/['"]+/g, '')).filter(i => i != "");
}

const tokenizeArgString = (argString) => {
    if (Array.isArray(argString)) {
        return argString.map(e => typeof e !== 'string' ? e + '' : e);
    }
    argString = argString.trim();
    let i = 0;
    let prevC = null;
    let c = null;
    let opening = null;
    const args = [];
    for (let ii = 0; ii < argString.length; ii++) {
        prevC = c;
        c = argString.charAt(ii);
        // split on spaces unless we're in quotes.
        if (c === ' ' && !opening) {
            if (!(prevC === ' ')) {
                i++;
            }
            continue;
        }
        // don't split the string if we're in matching
        // opening or closing single and double quotes.
        if (c === opening) {
            opening = null;
        }
        else if ((c === "'" || c === '"') && !opening) {
            opening = c;
        }
        if (!args[i])
            args[i] = '';
        args[i] += c;
    }
    return args;
}

const parseUrls = (text) => {
    return text.split(/\r?\n/)
        .filter(
            (argument) =>
                !argument.startsWith('#') &&
                !argument.startsWith(';') &&
                !argument.startsWith(']')
        )
        .filter((i) => i != '');
}

const getYoutubeDlVersion = async () => {
    const versionProcess = await spawnSync(process.env.YOUTUBE_DL_PATH, ['--version'], { windowsHide: true });
    if (versionProcess.status === 0) {
        return versionProcess.stdout.toString().trim();
    } else {
        throw new Error('Failed to get youtube-dl version');
    }
}

const downloadVideos = (jobArguments) => {
    const youtubeDlProcess = spawn(process.env.YOUTUBE_DL_PATH, jobArguments, { windowsHide: true });

    youtubeDlProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    youtubeDlProcess.stderr.on('data', (data) => {
        process.stdout.write(data);
    });

    return youtubeDlProcess;
}
