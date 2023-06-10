import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

import Job from '../models/job.model.js';
import { parsedEnv } from '../parse-env.js';

export default class Downloader {
    constructor() {
        this.downloading = false;
        this.queued = [];
        this.currentJob = undefined;
        this.process;
        this.stopping = false;
    }

    queue(jobList) {
        const length = this.queued.length;
        this.queued = this.queued.concat(jobList);
        this.queued = Array.from(new Set(this.queued));
        return this.queued.length - length;
    }

    async download(chained = false) {
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

            fs.ensureDirSync(parsedEnv.OUTPUT_DIRECTORY);

            let execCommand = `npm run exec -- --youtube-dl-version ${youtubeDlVersion} --job-id ${job._id} --video`;
            // On non-Windows platforms npm incorrectly escapes the "$" character which can appear in the filename, so node is used here instead
            if (process.platform !== 'win32') execCommand = `node --require dotenv/config exec.js --youtube-dl-version ${youtubeDlVersion} --job-id ${job._id} --video`;

            let jobArguments = [
                '--exec',
                execCommand,
                '--write-info-json',
                '--prefer-ffmpeg',
                '--output',
                `${parsedEnv.OUTPUT_DIRECTORY}/videos/%(extractor)s/%(id)s/${Math.floor(new Date().getTime() / 1000)}/%(title)s - %(uploader)s - %(upload_date)s.%(ext)s`, // %(epoch)s
                '--format',
                job.formatCode,
                '--download-archive',
                path.join(parsedEnv.OUTPUT_DIRECTORY, 'archive.txt'),
                '--cache-dir',
                path.join(parsedEnv.OUTPUT_DIRECTORY, '.cache'),
            ];
            if (parsedEnv.VERBOSE) jobArguments.push('--verbose');
            if (process.platform === 'win32') jobArguments.push('--ffmpeg-location', parsedEnv.FFMPEG_PATH);
            if (job.isAudioOnly) jobArguments.push('--extract-audio');
            if (job.downloadComments) jobArguments.push('--write-comments');
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

    async stop() {
        if (this.downloading && !this.stopping) {
            if (this.process) {
                if (process.platform === 'win32') {
                    this.stopping = true;
                    const taskkillProcess = await spawnSync('taskkill', ['/pid', this.process.pid, '/f', '/t'], { windowsHide: true });
                    if (taskkillProcess.status === 0) {
                        this.downloading = false;
                        this.queued = [];
                        this.stopping = false;
                        return 'stopped';
                    } else {
                        this.stopping = false;
                        return 'failed';
                    }
                } else {
                    this.process.kill('SIGKILL');
                    this.downloading = false;
                    this.queued = [];
                    return 'stopped';
                }
            } else {
                this.downloading = false;
                this.queued = [];
                return 'stopped';
            }
        } else {
            return 'none';
        }
    }

    isBusy(jobId) {
        if (!jobId) return this.downloading;
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
    const versionProcess = await spawnSync(parsedEnv.YOUTUBE_DL_PATH, ['--version'], { windowsHide: true });
    if (versionProcess.status === 0) {
        return versionProcess.stdout.toString().trim();
    } else {
        throw new Error('Failed to get version');
    }
}

const downloadVideos = (jobArguments) => {
    const youtubeDlProcess = spawn(parsedEnv.YOUTUBE_DL_PATH, jobArguments, { windowsHide: true });

    youtubeDlProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    youtubeDlProcess.stderr.on('data', (data) => {
        process.stdout.write(data);
    });

    return youtubeDlProcess;
}
