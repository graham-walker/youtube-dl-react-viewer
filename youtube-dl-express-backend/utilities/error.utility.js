import { spawnSync } from 'child_process';
import path from 'path';

import DownloadError from '../models/error.model.js';

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
            return { error: 'Could not find error document' };
        }

        // On non-Windows platforms npm incorrectly escapes the "$" character which can appear in the filename, so node is used here instead
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
        const execProcess = await spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'node', execArguments, { windowsHide: true });

        if (execProcess.status !== 0) {
            this.busy = false;
            return {
                error: `Exec failed to repair the download with status`
                    + ` code: ${execProcess.status}. Refresh the page to see the updated error.`
            };
        }

        try {
            await DownloadError.findByIdAndDelete(error._id);
        } catch (err) {
            this.busy = false;
            throw err;
        }

        this.busy = false;
        return { success: 'Video repaired' };
    }

    isBusy() {
        return this.busy;
    }
}
