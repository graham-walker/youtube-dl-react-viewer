import Version from '../models/version.model.js';
import Video from '../models/video.model.js';
import Statistic from '../models/statistic.model.js';
import Uploader from '../models/uploader.model.js';
import Playlist from '../models/playlist.model.js';
import Job from '../models/job.model.js';
import Tag from '../models/tag.model.js';

import { incrementStatistics } from './statistic.utility.js';
import { logLine, logStdout } from './logger.utility.js';
import { detectShort } from './video.utility.js';
import { parsedEnv } from '../parse-env.js';

const ytDlpDeprecatedOptions = [
    '--xattr-set-filesize',
    '--dump-user-agent',
    '--youtube-skip-dash-manifest',
    '--no-youtube-include-dash-manifest',
    '--youtube-skip-hls-manifest',
    '--no-youtube-include-hls-manifest',
    '--youtube-include-dash-manifest',
    '--no-youtube-skip-dash-manifest',
    '--youtube-include-hls-manifest',
    '--no-youtube-skip-hls-manifest',
    '--youtube-print-sig-code',
    '--dump-headers',
    '--dump-intermediate-pages',
    '--sponskrub',
    '--no-sponskrub',
    '--sponskrub-cut',
    '--no-sponskrub-cut',
    '--sponskrub-force',
    '--no-sponskrub-force',
    '--sponskrub-location',
    '--sponskrub-args',
    '--avconv-location',
    '--prefer-avconv',
    '--no-prefer-ffmpeg',
    '--no-prefer-avconv',
    '--prefer-ffmpeg',
    '-C',
    '--call-home',
    '--no-call-home',
    '--include-ads',
    '--no-include-ads',
    '--write-annotations',
    '--no-write-annotations',
    '--cn-verification-proxy',
]

const updateIds = {
    '1.3.0': 1,
    '1.3.1_comments': 2,
    '1.3.1_uploader_use_channel': 3,
    '1.3.1_detect_shorts': 4,
    '1.5.0_detect_three_minute_shorts': 5,
};

