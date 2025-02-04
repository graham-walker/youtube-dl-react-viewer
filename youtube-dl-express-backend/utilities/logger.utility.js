import { parsedEnv } from '../parse-env.js';
import path from 'path';
import fs from 'fs-extra';
import colors from '@colors/colors';

const logFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'console_output.txt');
fs.removeSync(logFile);

let history = [];
let historyUpdated = new Date().getTime();
const historyLimit = 1000;

const logLine = (msg) => {
    msg = `(${new Date().toISOString()}) ${msg}`;
    pushHistory(msg, 'log');
    writeLine(msg);
    console.log(msg);
}

const logWarn = (msg) => {
    msg = `(${new Date().toISOString()}) Warning: ${msg}`;
    pushHistory(msg, 'warning');
    writeLine(msg);
    console.warn(msg.yellow);
}

const logInfo = (msg) => {
    msg = `(${new Date().toISOString()}) Info: ${msg}`;
    pushHistory(msg, 'info');
    writeLine(msg);
    console.log(msg.cyan);
}

const logError = (msg) => {
    try {
        if (typeof msg === 'object' && msg.hasOwnProperty('stack')) {
            msg = `(${new Date().toISOString()}) Error:\r\n${msg.stack}`;
        } else {
            msg = `(${new Date().toISOString()}) Error: ${msg.toString()}`;
        }
    } catch (err) {
        msg = `(${new Date().toISOString()}) Error: Failed to print error`;
    }

    pushHistory(msg, 'danger');
    writeLine(msg);
    console.error(msg.red);
}

const logStdout = (data, progress = false) => {
    try {
        let msg = data.toString();
        let progressComplete = false;

        if (
            !progress
            && (
                msg.trim().startsWith('[download]') && msg.trim().charAt(16) === '%'
                || msg.trim().startsWith('[download] 100%')
            )
        ) { progress = true; }

        if (progress
            && (
                msg.trim().startsWith('[download] 100%') // Final progress for yt-dlp downloads is '[download] 100%' without decimal
                || msg.trim().endsWith('100.00%') // Final progress for database upgrade ends with '100.00%'
            )
        ) { progressComplete = true; }

        if (progressComplete) msg += '\r\n';

        pushHistory(msg, 'secondary', progress, true);
        if (!progress || progressComplete) writeLine(msg, true);

        try {
            process.stdout.write(msg.gray);
        } catch (err) {
            console.log(msg.gray);
        }
    } catch (err) {
        console.log('Failed to print stdout'.gray);
    }
}

const pushHistory = (msg, level = 'log', progress = false, stdout = false) => {
    if (history.length > 0 && history[history.length - 1].progress && progress) history.pop();
    history.push({
        msg: stdout ? msg : msg + '\r\n',
        level,
        progress,
    });
    if (history.length > historyLimit) history.splice(0, 1);
    historyUpdated = new Date().getTime();
}

const writeLine = (msg, stdout = false) => {
    fs.appendFileSync(logFile, stdout ? msg : msg + '\r\n');
}

export { logLine, logWarn, logInfo, logError, logStdout, history, historyUpdated };
