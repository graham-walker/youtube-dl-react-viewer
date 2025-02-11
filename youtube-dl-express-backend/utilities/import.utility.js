import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

import { parsedEnv } from '../parse-env.js';
import { logError, logWarn, logLine, logStdout } from './logger.utility.js';
import Video from '../models/video.model.js';

export default class Importer {
    constructor() {
        this.importing = false;
        this.process;
        this.stream;
        this.stopping = false;
    }

    async import(folder, job, subfolders, isCopy, continueOnFailed, overrideExt) {
        if (!this.importing) {
            this.importing = true;

            logLine(`Importing videos from: ${folder}`);

            Promise.resolve().then(async () => {
                const importErrorFile = path.join(parsedEnv.OUTPUT_DIRECTORY, 'import_errors.txt');
                await fs.remove(importErrorFile); // Delete the error file from the last import

                let files = await this.walk(folder, subfolders ? 0 : 1000);

                let addedVideoCount = 0;
                let alreadyAddedVideoCount = 0;
                let failed = 0;

                videos_loop: for (let i = 0; i < files.length; i++) {
                    if (files[i].isFile() && files[i].name.endsWith('.info.json')) {
                        const infojsonFile = path.join(files[i].path, files[i].name);
                        logLine(`Found video metadata file: ${infojsonFile}`);

                        try {
                            // Parse the video metadata file
                            let infojsonData;
                            try {
                                infojsonData = JSON.parse(fs.readFileSync(infojsonFile, 'utf8'));
                            } catch (err) {
                                logError('Unable to parse metadata');
                                throw err;
                            }

                            // Check metadata for required properties
                            let requiredProperties = ['id', 'extractor', 'title', 'extractor_key'];
                            if (!overrideExt) requiredProperties.push('ext');

                            for (let i = 0; i < requiredProperties.length; i++) {
                                if (!infojsonData.hasOwnProperty(requiredProperties[i])) {
                                    const err = `Metadata missing required property: ${requiredProperties[i]}`;
                                    logError(err);
                                    throw new Error(err);
                                }
                            }

                            // Make sure video isn't duplicate
                            if (await Video.countDocuments({ id: infojsonData.id, extractor: infojsonData.extractor }) > 0) {
                                alreadyAddedVideoCount++;
                                logWarn('Already downloaded video will be skipped');
                                continue;
                            }

                            const basename = files[i].name.slice(0, -'.info.json'.length);
                            const videoFileName = basename + '.' + (overrideExt ? overrideExt : infojsonData.ext);

                            // Get the downloaded date
                            let downloaded;
                            try {
                                downloaded = (await fs.stat(path.join(files[i].path, videoFileName))).birthtime.getTime(); // Should default to ctime on OSs that do not support birthtime
                            } catch (err) {
                                logError('Unable to get downloaded date from file');
                                throw err;
                            }

                            // Get all files related to the video file
                            let relatedFiles = files.filter(file =>
                                file.isFile()
                                && file.name.startsWith(basename) // Possible conflict if all videos are in the same folder and the basename starts the same as a different video
                                && file.path === files[i].path
                            );

                            // Create the new directory
                            const outputPath = path.join(
                                parsedEnv.OUTPUT_DIRECTORY,
                                'videos',
                                infojsonData.extractor.toString(),
                                infojsonData.id.toString(),
                                Math.floor(new Date().getTime() / 1000).toString()
                            );
                            await fs.ensureDir(outputPath);

                            // Move/copy files
                            if (!this.importing) break videos_loop;
                            for (let i = 0; i < relatedFiles.length; i++) {
                                let inputFile = path.join(relatedFiles[i].path, relatedFiles[i].name);
                                logLine(`${isCopy ? 'Copying' : 'Moving'} file: ${inputFile}`)
                                try {
                                    let outputFile = path.join(outputPath, relatedFiles[i].name);
                                    await this.importFile(inputFile, outputFile, !isCopy);
                                    this.stream = null;
                                } catch (err) {
                                    console.error(err)
                                    if (this.importing) {
                                        logError(`Failed to ${isCopy ? 'copy' : 'move'} file`);
                                        throw err;
                                    }
                                }
                                if (!this.importing) break videos_loop;
                            }

                            logLine('Adding video to the database');
                            // On non-Windows platforms npm incorrectly escapes the "$" character which can appear in the filename so node is used here instead
                            let execArguments = [
                                '--job-id',
                                job._id,
                                '--downloaded',
                                downloaded,
                                '--is-import',
                                '--video',
                                `"${path.join(outputPath, videoFileName)}"`,
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
                            if (!this.importing) break videos_loop;
                            this.process = spawn(process.platform === 'win32' ? 'npm.cmd' : 'node', execArguments, { windowsHide: true, shell: true });
                            this.process.stdout.on('data', (data) => logStdout(data));
                            this.process.stderr.on('data', (data) => logStdout(data));
                            const exitCode = await new Promise((resolve, reject) => this.process.on('close', resolve));
                            this.process = null;
                            if (!this.importing) break videos_loop;

                            if (exitCode !== 0) {
                                let err = `Exec exited with status code ${exitCode}`;
                                logError(err);
                                throw new Error(err);
                            }

                            try {
                                await fs.appendFile(
                                    path.join(parsedEnv.OUTPUT_DIRECTORY, 'archive.txt'),
                                    infojsonData.extractor_key.toLowerCase() + ' ' + infojsonData.id + (process.platform === 'win32' ? '\r\n' : '\n')
                                );
                            }
                            catch (err) {
                                logError('Failed to append to archive.txt');
                                throw err;
                            }
                            addedVideoCount++;
                            if (!this.importing) break videos_loop;
                        } catch (err) {
                            await fs.appendFile(importErrorFile, `${infojsonFile}\r\n${err.toString()}\r\n\r\n`);
                            failed++;
                            if (!continueOnFailed) {
                                logError('Stopping importing because of an error');
                                break videos_loop;
                            }
                        }
                    }
                }

                if (!this.importing) logLine(`Stopped import early`);

                logLine(`Imported ${addedVideoCount.toLocaleString()} videos (${alreadyAddedVideoCount.toLocaleString()} already downloaded, ${failed} failed)`);
                if (failed > 0) logLine('Check import_errors.txt');
                this.importing = false;
            });

            return 'started';
        } else {
            return 'not-started';
        }
    }

    async walk(folder, depth = 0) {
        if (depth > 1000) return;
        let files = await fs.readdir(folder, { withFileTypes: true });
        let originalLength = files.length;
        for (let i = 0; i < originalLength; i++) {
            files[i].path = folder;
            files[i].depth = depth;
            if (files[i].isDirectory()) {
                let moreFiles = await this.walk(path.join(folder, files[i].name), depth + 1);
                if (moreFiles) files = files.concat(moreFiles);
            }
        }
        return files;
    }

    async importFile(src, dest, isMove = true) {
        return new Promise(async (resolve, reject) => {
            try {
                // Move the file
                try {
                    if (isMove) {
                        await fs.rename(src, dest);
                        return resolve();
                    }
                } catch (err) {
                    if (err.code !== 'EXDEV') throw err; // Fall back to copying
                }

                // Copy the file
                const readStream = fs.createReadStream(src);
                const writeStream = fs.createWriteStream(dest);

                this.stream = { readStream, writeStream };

                readStream.pipe(writeStream);

                writeStream.on('finish', () => {
                    if (isMove) {
                        fs.unlinkSync(src);
                    }
                    resolve();
                });

                readStream.on('error', (err) => reject(err));
                writeStream.on('error', (err) => reject(err));

            } catch (error) {
                reject(error);
            }
        });
    }

    async stop() {
        if (this.importing && !this.stopping) {
            if (this.process) {
                if (process.platform === 'win32') {
                    this.stopping = true;
                    const taskkillProcess = spawnSync('taskkill', ['/pid', this.process.pid, '/f', '/t'], { windowsHide: true });
                    if (taskkillProcess.status === 0) {
                        this.importing = false;
                        this.stopping = false;
                        return 'stopped';
                    } else {
                        this.stopping = false;
                        return 'failed';
                    }
                } else {
                    this.process.kill('SIGKILL');
                    this.process = null;
                    this.importing = false;
                    return 'stopped';
                }
            } else if (this.stream) {
                this.stopping = true;
                this.importing = false;

                const { readStream, writeStream } = this.stream;
                readStream.destroy();
                writeStream.destroy();
                this.stream = null;

                this.stopping = false;
                return 'stopped';
            } else {
                this.importing = false;
                return 'stopped';
            }
        } else {
            return 'none';
        }
    }

    isBusy() {
        return this.importing;
    }
}
