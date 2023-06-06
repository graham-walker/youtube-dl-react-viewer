import fs from 'fs-extra';
import commander from 'commander';
import path from 'path';
import mongoose from 'mongoose';
import { spawnSync } from 'child_process';

import Video from './models/video.model.js';
import Job from './models/job.model.js';

import parsed from './parse-env.js';

const program = commander.program;

(async () => {
    if (parsed.err) throw parsed.err;

    program.name('youtube-dl-import-script')
        .version(process.env.npm_package_version)
        .requiredOption(
            '-f --folder <folder>',
            'Folder to search for videos'
        )
        .requiredOption(
            '-j --job-name <name>',
            'Name of the job to assign imported videos to'
        )
        .option('-r, --recursive', 'Search subfolder for videos recursively', false)
        .option('-c, --copy', 'Copy downloaded files instead of moving them', false)
        .option('--override-ext <ext>', 'Specify the video extension instead of obtaining it from the metadata file', undefined);
    program.parse(process.argv);

    if (program.overrideExt && program.overrideExt.startsWith('.')) program.overrideExt = program.overrideExt.slice(1);

    // Delete the error file from the last run
    const importErrorFile = path.join(parsed.env.OUTPUT_DIRECTORY, 'import_errors.json');
    try {
        fs.unlinkSync(importErrorFile);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Failed to delete previous error file');
            throw err;
        }
    }

    // Connect to the database
    console.log(`Connecting to database with URL: ${process.env.MONGOOSE_URL}...`);
    try {
        await mongoose.connect(process.env.MONGOOSE_URL, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
        });
    } catch (err) {
        console.error('Failed to connect to the database');
        throw err;
    }
    console.log('Connected');

    // Get the job from the job name
    let job;
    try {
        job = await Job.findOne({ name: program.jobName });
    } catch (err) {
        throw err;
    }
    if (!job) throw new Error(`Download job with name: "${program.jobName}" does not exist. Sign into the admin panel of the web app and create it first`);

    console.log(`Searching folder: "${program.folder}" for downloaded videos...`);
    let files;
    try {
        files = await walk(program.folder, program.recursive ? 0 : 1000);
    } catch (err) {
        console.error('Failed to get a list of files from the specified folder');
        throw err;
    }

    let addedVideoCount = 0;
    let alreadyAddedVideoCount = 0;
    let errors = {};

    filesLoop:
    for (let i = 0; i < files.length; i++) {
        if (files[i].isFile() && files[i].name.endsWith('.info.json')) {

            // Parse the video metadata file
            const infojsonFile = path.join(files[i].path, files[i].name);
            console.log(`Found video metadata file: "${infojsonFile}"`);

            let infojsonData;
            try {
                infojsonData = JSON.parse(fs.readFileSync(infojsonFile, 'utf8'));
            } catch (err) {
                console.error('Failed to parse video metadata file');
                errors[infojsonFile] = err;
                continue;
            }

            // Make sure the metadata has the required properties
            let requiredProperties = ['id', 'extractor', 'title', 'extractor_key', 'ext'];
            if (!program.overrideExt) requiredProperties.push('ext');
            for (let i = 0; i < requiredProperties.length; i++) {
                if (!infojsonData.hasOwnProperty(requiredProperties[i])) {
                    const err = 'Video metadata file does not have required property:'
                        + ` ${requiredProperties[i]}`;
                    console.error(err);
                    errors[infojsonFile] = new Error(err);
                    continue;
                }
            }

            // make sure there isn't already indexed the same file
            if (await Video.countDocuments({ id: infojsonData.id, extractor: infojsonData.extractor }) > 0) {
                alreadyAddedVideoCount++;
                console.warn('Video already exists in the database. Skipping...');
                continue;
            }

            const basename = files[i].name.slice(0, -'info.json'.length);

            // Get the date the video file was downloaded
            let downloaded;
            try {
                downloaded = fs.statSync(path.join(files[i].path, basename + (program.overrideExt ? program.overrideExt : infojsonData.ext))).birthtime.getTime();
            } catch (err) {
                errors[infojsonFile] = err;
                console.error('Unable to get downloaded date from video file');
                continue;
            }

            // Identified all files related to the video file
            let relatedFiles = files.filter(file => file.isFile()
                && file.name.startsWith(basename)
                && file.path === files[i].path
            );
            /* 
             * NOTE: If all downloaded files are in a the same folder and there are other
             * videos that share the start of the basename, for example: "my video.mkv" and
             * "my video but with a longer name.mkv" the import script will attempt to add
             * them all as one video. This is because the import script cannot tell the
             * difference between "my video but with a longer name.mkv" and 
             * "my video_thumbnail_1.jpg" when attempting to find all files related to the
             * video.
             */

            // Create the path in the output directory to move files to
            let outputPath = path.join(process.env.OUTPUT_DIRECTORY, 'videos', infojsonData.extractor, infojsonData.id, Math.floor(new Date().getTime() / 1000).toString());
            try {
                fs.ensureDirSync(outputPath);
            } catch (err) {
                console.error('Unable to create video folder');
                errors[infojsonFile] = err;
                continue;
            }

            // Move/copy files into the output folder
            for (let i = 0; i < relatedFiles.length; i++) {
                let inputFile = path.join(relatedFiles[i].path, relatedFiles[i].name);
                console.log(`${program.copy ? 'Copying' : 'Moving'} file: "${inputFile}" to "${outputPath}"`)
                try {
                    let outputFile = path.join(outputPath, relatedFiles[i].name);
                    if (program.copy) {
                        fs.copyFileSync(inputFile, outputFile);
                    } else {
                        fs.moveSync(inputFile, outputFile);
                    }
                } catch (err) {
                    console.error(`Failed to ${program.copy ? 'copy' : 'move'} file`);
                    errors[infojsonFile] = err;
                    continue filesLoop;
                }
            }
            console.log(`Adding video file to database...`);

            // On non-Windows platforms npm incorrectly escapes the "$" character which can appear in the filename, so node is used here instead
            let execArguments = [
                '--job-id',
                job._id,
                '--downloaded',
                downloaded,
                '--is-import',
                '--video',
                path.join(outputPath, basename + (program.overrideExt ? program.overrideExt : infojsonData.ext)),
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
            if (parsed.env.VERBOSE) {
                console.log('Printing exec output:');
                console.log(execProcess.stdout);
            }

            if (execProcess.status !== 0) {
                let err = `Failed to add video to the database (exec returned status code: "${execProcess.status}"). Check the admin panel of the web app for more details`;
                console.error(err);
                errors[infojsonFile] = err;
                continue;
            }

            try {
                fs.appendFileSync(path.join(parsed.env.OUTPUT_DIRECTORY, 'archive.txt'), infojsonData.extractor_key.toLowerCase() + ' ' + infojsonData.id + (process.platform === 'win32' ? '\r\n' : '\n'));
            }
            catch (err) {
                console.error(`Failed to append video extractor and id to: "${path.join(parsed.env.OUTPUT_DIRECTORY, 'archive.txt')}"`);
                errors[infojsonFile] = err;
                continue;
            }
            addedVideoCount++;
        }
    }

    console.log(`Imported ${addedVideoCount.toLocaleString()} videos`);
    if (alreadyAddedVideoCount > 0) console.log(`${alreadyAddedVideoCount.toLocaleString()} videos were found to already exist in the database and skipped`);
    const failedVideoCount = Object.keys(errors).length;
    if (failedVideoCount > 0) console.warn(`Failed to import ${failedVideoCount} videos. See "${importErrorFile}" for more details`)

    try {
        if (failedVideoCount > 0) {
            fs.writeFileSync(importErrorFile, JSON.stringify(errors, null, 4));
        }
    } catch (err) {
        console.error('Failed to write error file');
        throw err;
    }

    process.exit(0);
})().catch(async err => {
    if (parsed.err || parsed.env.VERBOSE) oldError(err);
    process.exit(1);
});

const oldLog = console.log;
console.log = message => {
    oldLog(`[${program.name()}] ${message}`);
}

const oldDebug = console.debug;
console.debug = message => {
    oldDebug(`DEBUG: ${message}`);
}

const oldWarn = console.warn;
console.warn = message => {
    oldWarn(`WARNING: ${message}`);
}

const oldError = console.error;
console.error = message => {
    oldError(`ERROR: ${message}`);
}

const walk = async (folder, depth = 0) => {
    if (depth > 1000) return;
    let files = fs.readdirSync(folder, { withFileTypes: true });
    let originalLength = files.length;
    for (let i = 0; i < originalLength; i++) {
        files[i].path = folder;
        files[i].depth = depth;
        if (files[i].isDirectory()) {
            let moreFiles = await walk(path.join(folder, files[i].name), depth + 1);
            if (moreFiles) files = files.concat(moreFiles);
        }
    }
    return files;
}