const applyUpdates = async () => {
    let version = await Version.findOne({ accessKey: 'version' });
    if (!version) version = await new Version().save();

    let hasUpdates = false;
    if (Math.max(...Object.keys(updateIds).map(x => updateIds[x]), 0) > version.lastUpdateCompleted) {
        logLine('Upgrading database. This may take a while...');
        console.time('Took');
        hasUpdates = true;
    }

    if (updateIds['1.3.0'] > version.lastUpdateCompleted) {
        // Delete uploaders
        await Uploader.deleteMany({});
        await Uploader.syncIndexes({});

        // Delete playlists
        await Playlist.deleteMany({});
        await Playlist.syncIndexes({});

        // Delete tags
        await Tag.deleteMany({});
        await Tag.syncIndexes({});

        // Reset job statistics
        await Job.updateMany({}, { $set: { statistics: { default: () => ({}) }, downloadComments: false, recodeVideo: false } });

        // Reset global statistics
        await Statistic.deleteMany({});
        await Statistic.syncIndexes({});
        let statistic = await new Statistic().save();

        let videos = await Video.find({});
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];

            // Increment global statistics
            statistic.statistics = await incrementStatistics(video, statistic);
            await statistic.save();

            // Add statistics to jobs
            let job = await Job.findOne({ _id: video.jobDocument });
            job.statistics = await incrementStatistics(video, job);
            await job.save();

            // Recreate uploader
            let uploader;
            if (video.uploader || video.uploaderId || video.channelId) {
                uploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.channelId || video.uploaderId || video.uploader,
                });
                if (!uploader) {
                    uploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.channelId || video.uploaderId || video.uploader,
                        name: video.uploader || video.uploaderId || video.channelId,
                        url: video.uploaderUrl,
                    }).save();
                }

                // Update uploader name
                if (video.uploadDate === uploader.statistics.newestVideoDateUploaded) {
                    uploader.name = video.uploader || video.uploaderId || video.channelId || uploader.name;
                    await uploader.save();
                }

                // Increment uploader statistics
                uploader.statistics = await incrementStatistics(video, uploader);
                await uploader.save();
            }

            // Set uploader document
            video.uploaderDocument = uploader?._id;

            // Recreate playlists
            let playlist;
            if (video.playlistTitle || video.playlist || video.playlistId) {
                playlist = await Playlist.findOne({
                    extractor: video.extractor,
                    id: video.playlistId || video.playlist || video.playlistTitle,
                });
                if (!playlist) {
                    playlist = await new Playlist({
                        extractor: video.extractor,
                        id: video.playlistId || video.playlist || video.playlistTitle,
                        name: video.playlistTitle || video.playlist || video.playlistId,
                        description: video.playlistDescription,
                        uploaderName: video.playlistUploader || video.playlistUploaderId,
                    }).save();
                }

                // Update playlist name and description
                if (video.uploadDate === playlist.statistics.newestVideoDateUploaded) {
                    playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
                    playlist.description = video.playlistDescription || playlist.description;
                    playlist.uploaderName = video.playlistUploader || video.playlistUploaderId || playlist.uploaderName;
                    await playlist.save();
                }

                // Increment playlist statistics
                playlist.statistics = await incrementStatistics(video, playlist);
                await playlist.save();
            }

            // Set new playlist document
            video.playlistDocument = playlist?._id;

            // Add a new field to videos for likeDislikeRatio
            if (video.likeCount !== null && video.dislikeCount !== null) {
                video.likeDislikeRatio = (video.likeCount - video.dislikeCount) / (video.likeCount + video.dislikeCount) || 0;
            } else {
                video.likeDislikeRatio = null;
            }

            await video.save();

            printProgress(`Doing version 1.3.0 migrations 1/1... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`);
        }

        version.lastUpdateCompleted = updateIds['1.3.0'];
        await version.save();
    }

    if (updateIds['1.3.1_comments'] > version.lastUpdateCompleted) {
        // Add downloadedCommentCount from comments length
        const results = await Video.aggregate([
            {
                $addFields: {
                    downloadedCommentCount: { $size: { $ifNull: ['$comments', []] } }
                }
            }
        ]);

        for (let [i, doc] of results.entries()) {
            await Video.updateOne(
                { _id: doc._id },
                { downloadedCommentCount: doc.downloadedCommentCount }
            );
            printProgress(`Doing version 1.3.1 migrations 1/3... ${(((i + 1) / results.length) * 100).toFixed(2)}%`);
        }

        // Remove comments from the database (they are now read from the filesystem)
        await Video.updateMany({}, { $set: { comments: [] } });

        version.lastUpdateCompleted = updateIds['1.3.1_comments'];
        await version.save();
    }

    if (updateIds['1.3.1_uploader_use_channel'] > version.lastUpdateCompleted) {
        // Delete uploaders
        await Uploader.deleteMany({});
        await Uploader.syncIndexes({});

        let videos = await Video.find({});
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];

            // Recreate uploader
            let uploader;
            if (video.channelId || video.uploaderId || video.channel || video.uploader) {
                uploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.channelId || video.uploaderId || video.channel || video.uploader,
                });
                if (!uploader) {
                    uploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.channelId || video.uploaderId || video.channel || video.uploader,
                        name: video.uploader || video.channel || video.uploaderId || video.channelId,
                        url: video.uploaderUrl,
                    }).save();
                }

                // Update uploader name and URL
                if (!video.uploadDate || video.uploadDate === uploader.statistics.newestVideoDateUploaded) {
                    uploader.name = video.uploader || video.channel || video.uploaderId || video.channelId || uploader.name;
                    uploader.url = video.uploaderUrl || uploader.url;
                    await uploader.save();
                }

                // Increment uploader statistics
                uploader.statistics = await incrementStatistics(video, uploader);
                await uploader.save();
            }

            // Set uploader document
            video.uploaderDocument = uploader?._id;
            await video.save();

            printProgress(`Doing version 1.3.1 migrations 2/3... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`);
        }

        version.lastUpdateCompleted = updateIds['1.3.1_uploader_use_channel'];
        await version.save();
    }

    if (updateIds['1.3.1_detect_shorts'] > version.lastUpdateCompleted) {
        let videos = await Video.find({}, 'extractor duration uploadDate width height');
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];
            const isShort = detectShort(video);
            if (isShort !== video.isShort) {
                video.isShort = isShort;
                await video.save();
            }
            printProgress(`Doing version 1.3.1 migrations 3/3... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`);
        }

        version.lastUpdateCompleted = updateIds['1.3.1_detect_shorts'];
        await version.save();
    }

    if (updateIds['1.5.0_detect_three_minute_shorts'] > version.lastUpdateCompleted) {
        let videos = await Video.find({}, 'extractor duration uploadDate width height');
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];
            const isShort = detectShort(video);
            if (isShort !== video.isShort) {
                video.isShort = isShort;
                await video.save();
            }
            printProgress(`Doing version 1.5.0 migrations 1/1... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`);
        }

        version.lastUpdateCompleted = updateIds['1.5.0_detect_three_minute_shorts'];
        await version.save();
    }

    if (hasUpdates) {
        logLine('Completed database upgrade');
        console.timeEnd('Took');
    }

    // Automatically disable deprecated yt-dlp options in job arguments
    if (parsedEnv.AUTO_DISABLE_DEPRECATED_OPTIONS) {
        let jobs = await Job.find({}, 'name arguments');
        for (let job of jobs) {
            if (job.arguments) {
                for (const deprecatedOption of ytDlpDeprecatedOptions) {
                    let disabledOption = false;

                    job.arguments = job.arguments
                        .split(/\r?\n/)
                        .map(line => {
                            if (line.includes(deprecatedOption) && !/^[#;\]]/.test(line.trimStart())) {
                                disabledOption = true;
                                return `#${line} (automatically disabled deprecated yt-dlp option)`;
                            }
                            return line;
                        })
                        .join('\n');

                    if (disabledOption) logLine(`Disabled deprecated yt-dlp option "${deprecatedOption}" in job "${job.name}"`);
                }
                await job.save();
            }
        }
    }
}

