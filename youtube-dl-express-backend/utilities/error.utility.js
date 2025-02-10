import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

import { parsedEnv } from '../parse-env.js';
import DownloadError from '../models/error.model.js';
import { logError, logLine, logStdout } from './logger.utility.js';

export default class ErrorManager {
    constructor() {
        this.repairing = false;
        this.queued = [];
        this.process;
        this.stopping = false;
    }

    async queue(resolveBy, errorIds) {
        if (!errorIds) {
            const errors = await DownloadError.find({}, '_id').lean().exec();
            errorIds = errors.map(error => error._id);
        }

        const errorList = errorIds.map(errorId => ({ errorId, resolveBy }));

        const length = this.queued.length;
        this.queued = this.queued.concat(errorList);
        this.queued = Array.from(new Set(this.queued));
        return this.queued.length - length;
    }

    async repair(chained = false) {
        if (this.queued.length === 0) return 'nothing-to-do';
        if (!this.repairing || chained) {
            this.repairing = true;

            const method = this.queued[0].resolveBy;

            // Get the next error in the queue
            let error;
            try {
                error = await DownloadError.findOne({ _id: this.queued[0].errorId });
            } catch (err) {
                this.stop();
                return 'failed';
            }
            if (!error) {
                this.stop();
                return 'failed';
            }

            // On non-Windows platforms npm does not escape the $ character which can sometimes be in the filename so node is used instead
            let execArguments = [
                '--job-id',
                error.jobDocument,
                '--is-repair',
                '--error-id',
                error._id,
                '--video',
                `"${path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', error.videoPath)}"`,
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

            switch (method) {
                case 'retry': {
                    logLine('Repairing error ' + error._id);
                    this.process = spawn(process.platform === 'win32' ? 'npm.cmd' : 'node', execArguments, { windowsHide: true, shell: true });
                    this.process.stdout.on('data', (data) => logStdout(data));
                    this.process.stderr.on('data', (data) => logStdout(data));
                    this.process.on('close', async (exitCode) => {
                        this.process = null;
                        if (exitCode === 0) {
                            try {
                                await DownloadError.findByIdAndDelete(error._id);
                                logLine(`Repaired error ${error._id}`);
                            } catch (err) {
                                logError(err);
                                logLine(`Failed to repair error ${error._id}`);
                            }
                        } else {
                            logLine(`Failed to repair error ${error._id}`);
                        }

                        this.next();
                    });
                } break;
                case 'delete': {
                    logLine('Deleting error ' + error._id);
                    try {
                        const videoDir = path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', path.dirname(error.videoPath));

                        const metadata = JSON.parse((await fs.readFile(path.join(videoDir, (await fs.readdir(videoDir)).find(dir => dir.endsWith('.info.json'))))));

                        if (!metadata.extractor || !metadata.id) throw new Error('Could not determine extractor and id');

                        const archiveFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'archive.txt');
                        let archived = (await fs.readFile(archiveFile)).toString().replaceAll('\r\n', '\n').split('\n');
                        archived = archived.filter(video => video !== `${metadata.extractor} ${metadata.id}`);
                        await fs.writeFile(archiveFile, archived.join('\r\n'));

                        let files = await fs.readdir(videoDir, { withFileTypes: true });
                        for (let file of files) {
                            if (file.isFile()) await fs.unlink(path.join(videoDir, file.name));
                        }

                        await DownloadError.findByIdAndDelete(error._id);

                        logLine('Deleted error ' + error._id);
                    } catch (err) {
                        logError(err);
                        logLine('Failed to delete error ' + error._id);
                    }

                    this.next();
                } break;
                default:
            }

            return 'started';
        } else {
            return 'not-started';
        }
    }

    next() {
        this.queued.shift();
        if (this.queued.length > 0) {
            this.repair(true);
        } else {
            this.repairing = false;
        }
    }

    async stop() {
        if (this.repairing && !this.stopping) {
            if (this.process) {
                if (process.platform === 'win32') {
                    this.stopping = true;
                    const taskkillProcess = spawnSync('taskkill', ['/pid', this.process.pid, '/f', '/t'], { windowsHide: true });
                    if (taskkillProcess.status === 0) {
                        this.repairing = false;
                        this.queued = [];
                        this.stopping = false;
                        return 'stopped';
                    } else {
                        this.stopping = false;
                        return 'failed';
                    }
                } else {
                    this.process.kill('SIGKILL');
                    this.repairing = false;
                    this.queued = [];
                    return 'stopped';
                }
            } else {
                this.repairing = false;
                this.queued = [];
                return 'stopped';
            }
        } else {
            return 'none';
        }
    }

    isBusy() {
        return this.repairing;
    }
}
