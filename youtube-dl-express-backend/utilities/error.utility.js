import { spawn } from 'child_process';
import path from 'path';

import { parsedEnv } from '../parse-env.js';
import DownloadError from '../models/error.model.js';
import { logStdout } from './logger.utility.js';

export default class ErrorManager {
    constructor() {
        this.busy = false;
    }

    async repair(errorId) {
        this.busy = true;
        let error;
        try {
            error = await DownloadError.findOne({ _id: errorId });
        } catch (err) {
            this.busy = false;
            return { error: 'Error not found' };
        }
        if (!error) {
            this.busy = false;
            return { error: 'Error not found' };
        }

        // On non-Windows platforms npm does not escape the $ character which can sometimes be in the filename so node is used instead
        let execArguments = [
            '--job-id',
            error.jobDocument,
            '--is-repair',
            '--error-id',
            error._id,
            '--video',
            path.join(parsedEnv.OUTPUT_DIRECTORY, 'videos', error.videoPath),
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
            this.busy = false;
            return {
                error: `Video import failed. Refresh the page to see the updated error`,
            };
        }

        try {
            await DownloadError.findByIdAndDelete(error._id);
        } catch (err) {
            this.busy = false;
            throw err;
        }

        this.busy = false;
        return { success: 'Video imported successfully' };
    }

    isBusy() {
        return this.busy;
    }
}