const recalculateStatistics = async () => {
    let version = await Version.findOne({ accessKey: 'version' });
    if (!version) version = await new Version().save();

    if (version.recalculateOnRestart) {
        logLine('Recalculating statistics. This may take a while...');
        console.time('Took');

        // Delete all documents derived from videos
        await Uploader.deleteMany({});
        await Uploader.syncIndexes({});
        await Playlist.deleteMany({});
        await Playlist.syncIndexes({});
        await Tag.deleteMany({});
        await Tag.syncIndexes({});

        // Reset job statistics
        await Job.updateMany({}, { $set: { statistics: { default: () => ({}) } } });

        // Reset global statistics
        await Statistic.deleteMany({});
        await Statistic.syncIndexes({});
        let statistic = await new Statistic().save();

        let videos = await Video.find({});
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];

            // Increment global statistics
            statistic.statistics = await incrementStatistics(video, statistic);
            await statistic.save();

            // Increment job statistics
            let job = await Job.findOne({ _id: video.jobDocument });
            job.statistics = await incrementStatistics(video, job);
            await job.save();

            // Recreate uploader
            let uploader;
            if (video.channelId || video.uploaderId || video.channel || video.uploader) {
                uploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.channelId || video.uploaderId || video.channel || video.uploader,
                });
                if (!uploader) {
                    uploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.channelId || video.uploaderId || video.channel || video.uploader,
                        name: video.uploader || video.channel || video.uploaderId || video.channelId,
                        url: video.uploaderUrl,
                    }).save();
                }

                // Update uploader name and URL
                if (!video.uploadDate || video.uploadDate === uploader.statistics.newestVideoDateUploaded) {
                    uploader.name = video.uploader || video.channel || video.uploaderId || video.channelId || uploader.name;
                    uploader.url = video.uploaderUrl || uploader.url;
                    await uploader.save();
                }

                // Increment uploader statistics
                uploader.statistics = await incrementStatistics(video, uploader);
                await uploader.save();
            }

            // Set uploader document
            video.uploaderDocument = uploader?._id;

            // Recreate playlists
            let playlist;
            if (video.playlistTitle || video.playlist || video.playlistId) {
                playlist = await Playlist.findOne({
                    extractor: video.extractor,
                    id: video.playlistId || video.playlist || video.playlistTitle,
                });
                if (!playlist) {
                    playlist = await new Playlist({
                        extractor: video.extractor,
                        id: video.playlistId || video.playlist || video.playlistTitle,
                        name: video.playlistTitle || video.playlist || video.playlistId,
                        description: video.playlistDescription,
                        uploaderName: video.playlistUploader || video.playlistUploaderId,
                    }).save();
                }

                // Update playlist name and description
                if (!video.uploadDate || video.uploadDate === playlist.statistics.newestVideoDateUploaded) {
                    playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
                    playlist.description = video.playlistDescription || playlist.description;
                    playlist.uploaderName = video.playlistUploader || video.playlistUploaderId || playlist.uploaderName;
                    await playlist.save();
                }

                // Increment playlist statistics
                playlist.statistics = await incrementStatistics(video, playlist);
                await playlist.save();
            }

            // Set playlist document
            video.playlistDocument = playlist?._id;

            await video.save();

            printProgress(`Recalculating statistics... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`);
        }

        logLine('Finished recalculating statistics');
        console.timeEnd('Took');

        version.recalculateOnRestart = false;
        await version.save();
    }
}

const printProgress = (message) => {
    if (process.stdout.isTTY) { // clearLine & cursorTo are not available if there is no TTY (notably in the Docker console)
        process.stdout.clearLine(1);
        process.stdout.cursorTo(0);
    }
    logStdout(message, true);
}

export { applyUpdates, recalculateStatistics };
