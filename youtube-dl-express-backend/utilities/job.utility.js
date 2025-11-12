import { spawn, spawnSync, execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

import Job from '../models/job.model.js';
import { parsedEnv } from '../parse-env.js';
import { logLine, logStdout, logError } from './logger.utility.js';

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

            // Update yt-dlp
            let updated = false;
            if (parsedEnv.UPDATE_YOUTUBE_DL_ON_JOB_START && !chained) {
                let message = updateYoutubeDl();
                if (message.success) updated = true;
                if (message.error) {
                    logError(message.error);
                    this.stop();
                    return 'failed';
                }
            }

            // Get the next job in the queue
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
                youtubeDlVersion = getYoutubeDlVersion(true);
            } catch (err) {
                logError(err);
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
                '--output',
                `${parsedEnv.OUTPUT_DIRECTORY}/videos/%(extractor)s/%(id)s/${Math.floor(new Date().getTime() / 1000)}/%(title)s - %(uploader)s - %(upload_date)s.%(ext)s`, // %(epoch)s
                '--format',
                job.formatCode,
                '--download-archive',
                path.join(parsedEnv.OUTPUT_DIRECTORY, 'archive.txt'),
                '--cache-dir',
                path.join(parsedEnv.OUTPUT_DIRECTORY, '.cache'),
                '--js-runtimes', 'node',
            ];
            if (parsedEnv.VERBOSE) jobArguments.push('--verbose');
            if (parsedEnv.FFMPEG_PATH !== 'ffmpeg') jobArguments.push('--ffmpeg-location', parsedEnv.FFMPEG_PATH);
            if (job.isAudioOnly) jobArguments.push('--extract-audio');
            if (job.downloadComments) jobArguments.push('--write-comments');
            if (!job.isAudioOnly && job.recodeVideo) jobArguments.push('--recode-video', 'mp4');
            jobArguments = parsedArguments.concat(jobArguments);
            jobArguments = jobArguments.concat(parsedUrls);

            // start process
            this.process = downloadVideos(jobArguments);

            logLine('Downloading job ' + job.name);
            this.process.on('close', async (code) => {
                job.lastCompleted = new Date();
                await job.save();
                logLine(`yt-dlp exited with code ${code} (${code === 0 ? 'success' : 'failure'})`);
                logLine(`Finished downloading job ${job.name}`);

                this.queued.shift();
                if (this.queued.length > 0) {
                    this.download(true);
                } else {
                    this.downloading = false;
                }
            });

            if (updated) return 'updated-started';
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
        .filter(argument => (!argument.trimStart().startsWith('#') && !argument.trimStart().startsWith(';') && !argument.trimStart().startsWith(']')))
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

export const getYoutubeDlVersion = (throwError = false) => {
    const versionProcess = spawnSync(parsedEnv.YOUTUBE_DL_PATH, ['--version'], { windowsHide: true });
    if (versionProcess.status === 0) {
        return versionProcess.stdout.toString().trim();
    } else {
        let message = 'failed to get version';
        if (versionProcess?.error?.code === 'ENOENT') message = 'not installed';
        if (throwError) {
            throw new Error(message);
        } else {
            return message;
        }
    }
}

const downloadVideos = (jobArguments) => {
    const youtubeDlProcess = spawn(parsedEnv.YOUTUBE_DL_PATH, jobArguments, { windowsHide: true });

    youtubeDlProcess.stdout.on('data', (data) => {
        logStdout(data);
    });

    youtubeDlProcess.stderr.on('data', (data) => {
        logStdout(data);
    });

    return youtubeDlProcess;
}

export const updateYoutubeDl = () => {
    logLine('Checking for updates to yt-dlp');

    const successMessage = { success: 'Updated to the latest version' };
    const errorMessage = { error: `Update failed, check the console for details` };

    if (parsedEnv.YOUTUBE_DL_UPDATE_COMMAND) {
        try {
            let output = execSync(parsedEnv.YOUTUBE_DL_UPDATE_COMMAND);
            logStdout(output);
            return successMessage;
        } catch (err) {
            logError(err.toString());
            return errorMessage;
        }
    } else {
        let result = spawnSync(parsedEnv.YOUTUBE_DL_PATH, ['-U'], { encoding: 'utf-8' });
        if (result.error) {
            logError(result.error.toString());
            return errorMessage;
        }

        logStdout(result.stdout);
        logStdout(result.stderr);

        if (result.status === 0) {
            return successMessage;
        } else {
            return errorMessage;
        }
    }
}
