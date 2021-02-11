import Version from '../models/version.model.js';
import Video from '../models/video.model.js';
import Statistic from '../models/statistic.model.js';
import Uploader from '../models/uploader.model.js';
import Playlist from '../models/playlist.model.js';
import Job from '../models/job.model.js';

import { incrementStatistics } from './statistic.utility.js';

const applyUpdates = async () => {
    let version = await Version.findOne({ accessKey: 'version' });
    if (!version) version = await new Version().save();

    if (getVersionScore('1.3.0') > getVersionScore(version.lastVersionRun)) {
        console.time('Took');
        console.log('Applying database updates for the 1.3.0 release. This may take a'
            + ' considerable amount of time depending on the size of the database.');

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

        let videos = await Video.find({});
        for (let i = 0; i < videos.length; i++) {
            let video = videos[i];

            // Increment the global statistics
            statistic.statistics = incrementStatistics(video, statistic.statistics);

            // Add video statistics to job
            let job = await Job.findOne({ _id: video.jobDocument });
            job.statistics = incrementStatistics(video, job.statistics);
            await job.save();

            // Create/update the uploader with updated fields
            let uploader;
            if (video.uploader || video.uploaderId || video.channelId) {
                uploader = await Uploader.findOne({
                    extractor: video.extractor,
                    id: video.channelId || video.uploaderId || video.uploader,
                });
                if (!uploader) uploader = await new Uploader({
                    extractor: video.extractor,
                    id: video.channelId || video.uploaderId || video.uploader,
                    name: video.uploader || video.uploaderId || video.channelId,
                }).save();

                // Increment uploader statistics
                uploader.statistics = incrementStatistics(video, uploader.statistics);

                // Update uploader name if it was changed
                if (video.uploadDate === uploader.statistics.lastDateUploaded) {
                    uploader.name = video.uploader || video.uploaderId || video.channelId || uploader.name;
                }

                await uploader.save();
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
                } else if (video.uploadDate === playlistUploader.statistics.lastDateUploaded) {
                    // Update uploader name if it was changed
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
                if (!playlist) playlist = await new Playlist({
                    extractor: video.extractor,
                    id: video.playlistId || video.playlist || video.playlistTitle,
                    name: video.playlistTitle || video.playlist || video.playlistId,
                    description: video.playlistDescription,
                    uploaderDocument: playlistUploader,
                }).save();

                // Increment playlist statistics
                playlist.statistics = incrementStatistics(video, playlist.statistics);

                // Update playlist name and description if it was changed
                if (video.uploadDate === playlist.statistics.lastDateUploaded) {
                    playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
                    playlist.description = video.playlistDescription || playlist.description;
                }

                await playlist.save();
            }

            video.playlistDocument = playlist?._id;

            // Add a new field to videos for likeDislikeRatio
            if (video.likeCount !== null && video.dislikeCount !== null) {
                video.likeDislikeRatio = (video.likeCount - video.dislikeCount) / (video.likeCount + video.dislikeCount) || 0;
            }

            await video.save();

            let progress = (((i + 1) / videos.length) * 100).toFixed(2) + '%...';

            // clearLine & cursorTo may not be available in Docker if there is no TTY
            if (process.stdout.isTTY) {
                process.stdout.clearLine(1);
                process.stdout.cursorTo(0);
                process.stdout.write(progress);
            }
            else {
                console.log(progress);
            }
        }

        await statistic.save();

        version.lastVersionRun = process.env.npm_package_version;
        await version.save();
        console.log();
        console.log('Completed update for 1.3.0 release.');
        console.timeEnd('Took');
    }
}

const getVersionScore = (tagName) => {
    if (!tagName) return 0;
    let versionNumbers = tagName.split('.').reverse();
    let score = 0;
    let scale = 1;
    for (let i = 0; i < versionNumbers.length; i++) {
        score += parseInt(versionNumbers[i]) * scale;
        scale *= 100;
    }
    return score;
}

export default applyUpdates;
