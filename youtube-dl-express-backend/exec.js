import fs from 'fs-extra';
import crypto from 'crypto';
import commander from 'commander';
import path from 'path';
import slash from 'slash';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { spawnSync } from 'child_process';

import Video from './models/video.model.js';
import Job from './models/job.model.js';
import Statistic from './models/statistic.model.js';
import Uploader from './models/uploader.model.js';
import Playlist from './models/playlist.model.js';
import DownloadError from './models/error.model.js';

import parsed from './parse-env.js';
import { incrementStatistics } from './utilities/statistic.utility.js';

const program = commander.program;

let debug;

(async () => {
    if (parsed.err) throw parsed.err;

    debug = parsed.env.VERBOSE;

    program.name('youtube-dl-exec-script')
        .version('1.3.0') // Version is hardcoded here because on non-Windows systems this script has to be called by node instead of npm
        .requiredOption('-v, --video <path>', 'Downloaded video file location')
        .requiredOption('-j, --job-id <string>', 'Job document id')
        .option(
            '--youtube-dl-version <version>',
            'Version of youtube-dl the video was downloaded with'
        )
        .option('--is-repair', 'Is exec being called to repair a failed download', false)
        .option('--error-id <string>', 'Error document id to be used in a repair')
        .option('--is-import', 'Is exec being called to import an already downloaded video', false)
        .option('--downloaded <downloaded>', 'Override the date downloaded')
        .option('-d, --debug', 'Show detailed error messages', false)

    program.parse(process.argv);

    console.log(`Perparing to insert document for video: ${program.video} into the database`);

    if (debug) {
        console.debug('Printing program arguments:');
        console.dir(program.opts(), { maxArrayLength: null });
    }

    console.log(`Connecting to database with URL: ${parsed.env.MONGOOSE_URL}...`);
    try {
        await mongoose.connect(parsed.env.MONGOOSE_URL, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true,
        });
    } catch (err) {
        console.error('Failed to connect to the database');
        throw err;
    }
    console.log('Connected');

    // Make sure the video file exists and is a file
    let videoFilesize;
    try {
        const stats = fs.statSync(program.video);
        if (!stats.isFile()) {
            console.error(`Video file: ${program.video} is not a file`);
            throw new Error(`Video file: ${program.video} is not a file`);
        }
        videoFilesize = stats.size;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(`Could not find video file: ${program.video}`);
        } else {
            console.error(`Failed to check if the video file: ${program.video} exists`);
        }
        throw err;
    }

    // Get all of the files youtube-dl downloaded related to the video file
    // The script assumes the output path downloads each video to a unique folder
    const videoDirectory = path.dirname(program.video);
    let files;
    try {
        files = fs.readdirSync(videoDirectory, { withFileTypes: true });
        files = files.filter(file => file.isFile()).map(file => file.name);
    } catch (err) {
        console.error(`Failed to read video directory: ${videoDirectory}`);
        throw err;
    }

    const basename = path.basename(
        program.video.slice(0, -path.extname(program.video).length)
    );
    const ext = path.extname(program.video).slice(1);

    // Basic check to make sure each video was downloaded in a unique folder
    // This isn't perfect though as it is only checking the start of the filename
    if (files.filter(file => !file.startsWith(basename)).length > 0) {
        console.error(
            'Make sure the youtube-dl config places downloaded videos in their'
            + ' own unique directory (i.e., --output "/%(extractor)s/%'
            + '(id)s/%(title)s - %(uploader)s - %(upload_date)s.%(ext)s'
        );
        throw new Error('Video directory is not unique');
    }

    // Make sure the required video metadata file exists
    if (files.filter(file => file.endsWith('.info.json')).length === 0) {
        console.error('Could not find video metadata file: '
            + `${path.join(videoDirectory, basename + '.info.json')} (make sure`
            + ' the youtube-dl config file includes the argument: --write-info-json)');
        throw new Error('Could not find video metadata file');
    }

    // Remove discovered files from the downloaded file list so we know if we
    // failed to identify any files left before we insert the document into the database
    files = files.filter(file =>
        file !== path.basename(program.video)
        && file !== basename + '.info.json'
    );

    // Get the video metadata file
    const infoFile = path.join(videoDirectory, basename + '.info.json');
    let [infojsonData, infoFilesize, infoMd5] = getFileData(infoFile, true);

    // Parse metadata from the video metadata file
    try {
        infojsonData = JSON.parse(infojsonData);
    } catch (err) {
        console.error(`Failed to parse video metadata file: ${infoFile}`);
        throw err;
    }

    // Make sure video metadata has the required properties
    const requiredProperties = ['id', 'extractor', 'title'];
    for (let i = 0; i < requiredProperties.length; i++) {
        if (!infojsonData.hasOwnProperty(requiredProperties[i])) {
            const err = 'Video metadata file does not have required property:'
                + ` ${requiredProperties[i]}`;
            console.error(err);
            throw new Error(err);
        }
    }

    // Make sure the video doesn't already exist in the database
    let video = await Video.findOne({ extractor: infojsonData.extractor, id: infojsonData.id });
    if (video) {
        console.warn(`Document with extractor: ${infojsonData.extractor} and id: ${infojsonData.id} already exists in the database`);
        mongoose.disconnect();
        process.exit(0);
    }

    // Hash the video file
    console.log('Generating MD5 hash for video file...');
    let videoMd5;
    try {
        videoMd5 = await generateFileHash(program.video);
    }
    catch (err) {
        console.error(`Failed to generate hash for video file: ${program.video}`);
        throw err;
    }

    // Throw an error if the video hash matches the niconico unknown video hash
    if (videoMd5 === '7ecbbdd7ab22e9c8f2b01c335f098a18') {
        console.error('Video is niconico unknown video');
        throw new Error('Video is niconico unknown video');
    }

    // Get additional metadata by probing the video file
    console.log(`Probing video file...`);
    let ffprobeData;
    try {
        ffprobeData = doProbeSync(program.video);
    } catch (err) {
        console.error(`Failed to probe video file: ${program.video}`);
        throw err;
    }
    if (!ffprobeData) {
        console.error('ffprobe returned no data');
        throw new Error('ffprobe returned no data');
    }

    if (debug) {
        console.debug('Printing probe data:');
        console.dir(ffprobeData, { maxArrayLength: null });
    }

    // Get the audio and video streams
    let ffprobeVideoStream;
    let ffprobeAudioStream;
    if (!ffprobeData.hasOwnProperty('error')) {
        if (ffprobeData.hasOwnProperty('streams')) {
            for (let stream of ffprobeData.streams) {
                if (stream.hasOwnProperty('codec_type')) {
                    switch (stream.codec_type) {
                        case 'video':
                            ffprobeVideoStream = stream;
                            break;
                        case 'audio':
                            ffprobeAudioStream = stream;
                    }
                }
            }
        }
    } else {
        throw new Error(ffprobeData.error);
    }

    // TODO: Here is where I might collect metadata from --write-metadata and
    // --xattrs but the data appears to be redundant

    // Get the description file (if it exists)
    const descriptionFile = path.join(videoDirectory, basename + '.description');
    const [descriptionData, descriptionFilesize, descriptionMd5] = getFileData(descriptionFile);
    files = files.filter(file => file !== basename + '.description');

    // Get the annotations file (if it exists)
    const annotationsFile = path.join(videoDirectory, basename + '.annotations.xml');
    const [annotationsData, annotationsFilesize, annotationsMd5] = getFileData(annotationsFile);
    files = files.filter(file => file !== basename + '.annotations.xml');

    // Get the thumbnail file(s) (if they exist)
    let potentialThumbnailFiles = [];
    if (infojsonData.hasOwnProperty('thumbnail')) {
        potentialThumbnailFiles.push(
            path.join(videoDirectory, basename + '.' + extensionFromUrl(infojsonData.thumbnail))
        );

        // Compatibility with youtube-dl version 2020.12.12+
        potentialThumbnailFiles.push(
            path.join(videoDirectory, basename + '.' + ext + '.' + extensionFromUrl(infojsonData.thumbnail))
        );
    }
    if (infojsonData.hasOwnProperty('thumbnails')) {
        for (let i = 0; i < infojsonData.thumbnails.length; i++) {
            if (infojsonData.thumbnails[i].hasOwnProperty('id')
                && infojsonData.thumbnails[i].hasOwnProperty('url')
            ) {
                const thumbnailExt = extensionFromUrl(infojsonData.thumbnails[i].url);

                potentialThumbnailFiles.push(
                    path.join(
                        videoDirectory,
                        basename + '_' + infojsonData.thumbnails[i].id + '.'
                        + thumbnailExt
                    )
                );

                // Compatibility with youtube-dl version 2020.12.12+
                potentialThumbnailFiles.push(
                    path.join(
                        videoDirectory,
                        basename + '.' + ext + '_' + infojsonData.thumbnails[i].id + '.'
                        + thumbnailExt
                    )
                );

                // Compatibility with yt-dlp version 2021.02.04+
                potentialThumbnailFiles.push(
                    path.join(
                        videoDirectory,
                        basename + '.' + infojsonData.thumbnails[i].id + '.'
                        + thumbnailExt
                    )
                );

                // Compatibility with yt-dlp individual thumbnails
                potentialThumbnailFiles.push(
                    path.join(
                        videoDirectory,
                        basename + '.' + thumbnailExt
                    )
                );
            }
        }
    }

    // Remove duplicates
    potentialThumbnailFiles = potentialThumbnailFiles.filter((value, index, self) => {
        return self.indexOf(value) === index;
    });

    let thumbnailFiles = [];
    let totalThumbnailFilesize = 0;
    let largestThumbnailData;
    let largestThumbnailFilesize = 0;
    for (let i = 0; i < potentialThumbnailFiles.length; i++) {
        const [thumbnailData, thumbnailFilesize, thumbnailMd5] = getFileData(potentialThumbnailFiles[i], false, null);

        if (thumbnailData) {
            thumbnailFiles.push({ name: path.basename(potentialThumbnailFiles[i]), filesize: thumbnailFilesize, md5: thumbnailMd5 });

            totalThumbnailFilesize += thumbnailFilesize;

            files = files.filter(file => file !== path.basename(potentialThumbnailFiles[i]));

            // Choose the thumbnail to be used creating the resized thumbnails
            if (thumbnailFilesize >= largestThumbnailFilesize) {
                largestThumbnailData = thumbnailData;
                largestThumbnailFilesize = thumbnailFilesize;
            }
        }
    }

    // Create the resized thumbnail files
    let resizedThumbnailsDirectory = path.join(
        parsed.env.OUTPUT_DIRECTORY,
        'thumbnails',
        path.relative(
            path.join(parsed.env.OUTPUT_DIRECTORY, 'videos'), videoDirectory
        )
    );

    let mediumResizedThumbnailFile = path.join(resizedThumbnailsDirectory, basename + '.medium.jpg');
    let mediumResizedThumbnailFilesize;
    let mediumResizedThumbnailMd5;
    let mediumResizedThumbnailWidth;
    let mediumResizedThumbnailHeight;
    let smallResizedThumbnailFile = path.join(resizedThumbnailsDirectory, basename + '.small.jpg');
    let smallResizedThumbnailFilesize;
    let smallResizedThumbnailMd5;
    let smallResizedThumbnailWidth;
    let smallResizedThumbnailHeight;

    if (largestThumbnailData) {
        console.log('Creating resized thumbnails...');
        fs.ensureDirSync(resizedThumbnailsDirectory);
        [
            mediumResizedThumbnailFilesize,
            mediumResizedThumbnailMd5,
            mediumResizedThumbnailWidth,
            mediumResizedThumbnailHeight
        ] = await generateThumbnailFile(largestThumbnailData, 720, 405, mediumResizedThumbnailFile);
        [
            smallResizedThumbnailFilesize,
            smallResizedThumbnailMd5,
            smallResizedThumbnailWidth,
            smallResizedThumbnailHeight
        ] = await generateThumbnailFile(largestThumbnailData, 168, 95, smallResizedThumbnailFile);
    }

    // Index the subtitle file(s) (if they exist)
    let potentialSubtitleFiles = [];
    const subtitleFields = ['subtitles', 'automatic_captions'];
    for (let i = 0; i < subtitleFields.length; i++) {
        if (infojsonData.hasOwnProperty(subtitleFields[i]) && subtitleFields[i] !== null) {
            for (let language in infojsonData[subtitleFields[i]]) {
                for (let j = 0; j < infojsonData[subtitleFields[i]][language].length; j++) {
                    potentialSubtitleFiles.push({
                        filename: path.join(videoDirectory, basename + '.' + language + '.' + infojsonData[subtitleFields[i]][language][j].ext),
                        language: language,
                        isAutomatic: !!i,
                    });
                }
            }
        }
    }

    let subtitleFiles = [];
    let totalSubtitleFilesize = 0;
    for (let i = 0; i < potentialSubtitleFiles.length; i++) {
        const [subtitleData, subtitleFilesize, subtitleMd5] = getFileData(potentialSubtitleFiles[i].filename, false);

        if (subtitleData) {
            subtitleFiles.push({
                name: path.basename(potentialSubtitleFiles[i].filename),
                filesize: subtitleFilesize,
                md5: subtitleMd5,
                language: potentialSubtitleFiles[i].language,
                isAutomatic: potentialSubtitleFiles[i].isAutomatic,
            });

            totalSubtitleFilesize += subtitleFilesize;

            files = files.filter(file => file !== path.basename(potentialSubtitleFiles[i].filename));
        }
    }

    // Get hashtags from the description
    let hashtags = [];
    let description = descriptionData || infojsonData.description;
    if (description) {
        let matches = [...description.matchAll(/(?:^|\s)(#(?!\d)[^\s]+)/g)];
        hashtags = Array.from(matches, res => res[1]).filter(Boolean);
    }

    // Get chapters from the description
    let chapters = [];
    const duration = infojsonData.duraton || ffprobeData?.format?.duration;
    if (description && !infojsonData.chapters?.length > 0) {
        let matches = [...description.matchAll(/(?:^|\s)([0-5]?\d(?::(?:[0-5]?\d)){1,2})(.*)/g)];
        chapters = Array.from(matches, res => {
            return {
                start_time: chapterTimeToSeconds(res[1]),
                end_time: undefined,
                title: res[2].trim(),
            };
        }).filter(Boolean);
        for (let i = 0; i < chapters.length; i++) {
            if (chapters[i].title.startsWith('- ')) chapters[i].title = chapters[i].title.slice(2)
            if (i < chapters.length - 1) {
                chapters[i].end_time = chapters[i + 1].start_time;
            } else {
                chapters[i].end_time = duration;
            }
        }
    } else {
        chapters = infojsonData.chapters;
    }

    let likeDislikeRatio;
    if (
        typeof infojsonData?.like_count === 'number'
        && typeof infojsonData?.dislike_count === 'number'
    ) {
        likeDislikeRatio = (infojsonData.like_count - infojsonData.dislike_count) / (infojsonData.like_count + infojsonData.dislike_count) || 0;
    }

    // If there are files we could not determine the identity of throw an error
    if (files.length > 0) {
        console.error(`Failed to determine the identity of ${files.length} files:`);
        console.dir(files);
        throw new Error('Failed to index all files: ' + files.join(', '));
    }

    // Create the folder with the extractor name for the avatars
    fs.ensureDirSync(path.join(
        parsed.env.OUTPUT_DIRECTORY,
        'avatars',
        infojsonData.extractor.replace(/[|:&;$%@"<>()+,/\\]/g, ' -')
    ));

    // Get or create the job, uploader and statistics documents
    let job;
    try {
        job = await Job.findOne({ _id: program.jobId });
    } catch (err) {
        console.error('Failed to retrieve job document');
        throw err;
    }
    if (!job) throw new Error('Could not find job');

    let originalUploader;
    if (job.overrideUploader) {
        originalUploader = infojsonData.uploader;
        infojsonData.uploader = job.overrideUploader;
    }

    let statistic;
    try {
        statistic = await Statistic.findOne({ accessKey: 'videos' });
        if (!statistic) statistic = await new Statistic().save();
    } catch (err) {
        console.error('Failed to retrieve statistics document');
        throw err;
    }

    let uploader;
    if (infojsonData.uploader || infojsonData.uploader_id || infojsonData.channel_id) {
        try {
            uploader = await Uploader.findOne({
                extractor: infojsonData.extractor,
                id: infojsonData.channel_id || infojsonData.uploader_id || infojsonData.uploader,
            });
            if (!uploader) uploader = await new Uploader({
                extractor: infojsonData.extractor,
                id: infojsonData.channel_id || infojsonData.uploader_id || infojsonData.uploader,
                name: infojsonData.uploader || infojsonData.uploader_id || infojsonData.channel_id,
            }).save();
        } catch (err) {
            console.error('Failed to retrieve uploader document');
            throw err;
        }
    }

    let playlistUploader;
    if (infojsonData.playlist_uploader || infojsonData.playlist_uploader_id) {
        try {
            playlistUploader = await Uploader.findOne({
                extractor: infojsonData.extractor,
                id: infojsonData.playlist_uploader_id || infojsonData.playlist_uploader,
            });
            if (!playlistUploader) playlistUploader = await new Uploader({
                extractor: infojsonData.extractor,
                id: infojsonData.playlist_uploader_id || infojsonData.playlist_uploader,
                name: infojsonData.playlist_uploader || infojsonData.playlist_uploader_id,
            }).save();
        } catch (err) {
            console.error('Failed to retrieve playlist uploader document');
            throw err;
        }
    }

    let ytdlpPlaylistDescription;
    if (infojsonData.extractor === 'youtube' && infojsonData.playlist_id) {
        try {
            const ytdlpPlaylistDir = path.join(parsed.env.OUTPUT_DIRECTORY, 'videos/youtube：tab', infojsonData.playlist_id);
            if (fs.existsSync(ytdlpPlaylistDir)) {
                const ytdlpPlaylistMetadataFile = path.join(ytdlpPlaylistDir, (await fs.readdir(ytdlpPlaylistDir)).filter(file => path.extname(file) === '.json')[0]);
                const ytdlpPlaylistJson = JSON.parse(await fs.readFile(ytdlpPlaylistMetadataFile));
                ytdlpPlaylistDescription = ytdlpPlaylistJson.description;
            }
        } catch (err) {
            console.error('Failed to read yt-dlp playlist file (it probably does not exist or not using yt-dlp)');
            if (debug) console.error(err);
        }
    }

    let playlist;
    if (infojsonData.playlist_title || infojsonData.playlist || infojsonData.playlist_id) {
        try {
            playlist = await Playlist.findOne({
                extractor: infojsonData.extractor,
                id: infojsonData.playlist_id || infojsonData.playlist || infojsonData.playlist_title,
            });
            if (!playlist) {
                playlist = await new Playlist({
                    extractor: infojsonData.extractor,
                    id: infojsonData.playlist_id || infojsonData.playlist || infojsonData.playlist_title,
                    name: infojsonData.playlist_title || infojsonData.playlist || infojsonData.playlist_id,
                    description: infojsonData.playlist_description || ytdlpPlaylistDescription,
                    uploaderDocument: playlistUploader,
                }).save();

                // Update the uploader playlist created count
                if (playlistUploader) {
                    playlistUploader.playlistCreatedCount++;
                    await playlistUploader.save();
                }
            }
        } catch (err) {
            console.error('Failed to retrieve playlist document');
            throw err;
        }
    }

    // Parse the stream fps from ffprobe
    let ffprobeVideoStreamFps;
    try {
        ffprobeVideoStreamFps = eval(ffprobeVideoStream?.avg_frame_rate)
    } catch (err) {
        ffprobeVideoStreamFps = null;
    }
    if (isNaN(ffprobeVideoStreamFps)) ffprobeVideoStreamFps = null;

    // Get the error document if repairing
    let error;
    if (program.isRepair) {
        try {
            error = await DownloadError.findOne({ _id: program.errorId });
        }
        catch (err) {
            console.log('Could not find error document');
            throw err;
        }
        if (!error) throw new Error('Could not find error document');
    }

    // Insert the document
    video = new Video({
        extractor: infojsonData.extractor,
        extractorKey: infojsonData.extractor_key,
        id: infojsonData.id,
        title: infojsonData.title,
        format: infojsonData.format,
        formatId: infojsonData.format_id,
        formatNote: infojsonData.format_note,
        width: infojsonData.width
            || ffprobeVideoStream?.coded_width
            || ffprobeVideoStream?.width
            || undefined,
        height: infojsonData.height
            || ffprobeVideoStream?.coded_height
            || ffprobeVideoStream?.height
            || undefined,
        resolution: infojsonData.resolution
            || (!!infojsonData.width && !!infojsonData.height && `${infojsonData.width}x${infojsonData.height}`)
            || (!!ffprobeVideoStream?.coded_width && !!ffprobeVideoStream?.coded_height && `${ffprobeVideoStream.coded_width}x${ffprobeVideoStream.coded_height}`)
            || (!!ffprobeVideoStream?.width && !!ffprobeVideoStream?.height && `${ffprobeVideoStream.width}x${ffprobeVideoStream.height}`)
            || undefined,
        tbr: infojsonData.tbr || ffprobeData?.format?.bit_rate,
        abr: infojsonData.abr || ffprobeAudioStream?.bit_rate,
        acodec: infojsonData.acodec || ffprobeAudioStream?.codec_name,
        asr: infojsonData.asr || ffprobeAudioStream?.sample_rate,
        vbr: infojsonData.vbr || ffprobeVideoStream?.bit_rate,
        fps: infojsonData.fps || ffprobeVideoStreamFps,
        vcodec: infojsonData.vcodec || ffprobeVideoStream?.codec_name,
        url: infojsonData.url,
        ext: infojsonData.ext || ext,
        playerUrl: infojsonData.player_url,
        altTitle: infojsonData.alt_title,
        displayId: infojsonData.display_id,
        description: description,
        uploader: infojsonData.uploader,
        license: infojsonData.license,
        creator: infojsonData.creator,
        uploadDate: infojsonData.timestamp
            ? new Date(infojsonData.timestamp * 1000)
            : infojsonData.release_date
                ? new Date(Date.parse(infojsonData.release_date.slice(0, 4) + '-'
                    + infojsonData.release_date.slice(4, 6) + '-' + infojsonData.release_date.slice(6, 8)))
                : infojsonData.upload_date
                    ? new Date(Date.parse(infojsonData.upload_date.slice(0, 4) + '-'
                        + infojsonData.upload_date.slice(4, 6) + '-' + infojsonData.upload_date.slice(6, 8)))
                    : undefined,
        uploaderId: infojsonData.uploader_id,
        uploaderUrl: infojsonData.uploader_url,
        channel: infojsonData.channel,
        channelId: infojsonData.channel_id,
        channelUrl: infojsonData.channel_url,
        location: infojsonData.location,
        duration: duration,
        viewCount: infojsonData.view_count,
        likeCount: infojsonData.like_count,
        dislikeCount: infojsonData.dislike_count,
        repostCount: infojsonData.repost_count,
        averageRating: infojsonData.average_rating,
        commentCount: infojsonData.comment_count,
        comments: infojsonData.comments || [],
        ageLimit: infojsonData.age_limit,
        webpageUrl: infojsonData.webpage_url,
        categories: infojsonData.categories || [],
        tags: infojsonData.tags || [],
        isLive: infojsonData.is_live,
        startTime: infojsonData.start_time,
        endTime: infojsonData.end_time,
        chapters: chapters,
        chapter: infojsonData.chapter,
        chapterNumber: infojsonData.chapter_number,
        chapterId: infojsonData.chapter_id,
        series: infojsonData.series,
        season: infojsonData.season,
        seasonNumber: infojsonData.season_number,
        seasonId: infojsonData.season_id,
        episode: infojsonData.episode,
        episodeNumber: infojsonData.episode_number,
        episodeId: infojsonData.episode_id,
        track: infojsonData.track,
        trackNumber: infojsonData.track_number,
        trackId: infojsonData.track_id,
        artist: infojsonData.artist,
        genre: infojsonData.genre,
        album: infojsonData.album,
        albumType: infojsonData.album_type,
        albumArtist: infojsonData.album_artist,
        discNumber: infojsonData.disc_number,
        releaseYear: infojsonData.release_year,
        playlist: infojsonData.playlist,
        playlistIndex: infojsonData.playlist_index,
        playlistId: infojsonData.playlist_id,
        playlistTitle: infojsonData.playlist_title,
        playlistUploader: infojsonData.playlist_uploader,
        playlistUploaderId: infojsonData.playlist_uploader_id,
        playlistUploaderUrl: infojsonData.playlist_uploader_url,
        playlistDescription: infojsonData.playlist_description,
        hashtags: hashtags,
        likeDislikeRatio: likeDislikeRatio,
        directory: slash(path.relative(path.join(parsed.env.OUTPUT_DIRECTORY, 'videos'), videoDirectory)),
        totalFilesize: videoFilesize + infoFilesize + (descriptionFilesize || 0) + (annotationsFilesize || 0) + totalThumbnailFilesize + (mediumResizedThumbnailFilesize || 0) + (smallResizedThumbnailFilesize || 0) + totalSubtitleFilesize,
        totalOriginalFilesize: videoFilesize + infoFilesize + (descriptionFilesize || 0) + (annotationsFilesize || 0) + totalThumbnailFilesize + totalSubtitleFilesize,
        videoFile: {
            name: path.basename(program.video),
            filesize: videoFilesize,
            md5: videoMd5,
        },
        infoFile: {
            name: path.basename(infoFile),
            filesize: infoFilesize,
            md5: infoMd5,
        },
        descriptionFile: descriptionData !== undefined ? {
            name: path.basename(descriptionFile),
            filesize: descriptionFilesize,
            md5: descriptionMd5,
        } : undefined,
        annotationsFile: annotationsData !== undefined ? {
            name: path.basename(annotationsFile),
            filesize: annotationsFilesize,
            md5: annotationsMd5,
        } : undefined,
        thumbnailFiles: thumbnailFiles,
        mediumResizedThumbnailFile: largestThumbnailData !== undefined ? {
            name: path.basename(mediumResizedThumbnailFile),
            filesize: mediumResizedThumbnailFilesize,
            md5: mediumResizedThumbnailMd5,
            width: mediumResizedThumbnailWidth,
            height: mediumResizedThumbnailHeight,
        } : undefined,
        smallResizedThumbnailFile: largestThumbnailData !== undefined ? {
            name: path.basename(smallResizedThumbnailFile),
            filesize: smallResizedThumbnailFilesize,
            md5: smallResizedThumbnailMd5,
            width: smallResizedThumbnailWidth,
            height: smallResizedThumbnailHeight,
        } : undefined,
        subtitleFiles: subtitleFiles,
        unindexedFiles: files,
        dateDownloaded: program.downloaded ? new Date(+program.downloaded) : program.isRepair ? error.dateDownloaded : new Date(),
        formatCode: program.isImport ? null : program.isRepair ? error.formatCode : job.formatCode,
        isAudioOnly: program.isImport ? null : program.isRepair ? error.isAudioOnly : job.isAudioOnly,
        urls: program.isImport ? null : program.isRepair ? error.urls : job.urls,
        arguments: program.isImport ? null : program.isRepair ? error.arguments : job.arguments,
        overrideUploader: program.isRepair ? error.overrideUploader : job.overrideUploader,
        originalUploader: originalUploader,
        uploaderDocument: uploader?._id,
        playlistDocument: playlist?._id,
        jobDocument: job._id,
        youtubeDlVersion: program.isImport ? null : program.isRepair ? error.youtubeDlVersion : program.youtubeDlVersion,
        youtubeDlPath: program.isImport ? null : program.isRepair ? error.youtubeDlPath : parsed.env.YOUTUBE_DL_PATH,
        imported: program.isRepair ? error.imported : program.isImport,
        scriptVersion: program.version(),
    });

    try {
        await video.save();
    } catch (err) {
        console.error(`Failed to insert document with extractor: ${infojsonData.extractor} and id: ${infojsonData.id} into the database`);
        throw err;
    }

    // Increment statistics
    statistic.statistics = await incrementStatistics(video, statistic);
    await statistic.save();

    job.statistics = await incrementStatistics(video, job);
    await job.save();

    if (uploader) {
        uploader.statistics = await incrementStatistics(video, uploader);

        if (video.uploadDate === uploader.statistics.newestVideoDateUploaded) {
            uploader.name = video.uploader || video.uploaderId || video.channelId || uploader.name;
        }

        await uploader.save();
    }

    if (playlistUploader && video.uploadDate === playlistUploader.statistics.newestVideoDateUploaded) {
        playlistUploader.name = video.playlistUploader || video.playlistUploaderId || playlistUploader.name;
        await playlistUploader.save();
    }

    if (playlist) {
        playlist.statistics = await incrementStatistics(video, playlist);

        if (video.uploadDate === playlist.statistics.newestVideoDateUploaded) {
            playlist.name = video.playlistTitle || video.playlist || video.playlistId || playlist.name;
            playlist.description = video.playlistDescription || ytdlpPlaylistDescription || playlist.description;
        }

        await playlist.save();
    }

    console.log(`Successfully inserted document into the database`);
    mongoose.disconnect();
    process.exit(0);
})().catch(async err => {
    if (debug) {
        console.error('Encountered a fatal error:');
        oldError(err);
    } else {
        console.error('Encountered a fatal error. Run the script with the argument: -d to print debug information');
    }

    let videoPath;
    try {
        // Record the error
        videoPath = slash(path.relative(path.join(parsed.env.OUTPUT_DIRECTORY, 'videos'), program.video));
        const job = await Job.findOne({ _id: program.jobId });
        let previousError;
        if (program.isRepair) previousError = await DownloadError.findOne({ _id: program.errorId });
        if (!job || (program.isRepair && !previousError)) throw new Error('Could not find required documents');

        const errorDocument = {
            videoPath: videoPath,
            errorObject: JSON.stringify(err, Object.getOwnPropertyNames(err)),
            dateDownloaded: program.downloaded ? new Date(+program.downloaded) : program.isRepair ? previousError.dateDownloaded : new Date(),
            errorOccurred: new Date(),
            youtubeDlVersion: program.isImport ? null : program.isRepair ? previousError.youtubeDlVersion : program.youtubeDlVersion,
            youtubeDlPath: program.isImport ? null : program.isRepair ? previousError.youtubeDlPath : parsed.env.YOUTUBE_DL_PATH,
            jobDocument: job._id,
            formatCode: program.isImport ? null : program.isRepair ? previousError.formatCode : job.formatCode,
            isAudioOnly: program.isImport ? null : program.isRepair ? previousError.isAudioOnly : job.isAudioOnly,
            urls: program.isImport ? null : program.isRepair ? previousError.urls : job.urls,
            arguments: program.isImport ? null : program.isRepair ? previousError.arguments : job.arguments,
            overrideUploader: program.isRepair ? previousError.overrideUploader : job.overrideUploader,
            imported: program.isRepair ? previousError.imported : program.isImport,
            scriptVersion: program.version(),
        }
        if (mongoose.connection.readyState === 1) {
            let error = await DownloadError.findOne({ videoPath: videoPath });
            if (error) {
                error.errorObject = JSON.stringify(err, Object.getOwnPropertyNames(err));
                error.errorOccurred = new Date();
            } else {
                error = new DownloadError(errorDocument);
            }
            await error.save();
            console.log('Recorded error successfully');
        } else {
            fs.ensureDirSync(parsed.env.OUTPUT_DIRECTORY);
            fs.appendFileSync(path.join(parsed.env.OUTPUT_DIRECTORY, 'errors.txt'), JSON.stringify(errorDocument) + '\r\n');
            console.error('Failed save error to the database. Saved error object to file');
        }
    } catch (err) {
        if (debug) oldError(err);
        try {
            fs.ensureDirSync(parsed.env.OUTPUT_DIRECTORY);
            fs.appendFileSync(path.join(parsed.env.OUTPUT_DIRECTORY, 'unknown_errors.txt'), videoPath + '\r\n');
            console.error('Failed to capture error. Saved video file name');
        } catch (err) {
            if (debug) oldError(err);
            console.error('Failed to record error');
        }
    }
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

const generateFileHash = async (filename) => {
    return new Promise((resolve, reject) => {
        if (parsed.env.SKIP_HASHING) return resolve(undefined);
        let shasum = crypto.createHash('md5');
        let readStream = fs.createReadStream(filename);
        readStream.on('data', (data) => {
            shasum.update(data);
        }).on('end', () => {
            resolve(shasum.digest('hex'));
        }).on('error', (err) => {
            reject(err);
        });
    });
}

const generateDataHash = (buffer) => {
    if (parsed.env.SKIP_HASHING) return undefined;
    return crypto.createHash('md5').update(buffer).digest('hex');
}

const getFileData = (filepath, mustExist = false, encoding = 'utf8') => {
    let data;
    try {
        data = fs.readFileSync(filepath, encoding);
    } catch (err) {
        if (mustExist || err.code !== 'ENOENT') {
            console.error(`Failed to read file: ${filepath}`);
            throw err;
        }
    }
    const md5 = data ? generateDataHash(data) : undefined;
    return [data, data?.length, md5];
}

const extensionFromUrl = (url) => {
    url = url.split('?')[0];
    url = url.split('#')[0];
    url = url.split('/').pop();
    if (url.includes('.')) {
        return url.split('.').pop();
    }
    return 'jpg';
}

const generateThumbnailFile = async (sourceData, width, height, filepath) => {
    try {
        const data = await sharp(sourceData)
            .resize({ width: width, height: height, fit: sharp.fit.inside })
            .jpeg({ quality: parsed.env.THUMBNAIL_QUALITY, chromaSubsampling: parsed.env.THUMBNAIL_CHROMA_SUBSAMPLING })
            .toBuffer();
        const filesize = data.length;
        const md5 = generateDataHash(data);
        const metadata = await sharp(data).metadata();
        fs.writeFileSync(filepath, data);
        return [filesize, md5, metadata.width, metadata.height];
    } catch (err) {
        console.error(`Failed to create resized thumbnail file: ${filepath}`);
        throw err;
    }
}

const doProbeSync = (file) => {
    let proc = spawnSync(
        parsed.env.FFPROBE_PATH || 'ffprobe',
        [
            '-hide_banner',
            '-loglevel',
            'fatal',
            '-show_error',
            '-show_format',
            '-show_streams',
            '-show_programs',
            '-show_chapters',
            '-show_private_data',
            '-print_format',
            'json',
            file
        ],
        { encoding: 'utf8' }
    );
    let probeData = [];
    let errData = [];
    let exitCode = null;

    probeData.push(proc.stdout);
    errData.push(proc.stderr);

    exitCode = proc.status;

    if (proc.error) throw new Error(proc.error);
    if (exitCode) throw new Error(errData.join(''));

    const parsedData = JSON.parse(probeData.join(''));

    return parsedData;
}

const chapterTimeToSeconds = text => {
    let seconds = 0;
    let i = 1;
    for (let unit of text.split(':').reverse()) {
        seconds += unit * i;
        i *= 60;
    }
    return seconds;
}
