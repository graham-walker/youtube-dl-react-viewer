import Version from '../models/version.model.js';
import Video from '../models/video.model.js';
import Statistic from '../models/statistic.model.js';
import Uploader from '../models/uploader.model.js';
import Playlist from '../models/playlist.model.js';
import Job from '../models/job.model.js';

import { incrementStatistics, convertStatistics } from './statistic.utility.js';

const updateIds = {
    '1.3.0': 1,
};

const applyUpdates = async () => {
    let version = await Version.findOne({ accessKey: 'version' });
    if (!version) version = await new Version().save();

    let hasUpdates = false;
    if (Math.max(...Object.keys(updateIds).map(x => updateIds[x]), 0) > version.lastUpdateCompleted) {
        console.log('Applying updates. This may take a considerable amount of time'
            + ' depending on the size of the database...');
        console.time('Took');
        hasUpdates = true;
    }

    if (updateIds['1.3.0'] > version.lastUpdateCompleted) {
        // Delete all uploaders
        await Uploader.deleteMany({});
        await Uploader.syncIndexes({});

        // Delete all playlists, incase I am running this multiple times debug
        await Playlist.deleteMany({});
        await Playlist.syncIndexes({});

        // Reset the statistics on Jobs
        await Job.updateMany({}, { $set: { statistics: { default: () => ({}) } } });

        // Delete the global statistics
        await Statistic.deleteMany({});
        await Statistic.syncIndexes({});
        let statistic = await new Statistic().save();

        let allStatistics = {};

        let videos = await Video.find({});
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];

            // Increment the global statistics
            if (!allStatistics.hasOwnProperty('global')) allStatistics.global = { collection: statistic.collection, id: statistic._id, statistics: null };
            allStatistics.global.statistics = incrementStatistics(video, allStatistics.global.statistics || statistic.statistics);

            // Add video statistics to job
            let job = await Job.findOne({ _id: video.jobDocument });
            if (!allStatistics.hasOwnProperty(['job' + job._id])) allStatistics['job' + job._id] = { collection: job.collection, id: job._id, statistics: null };
            allStatistics['job' + job._id].statistics = incrementStatistics(video, allStatistics['job' + job._id].statistics || job.statistics);

            // Create/update the uploader with updated fields
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
                    }).save();
                }

                // Update uploader name if it was changed
                if (video.uploadDate === uploader.statistics.newestVideoDateUploaded) {
                    uploader.name = video.uploader || video.uploaderId || video.channelId || uploader.name;
                    await uploader.save();
                }

                // Increment uploader statistics
                if (!allStatistics.hasOwnProperty(['uploader' + uploader._id])) allStatistics['uploader' + uploader._id] = { collection: uploader.collection, id: uploader._id, statistics: null };
                allStatistics['uploader' + uploader._id].statistics = incrementStatistics(video, allStatistics['uploader' + uploader._id].statistics || uploader.statistics);
            }

            video.uploaderDocument = uploader?._id;

            // Create/update the uploader for the playlist
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

                // Update uploader name if it was changed
                if (video.uploadDate === playlistUploader.statistics.newestVideoDateUploaded) {
                    playlistUploader.name = video.playlistUploader || video.playlistUploaderId || playlistUploader.name;
                    await playlistUploader.save();
                }
            }

            // Create playlists
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

                    // Update the uploader playlist created count
                    if (playlistUploader) {
                        playlistUploader.playlistCreatedCount++;
                        await playlistUploader.save();
                    }
                }

                // Update playlist name and description if it was changed
                if (video.uploadDate === playlist.statistics.newestVideoDateUploaded) {
                    playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
                    playlist.description = video.playlistDescription || playlist.description;
                    await playlist.save();
                }

                // Increment playlist statistics
                if (!allStatistics.hasOwnProperty(['playlist' + playlist._id])) allStatistics['playlist' + playlist._id] = { collection: playlist.collection, id: playlist._id, statistics: null };
                allStatistics['playlist' + playlist._id].statistics = incrementStatistics(video, allStatistics['playlist' + playlist._id].statistics || playlist.statistics);
            }

            // Add a new field to reference the playlist document
            video.playlistDocument = playlist?._id;

            // Add a new field to videos for likeDislikeRatio
            if (video.likeCount !== null && video.dislikeCount !== null) {
                video.likeDislikeRatio = (video.likeCount - video.dislikeCount) / (video.likeCount + video.dislikeCount) || 0;
            } else {
                video.likeDislikeRatio = null;
            }

            await video.save();

            let progress = `Rebuilding documents... ${(((i + 1) / videos.length) * 100).toFixed(2)}%`;

            // clearLine & cursorTo may not be available in Docker if there is no TTY
            if (process.stdout.isTTY) {
                process.stdout.clearLine(1);
                process.stdout.cursorTo(0);
                process.stdout.write(progress);
            } else {
                console.log(progress);
            }
        }
        if (process.stdout.isTTY) console.log();

        // Save all statistics
        let values = Object.values(allStatistics);
        for (let i = 0; i < values.length; i++) {
            let stat = values[i];
            await stat.collection.findOneAndUpdate({ _id: stat.id }, { $set: { statistics: convertStatistics(stat.statistics) } });

            let progress = `Converting statistics... ${(((i + 1) / values.length) * 100).toFixed(2)}%`;
            if (process.stdout.isTTY) {
                process.stdout.clearLine(1);
                process.stdout.cursorTo(0);
                process.stdout.write(progress);
            } else {
                console.log(progress);
            }
        }
        if (process.stdout.isTTY) console.log();

        version.lastUpdateCompleted = updateIds['1.3.0'];
        await version.save();
    }

    if (hasUpdates) {
        console.log('Completed Updates.');
        console.timeEnd('Took');
    }
}

export default applyUpdates;
