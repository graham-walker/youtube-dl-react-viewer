import Version from '../models/version.model.js';
import Video from '../models/video.model.js';
import Statistic from '../models/statistic.model.js';
import Uploader from '../models/uploader.model.js';
import Playlist from '../models/playlist.model.js';
import Job from '../models/job.model.js';
import Tag from '../models/tag.model.js';

import { incrementStatistics } from './statistic.utility.js';
import { logLine, logStdout } from './logger.utility.js';

const updateIds = {
    '1.3.0': 1,
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
        await Job.updateMany({}, { $set: { statistics: { default: () => ({}) }, downloadComments: false } });

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
                    id: video.uploaderId || video.channelId || video.uploader,
                });
                if (!uploader) {
                    uploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.uploaderId || video.channelId || video.uploader,
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

            // Recreate playlist uploader
            let playlistUploader;
            if (video.playlistUploader || video.playlistUploaderId) {
                playlistUploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.playlistUploaderId || video.playlistUploader,
                });
                if (!playlistUploader) {
                    playlistUploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.playlistUploaderId || video.playlistUploader,
                        name: video.playlistUploader || video.playlistUploaderId,
                    }).save();
                }

                // Update playlist uploader name
                if (video.uploadDate === playlistUploader.statistics.newestVideoDateUploaded) {
                    playlistUploader.name = video.playlistUploader || video.playlistUploaderId || playlistUploader.name;
                    await playlistUploader.save();
                }

                // Video statistics are not counted for playlist uploaders
            }

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
                        uploaderDocument: playlistUploader,
                    }).save();

                    // Update the playlist uploader playlists created count
                    if (playlistUploader) {
                        playlistUploader.playlistCreatedCount++;
                        await playlistUploader.save();
                    }
                }

                // Update playlist name and description
                if (video.uploadDate === playlist.statistics.newestVideoDateUploaded) {
                    playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
                    playlist.description = video.playlistDescription || playlist.description;
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

            printProgress(`Doing version 1.3.0 migrations... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`);
        }

        version.lastUpdateCompleted = updateIds['1.3.0'];
        await version.save();
    }

    if (hasUpdates) {
        logLine('Completed database upgrade');
        console.timeEnd('Took');
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
            if (video.uploader || video.uploaderId || video.channelId) {
                uploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.uploaderId || video.channelId || video.uploader,
                });
                if (!uploader) {
                    uploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.uploaderId || video.channelId || video.uploader,
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

            // Recreate playlist uploader
            let playlistUploader;
            if (video.playlistUploader || video.playlistUploaderId) {
                playlistUploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.playlistUploaderId || video.playlistUploader,
                });
                if (!playlistUploader) {
                    playlistUploader = await new Uploader({
                        extractor: video.extractor,
                        id: video.playlistUploaderId || video.playlistUploader,
                        name: video.playlistUploader || video.playlistUploaderId,
                    }).save();
                }

                // Update playlist uploader name
                if (video.uploadDate === playlistUploader.statistics.newestVideoDateUploaded) {
                    playlistUploader.name = video.playlistUploader || video.playlistUploaderId || playlistUploader.name;
                    await playlistUploader.save();
                }

                // Video statistics are not counted for playlist uploaders
            }

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
                        uploaderDocument: playlistUploader,
                    }).save();

                    // Update the playlist uploader playlists created count
                    if (playlistUploader) {
                        playlistUploader.playlistCreatedCount++;
                        await playlistUploader.save();
                    }
                }

                // Update playlist name and description
                if (video.uploadDate === playlist.statistics.newestVideoDateUploaded) {
                    playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
                    playlist.description = video.playlistDescription || playlist.description;
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
