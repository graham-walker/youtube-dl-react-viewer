import { parsedEnv } from '../parse-env.js';
import path from 'path';
import fs from 'fs-extra';
import colors from '@colors/colors';

const logFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'console_output.txt');
fs.removeSync(logFile);

let history = [];
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
        msg = `(${new Date().toISOString()}) Error: Unknown error`;
    }

    pushHistory(msg, 'danger');
    writeLine(msg);
    console.error(msg.red);
}

const logStdout = (data, progress = false) => {
    try {
        if (
            !progress
            && data.toString().trim().startsWith('[download]') && data.toString().trim().charAt(16) === '%'
        ) { progress = true; }
    } catch (err) { }

    pushHistory(data.toString(), 'secondary', progress, true);
    if (!progress) writeLine(data.toString(), true);
    try {
        process.stdout.write(data.toString().gray);
    } catch (err) {
        console.log(data.toString().gray);
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
}

const writeLine = (msg, stdout = false) => {
    fs.appendFileSync(logFile, stdout ? msg : msg + '\r\n');
}

export { logLine, logWarn, logInfo, logError, logStdout, history };
