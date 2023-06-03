import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Image, Table, Badge, Tab, Nav, Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import MiniStatisticColumn from '../MiniStatisticsColumn/MiniStatisticsColumn';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import VideoPreview from '../VideoPreview/VideoPreview';
import Description from './Description/Description';
import { UserContext } from '../../contexts/user.context';
import { bytesToSizeString, abbreviateNumber, resolutionToBadge } from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';
import history from '../../utilities/history.utility';
import { createSearchLink } from '../../utilities/search.utility';
import ISO6391 from 'iso-639-1';
import videojs from 'video.js';
import 'videojs-flash';
import axios from '../../utilities/axios.utility';
import Comments from './Comments/Comments';

export default class VideoPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: undefined,
            video: undefined,
            uploaderVideos: undefined,
            playlistVideos: undefined,
            jobVideos: undefined,
            uploaderVideosOffset: undefined,
            playlistVideosOffset: undefined,
            jobVideosOffset: undefined,
            similarVideos: undefined,
            activeTab: undefined,
            nextVideos: undefined,
            firstVideos: undefined,
            localVideoPath: undefined,
            resumeTime: undefined,
            activityDocument: undefined,
            loop: localStorage.getItem('loop') === null ? false : localStorage.getItem('loop') === 'true',
            autoplay: localStorage.getItem('autoplay') === null ? false : localStorage.getItem('autoplay') === 'true',
            spoofContentType: localStorage.getItem('spoofContentType') === null ? true : localStorage.getItem('spoofContentType') === 'true',
            keepControlsOpen: localStorage.getItem('keepControlsOpen') || 'never', // never, windowed, fullscreen, always
        };
        this.videoRef = React.createRef();
        this.sponsorRef = React.createRef();
    }

    componentDidMount() {
        this.getVideo();
        this.interval = setInterval(() => {
            if (this.player && !this.player.paused()) this.saveActivity();
        }, 10000);
    }

    componentWillUnmount() {
        this.saveActivity();
        if (this.player) this.player.dispose();
        clearInterval(this.interval);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.location.pathname !==
            `/videos/${this.props.match.params.extractor}/${this.props.match.params.id}`
        ) {
            this.saveActivity();
            this.getVideo();
        }
    }

    getVideo() {
        this.sponsorRef.current = null;
        for (let className of ['.sponsor-segment', '.chapter-section', '.chapter-marker']) document.querySelectorAll(className).forEach(e => e.remove());
        document.documentElement.style.setProperty('--chapter-title', '');

        axios
            .get(`/api/videos/${this.props.match.params.extractor}/${this.props.match.params.id}`)
            .then(res => {
                if (res.status === 200) {
                    window.scrollTo(0, 0);

                    if (this.context.user?.enableSponsorblock
                        && res.data.video.extractor === 'youtube'
                        && res.data.sponsorSegments
                    ) this.sponsorRef.current = res.data.sponsorSegments;

                    this.setState({
                        loading: false,
                        video: res.data.video,
                        uploaderVideos: res.data.uploaderVideos,
                        playlistVideos: res.data.playlistVideos,
                        jobVideos: res.data.jobVideos,
                        uploaderVideosOffset: res.data.uploaderVideosOffset,
                        playlistVideosOffset: res.data.playlistVideosOffset,
                        jobVideosOffset: res.data.jobVideosOffset,
                        similarVideos: res.data.similarVideos,
                        nextVideos: {
                            uploader: this.getNextVideo(res.data.video, res.data.uploaderVideos),
                            playlist: this.getNextVideo(res.data.video, res.data.playlistVideos),
                            job: this.getNextVideo(res.data.video, res.data.jobVideos),
                        },
                        firstVideos: {
                            uploader: res.data.firstUploaderVideo,
                            playlist: res.data.firstPlaylistVideo,
                            job: res.data.firstJobVideo,
                        },
                        activeTab: (
                            !this.state.activeTab
                            || (this.state.activeTab === 'uploader' && !res.data.uploaderVideos)
                            || (this.state.activeTab === 'playlist' && !res.data.playlistVideos)
                            || (this.state.activeTab === 'job' && !res.data.jobVideos)
                        )
                            ? res.data.uploaderVideos
                                ? 'uploader'
                                : res.data.playlistVideos
                                    ? 'playlist'
                                    : res.data.jobVideos
                                        ? 'job'
                                        : undefined
                            : this.state.activeTab,
                        localVideoPath: res.data.localVideoPath,
                        resumeTime: res.data.resumeTime,
                        activityDocument: res.data.activityDocument,
                    }, () => {
                        document.title = `${res.data.video.title} - ${window.documentTitle}`;

                        if (!this.player) {
                            this.player = videojs(this.videoRef.current, {
                                fluid: true,
                                autoplay: true,
                                playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3],
                                techOrder: ['html5', 'flash'],
                            }, () => {
                                this.player.hotkeys({
                                    volumeStep: 0.1,
                                    seekStep: 5,
                                    enableModifiersForNumbers: false,
                                });

                                this.videoReady();

                                this.player.on('loadedmetadata', () => {
                                    // Resume playback
                                    if (this.state.resumeTime) {
                                        let resumeTime = Math.min(Math.max(this.player.duration() - 10, 0), this.state.resumeTime);
                                        this.player.currentTime(resumeTime);
                                    }

                                    // Mark sponsor segments
                                    if (this.sponsorRef.current) {
                                        for (let sponsor of this.sponsorRef.current) {
                                            if (this.context.user.onlySkipLocked && sponsor.locked == 0) continue;

                                            if (!this.context.user.skipSponsor && sponsor.category === 'sponsor') continue;
                                            if (!this.context.user.skipSelfpromo && sponsor.category === 'selfpromo') continue;
                                            if (!this.context.user.skipInteraction && sponsor.category === 'interaction') continue;
                                            if (!this.context.user.skipIntro && sponsor.category === 'intro') continue;
                                            if (!this.context.user.skipOutro && sponsor.category === 'outro') continue;
                                            if (!this.context.user.skipPreview && sponsor.category === 'preview') continue;
                                            if (!this.context.user.skipFiller && sponsor.category === 'music_offtopic') continue;
                                            if (!this.context.user.skipMusicOfftopic && sponsor.category === 'filler') continue;

                                            let segmentElement = document.createElement('div');
                                            const left = (sponsor.segment[0] / sponsor.videoDuration) * 100;
                                            const width = ((sponsor.segment[1] - sponsor.segment[0]) / sponsor.videoDuration) * 100;
                                            segmentElement.innerHTML = `<div class="sponsor-segment sponsor-type-${sponsor.category}" style="left: ${left}%; width: ${width}%;"></div>`;
                                            document.getElementsByClassName('vjs-progress-holder')[0].appendChild(segmentElement.childNodes[0]);
                                        }
                                    }

                                    // Add chapters
                                    if (this.state.video.chapters && this.state.video.chapters.length > 0) {
                                        const duration = this.player.duration();
                                        for (let [i, chapter] of this.state.video.chapters.entries()) {
                                            let chapterSectionElement = document.createElement('div');

                                            const left = (chapter.start_time / duration) * 100;
                                            const width = ((chapter.end_time - chapter.start_time) / duration) * 100;

                                            let sectionLeft = `left: ${left}%;`;
                                            let sectionWidth = `width: ${width}%;`;

                                            if (i === 0) sectionLeft = `left: calc(${left}% - 10px);`;
                                            if (i === 0 || i === this.state.video.chapters.length - 1) sectionWidth = `width: calc(${width}% + 10px);`;

                                            chapterSectionElement.innerHTML = `<div class="chapter-section" style="${sectionLeft} ${sectionWidth}"></div>`;
                                            chapterSectionElement.childNodes[0].addEventListener('mouseenter', () => {
                                                document.documentElement.style.setProperty('--chapter-title', '"' + CSS.escape(chapter.title) + '"');
                                            });

                                            document.getElementsByClassName('vjs-progress-holder')[0].appendChild(chapterSectionElement.childNodes[0]);

                                            if (i > 0) {
                                                let chapterMarkerElement = document.createElement('div');
                                                chapterMarkerElement.innerHTML = `<div class="chapter-marker" style="left: ${left}%;"></div>`;
                                                document.getElementsByClassName('vjs-progress-holder')[0].appendChild(chapterMarkerElement.childNodes[0]);
                                            }
                                        }
                                    }
                                });

                                this.player.on('timeupdate', () => {
                                    // Skip sponsors
                                    if (this.sponsorRef.current) {
                                        let currentTime = this.player.currentTime();
                                        let skip = false;
                                        for (let sponsor of this.sponsorRef.current) {
                                            if (!this.context.user.skipSponsor && sponsor.category === 'sponsor') continue;
                                            if (!this.context.user.skipSelfpromo && sponsor.category === 'selfpromo') continue;
                                            if (!this.context.user.skipInteraction && sponsor.category === 'interaction') continue;
                                            if (!this.context.user.skipIntro && sponsor.category === 'intro') continue;
                                            if (!this.context.user.skipOutro && sponsor.category === 'outro') continue;
                                            if (!this.context.user.skipPreview && sponsor.category === 'preview') continue;
                                            if (!this.context.user.skipFiller && sponsor.category === 'music_offtopic') continue;
                                            if (!this.context.user.skipMusicOfftopic && sponsor.category === 'filler') continue;

                                            if (currentTime >= sponsor.segment[0] && currentTime < sponsor.segment[1]) {
                                                currentTime = sponsor.segment[1];
                                                skip = true;
                                            }
                                        }
                                        if (skip) {
                                            this.player.currentTime(currentTime);
                                            console.log('Skipped sponsor');
                                        }
                                    }
                                });

                                this.player.on('ended', () => {
                                    this.onVideoEnd();
                                });

                                this.player.on('error', function (e) {
                                    document.querySelector('.vjs-error-display .vjs-modal-dialog-content').innerHTML = 'An error has occurred. The default format code used to download videos can sometimes create videos with codecs individual browsers do not support. Try enabling spoof type, use a different browser, or change the format code and redownload. Firefox generally works.'
                                });

                                this.player.on('userinactive', function () {
                                    document.querySelectorAll('.skip-button').forEach(e => {
                                        e.classList.remove('skip-visible');
                                        e.classList.add('skip-hidden');
                                    });
                                });

                                this.player.on('useractive', function () {
                                    document.querySelectorAll('.skip-button').forEach(e => {
                                        e.classList.add('skip-visible');
                                        e.classList.remove('skip-hidden');
                                    });
                                });

                                this.forceUpdate();
                            });
                        } else {
                            this.videoReady();
                        }
                    });
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    getNextVideo(video, videoList) {
        if (!videoList) return undefined;
        for (let i = 0; i < videoList.length - 1; i++) {
            if (videoList[i].extractor === video.extractor
                && videoList[i].id === video.id
            ) return {
                extractor: videoList[i + 1].extractor,
                id: videoList[i + 1].id
            };
        }
        return undefined;
    }

    videoReady() {
        const video = this.state.video;
        const baseSrc = `/${this.state.spoofContentType ? 'transcoded' : 'static'}/videos/` + encodeURIComponent(video.directory) + '/';
        this.player.poster(getImage(this.state.video, 'thumbnail', 'medium'));
        this.player.src({
            src: baseSrc + encodeURIComponent(video.videoFile.name),
            type: this.state.spoofContentType || video.videoFile.name.endsWith('.mkv')
                ? 'video/webm'
                : undefined
        });

        for (let subtitle of video.subtitleFiles) {
            this.player.addRemoteTextTrack({
                kind: 'subtitles',
                srclang: subtitle.language,
                label: ISO6391.getName(subtitle.language) + (subtitle.isAutomatic ? ' (Automatic)' : ''),
                src: baseSrc + encodeURIComponent(subtitle.name),
            }, false);
        }
    }

    onVideoEnd() {
        this.saveActivity();
        if (!this.state.loop && this.state.autoplay) {
            const nextVideo = this.state.nextVideos[this.state.activeTab];
            const firstVideo = this.state.firstVideos[this.state.activeTab];
            if (nextVideo) {
                history.push(`/videos/${nextVideo.extractor}/${nextVideo.id}`);
            } else if (firstVideo) {
                if (firstVideo.extractor === this.state.video.extractor && firstVideo.id === this.state.video.id) {
                    this.player.currentTime(0);
                    this.player.play();
                } else {
                    history.push(`/videos/${firstVideo.extractor}/${firstVideo.id}`);
                }
            }
        }
    }

    handleInputChange = (e) => {
        var { name, checked } = e.target;
        localStorage.setItem(name, checked);
        this.setState({ [name]: checked }, () => {
            if (name === 'spoofContentType') this.videoReady();
        });
    }

    saveActivity() {
        if (this.context.user?.recordWatchHistory && this.player) {
            let stopTime = this.player.currentTime();
            axios
                .post(`/api/activity/record`, {
                    eventType: 'watched',
                    activityDocument: this.state.activityDocument,
                    stopTime,
                });
        }
    }

    render() {
        let video = this.state.video;
        let seriesData;
        if (video) {
            seriesData = <>
                <FontAwesomeIcon icon="tv" />
                {!!video.series && ' ' + video.series}
                {video.seasonNumber !== null ? ' S' + video.seasonNumber : false}
                {video.seasonNumber !== null && video.episodeNumber !== null ? <> &middot;</> : false}
                {video.episodeNumber !== null ? ' E' + video.episodeNumber : false}
            </>;
        }

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading && <>
                    <Row>
                        <Col className={`keep-controls-open-${this.state.keepControlsOpen}`}>
                            <div data-vjs-player>
                                <div
                                    className="skip-button skip-back"
                                    onClick={() => {
                                        this.player.currentTime(Math.max(this.player.currentTime() - 10, 0));
                                        this.player.play();
                                    }}
                                >
                                    <FontAwesomeIcon icon="rotate-left" />10
                                </div>
                                <div
                                    className="skip-button skip-forwards"
                                    onClick={() => {
                                        this.player.currentTime(Math.min(this.player.currentTime() + 10, this.player.duration()));
                                        this.player.play();
                                    }}
                                >
                                    <FontAwesomeIcon icon="rotate-right" />10
                                </div>
                                <video
                                    controls
                                    className="video-js vjs-big-play-centered mb-3"
                                    ref={this.videoRef}
                                    loop={this.state.loop}
                                >
                                </video>
                            </div>
                            {!!video.series || video.seasonNumber !== null || video.episodeNumber !== null || !!video.location
                                ? (!!video.series || video.seasonNumber !== null || video.episodeNumber !== null)
                                    ? !!video.series
                                        ? <Link to={createSearchLink(video.series)}>{seriesData}</Link>
                                        : <span className="text-muted">{seriesData}</span>
                                    : <Link to={createSearchLink(video.location)}>
                                        <FontAwesomeIcon icon="map-marker-alt" /> {video.location}
                                    </Link>
                                : video.hashtags.slice(0, 3).map((hashtag, i) =>
                                    <React.Fragment key={i}>
                                        {i > 0 && ', '}
                                        <Link to={createSearchLink(hashtag)}>
                                            {hashtag}
                                        </Link>
                                    </React.Fragment>
                                )
                            }

                            <h3 className="text-break">{video.title}</h3>
                            {video.altTitle && <h5 className="text-break text-muted">{video.altTitle}</h5>}
                            <hr />
                            <Row>
                                {!!video.uploaderDocument &&
                                    <Col
                                        xs="auto"
                                        className="mb-2"
                                    >
                                        <div className="media-container">
                                            <Link
                                                to={`/uploaders/${video.uploaderDocument.extractor}/${video.uploaderDocument.id}`}
                                                className="me-3"
                                            >
                                                <Image
                                                    width={48}
                                                    height={48}
                                                    src={getImage(video, 'avatar')}
                                                    onError={(e) => { defaultImage(e, 'avatar') }}
                                                    roundedCircle={this.context.user?.useCircularAvatars ?? true}
                                                />
                                            </Link>
                                            <div className="media-body">
                                                <Link
                                                    to={`/uploaders/${video.uploaderDocument.extractor}/${video.uploaderDocument.id}`}
                                                    className="text-dark video-title-link">
                                                    {video.uploaderDocument.name}
                                                </Link>
                                                <small className="text-muted d-block">
                                                    {video.uploaderDocument.statistics.totalVideoCount.toLocaleString()} video
                                                    {video.uploaderDocument.statistics.totalVideoCount !== 1 && 's'}
                                                </small>
                                            </div>
                                        </div>
                                    </Col>
                                }
                                <Col
                                    md="12"
                                    className="col-xxl-auto mx-sm-auto me-xxl-0 mb-2"
                                >
                                    <Row className="text-center justify-content-md-center">
                                        {!!video.uploadDate &&
                                            <MiniStatisticColumn
                                                title="Upload Date"
                                                icon="calendar-alt"
                                                statistic={new Date(video.uploadDate).toLocaleDateString()}
                                                detailedStatistic={new Date(video.uploadDate).toLocaleString()}
                                            />
                                        }
                                        {!!video.viewCount &&
                                            <MiniStatisticColumn
                                                title="View Count"
                                                icon="eye"
                                                statistic={abbreviateNumber(video.viewCount)}
                                                detailedStatistic={video.viewCount.toLocaleString() + ' views'}
                                            />
                                        }
                                        {!!video.likeCount &&
                                            <MiniStatisticColumn
                                                title="Like Count"
                                                icon="thumbs-up"
                                                statistic={abbreviateNumber(video.likeCount)}
                                                detailedStatistic={video.likeCount.toLocaleString() + ' likes'}
                                            />
                                        }
                                        {!!video.dislikeCount &&
                                            <MiniStatisticColumn
                                                title="Dislike Count"
                                                icon="thumbs-down"
                                                statistic={abbreviateNumber(video.dislikeCount)}
                                                detailedStatistic={video.dislikeCount.toLocaleString() + ' dislikes'}
                                            />
                                        }
                                        {!!video.resolution && video.resolution !== 'audio only' &&
                                            <MiniStatisticColumn
                                                title="Resolution"
                                                icon="camera"
                                                statistic={resolutionToBadge(video.width, video.height, false)}
                                                detailedStatistic={video.resolution}
                                            />
                                        }
                                        {!!video.fps &&
                                            <MiniStatisticColumn
                                                title="FPS"
                                                icon="tachometer-alt"
                                                statistic={video.fps}
                                            />
                                        }
                                        {!!video.videoFile.filesize &&
                                            <MiniStatisticColumn
                                                title="Filesize"
                                                icon="file"
                                                statistic={bytesToSizeString(video.videoFile.filesize,
                                                    this.context.user?.reportBytesUsingIec ?? true
                                                )}
                                                detailedStatistic={video.videoFile.filesize.toLocaleString() + ' bytes'}
                                            />
                                        }
                                        {!!video.ageLimit &&
                                            <MiniStatisticColumn
                                                title="Age Limit"
                                                icon="hand-paper"
                                                statistic={video.ageLimit}
                                            />
                                        }
                                        {!!video.webpageUrl &&
                                            <MiniStatisticColumn
                                                title="Webpage URL"
                                                icon="external-link-alt"
                                                statistic={
                                                    <a
                                                        href={video.webpageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {video.webpageUrl.replace('https://', '')
                                                            .replace('http://', '')
                                                            .replace('www.', '')
                                                            .split('/')
                                                            .shift()
                                                        }
                                                    </a>
                                                }
                                            />
                                        }
                                    </Row>
                                </Col>
                            </Row>
                            {!!video.description &&
                                <>
                                    <Description text={video.description} player={this.player} />
                                    <br />
                                </>
                            }
                            <Table borderless>
                                <tbody>
                                    {video.tags.length > 0 &&
                                        <TableStatistic statistic={
                                            video.tags.map((tag, i) =>
                                                <Link
                                                    to={createSearchLink(tag)}
                                                    key={i}
                                                >
                                                    <Badge className="me-1" bg="secondary">
                                                        {tag}
                                                    </Badge>
                                                </Link>
                                            )
                                        } title="Tags" />
                                    }
                                    {video.categories.length > 0 &&
                                        <TableStatistic statistic=
                                            {
                                                video.categories.map((category, i) =>
                                                    <Link
                                                        to={createSearchLink(category)}
                                                        key={i}
                                                    >
                                                        <Badge className="me-1" bg="secondary">
                                                            {category}
                                                        </Badge>
                                                    </Link>
                                                )
                                            }
                                            title="Categories"
                                        />
                                    }
                                    <TableStatistic statistic={video.series} title="Series" link />
                                    <TableStatistic statistic={video.season} title="Season" link />
                                    <TableStatistic statistic={video.seasonNumber} title="Season number" />
                                    <TableStatistic statistic={video.episode} title="Episode" link />
                                    <TableStatistic statistic={video.episodeNumber} title="Episode number" />
                                    <TableStatistic statistic={video.location} title="Location" link />
                                    <TableStatistic statistic={video.track} title="Track" link />
                                    <TableStatistic statistic={video.trackNumber} title="Track number" />
                                    <TableStatistic statistic={video.artist} title="Artist" link />
                                    <TableStatistic statistic={video.genre} title="Genre" link />
                                    <TableStatistic statistic={video.album} title="Album" link />
                                    <TableStatistic statistic={video.albumType} title="Album type" link />
                                    <TableStatistic statistic={video.albumArtist} title="Album artist" link />
                                    <TableStatistic statistic={video.discNumber} title="Disc number" />
                                    <TableStatistic statistic={video.releaseYear} title="Release year" />
                                    <TableStatistic statistic={video.license} title="License" />
                                </tbody>
                            </Table>
                            <hr />
                            <Table borderless>
                                <tbody>
                                    <TableStatistic statistic={new Date(video.dateDownloaded).toLocaleString()} title="Downloaded" />
                                    <TableStatistic statistic={video.format} title="Format" />
                                    <TableStatistic statistic={video.vcodec} title="Vcodec" />
                                    <TableStatistic statistic={video.acodec} title="Acodec" />
                                    <TableStatistic statistic={video.ext} title="Container" />
                                    <TableStatistic statistic={!!video.tbr && video.tbr.toLocaleString()} unit="Kbps" title="Total bitrate" />
                                    <TableStatistic statistic={!!video.vbr && video.vbr.toLocaleString()} unit="Kbps" title="Video bitrate" />
                                    <TableStatistic statistic={!!video.abr && video.abr.toLocaleString()} unit="Kbps" title="Audio bitrate" />
                                    <TableStatistic statistic={!!video.asr && video.asr.toLocaleString()} unit="Hertz" title="Audio sampling rate" />
                                </tbody>
                            </Table>
                            <hr />
                            <Button
                                variant="primary"
                                className="mb-2 me-2"
                                href={'/static/videos/' + encodeURIComponent(video.directory).replace(/!/g, '%21') + '/' + encodeURIComponent(video.videoFile.name).replace(/!/g, '%21')}
                                download={video.videoFile.name}
                            >
                                <FontAwesomeIcon icon="download" /> Download
                            </Button>
                            <Button
                                variant="primary"
                                className="mb-2 me-2"
                                href={`/api/videos/${this.props.match.params.extractor}/${this.props.match.params.id}`}
                                target="_blank"
                            >
                                <FontAwesomeIcon icon="database" /> Metadata
                            </Button>
                            <Button
                                variant="primary"
                                className="mb-2 me-2"
                                href={'vlc://' + window.location.origin + '/static/videos/' + encodeURIComponent(video.directory).replace(/!/g, '%21') + '/' + encodeURIComponent(video.videoFile.name).replace(/!/g, '%21')}
                            >
                                <FontAwesomeIcon icon="play" /> Open in VLC
                            </Button>
                            {this.state.localVideoPath && window.location.hostname === 'localhost' &&
                                <Button
                                    variant="primary"
                                    className="mb-2"
                                    href={'vlc://file:///' + encodeURI(this.state.localVideoPath).replace(/!/g, '%21')}
                                >
                                    <FontAwesomeIcon icon="play" /> Open in VLC (local)
                                </Button>
                            }
                            <hr />
                            <Comments comments={video?.comments} player={this.player} uploader={video?.uploader} />
                        </Col>
                        <Col
                            xs="12"
                            className="recommendations-column"
                        >
                            {(this.state.uploaderVideos || this.state.playlistVideos || this.state.jobVideos) &&
                                <>
                                    <Form className="form-inline mb-1">
                                        <Form.Group>
                                            <Form.Check
                                                checked={this.state.loop}
                                                type="switch"
                                                name="loop"
                                                label="Loop"
                                                id="loop"
                                                onChange={this.handleInputChange}
                                                className="me-2"
                                            />
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Check
                                                checked={this.state.autoplay}
                                                type="switch"
                                                name="autoplay"
                                                label="Autoplay"
                                                id="autoplay"
                                                onChange={this.handleInputChange}
                                                disabled={this.state.loop}
                                                className="me-2"
                                            />
                                        </Form.Group>
                                        <Form.Group>
                                            <div className="d-flex align-items-center">
                                                <Form.Check
                                                    checked={this.state.spoofContentType}
                                                    type="switch"
                                                    name="spoofContentType"
                                                    label="Spoof type"
                                                    id="spoofContentType"
                                                    onChange={this.handleInputChange}
                                                />
                                                <OverlayTrigger
                                                    placement="bottom"
                                                    delay={{ show: 250, hide: 400 }}
                                                    overlay={
                                                        <Tooltip>
                                                            Spoof the content type of .MKV files to attempt to play them in the browser. Works on some browsers (Firefox)
                                                        </Tooltip>
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        className="ms-1 text-muted"
                                                        icon="info-circle"
                                                    />
                                                </OverlayTrigger>
                                            </div>
                                        </Form.Group>
                                    </Form>
                                    <div className="card mb-3">
                                        <Tab.Container
                                            defaultActiveKey={this.state.activeTab}
                                            activeKey={this.state.activeTab}
                                        >
                                            <div className="card-body">
                                                <Nav
                                                    variant="pills"
                                                    className="flex-column"
                                                >
                                                    {!!video.uploader &&
                                                        <Nav.Item
                                                            className="w-100"
                                                            style={{ whiteSpace: 'nowrap' }}
                                                        >
                                                            <Nav.Link
                                                                eventKey="uploader"
                                                                onClick={(e) => { this.setState({ activeTab: 'uploader' }) }}
                                                                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                                title={'Videos by ' + video.uploader}
                                                            >
                                                                <FontAwesomeIcon icon="user" /> Videos by {video.uploader}
                                                            </Nav.Link>
                                                        </Nav.Item>
                                                    }
                                                    {!!video.playlist &&
                                                        <Nav.Item
                                                            className="w-100"
                                                            style={{ whiteSpace: 'nowrap' }}
                                                        >
                                                            <Nav.Link
                                                                eventKey="playlist"
                                                                onClick={(e) => { this.setState({ activeTab: 'playlist' }) }}
                                                                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                                title={video.playlist}
                                                            >
                                                                <FontAwesomeIcon icon="list" /> {video.playlist}
                                                            </Nav.Link>
                                                        </Nav.Item>
                                                    }
                                                    {!!video.jobDocument &&
                                                        <Nav.Item
                                                            className="w-100"
                                                            style={{ whiteSpace: 'nowrap' }}
                                                        >
                                                            <Nav.Link
                                                                eventKey="job"
                                                                onClick={(e) => { this.setState({ activeTab: 'job' }) }}
                                                                style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                                title={'Downloaded by ' + video.jobDocument.name}
                                                            >
                                                                <FontAwesomeIcon icon="briefcase" /> Downloaded by {video.jobDocument.name}
                                                            </Nav.Link>
                                                        </Nav.Item>
                                                    }
                                                </Nav>
                                            </div>
                                            <Tab.Content>
                                                {!!video.uploaderDocument &&
                                                    <>
                                                        <Tab.Pane eventKey="uploader">
                                                            <VideoScroller
                                                                videos={this.state.uploaderVideos}
                                                                offset={this.state.uploaderVideosOffset}
                                                                activeVideo={video}
                                                                activeTab={this.state.activeTab}
                                                            />
                                                            <div className="text-center my-1">
                                                                <Link to={`/uploaders/${video.uploaderDocument.extractor}/${video.uploaderDocument.id}`}>
                                                                    View All
                                                                </Link>
                                                            </div>
                                                        </Tab.Pane>
                                                    </>
                                                }
                                                {!!video.playlistDocument &&
                                                    <Tab.Pane eventKey="playlist">
                                                        <VideoScroller
                                                            videos={this.state.playlistVideos}
                                                            offset={this.state.playlistVideosOffset}
                                                            activeVideo={video}
                                                            activeTab={this.state.activeTab}
                                                        />
                                                        <div className="text-center my-1">
                                                            <Link to={`/playlists/${video.playlistDocument.extractor}/${video.playlistDocument.id}`}>
                                                                View All
                                                            </Link>
                                                        </div>
                                                    </Tab.Pane>
                                                }
                                                {!!video.jobDocument &&
                                                    <Tab.Pane eventKey="job">
                                                        <VideoScroller
                                                            videos={this.state.jobVideos}
                                                            offset={this.state.jobVideosOffset}
                                                            activeVideo={video}
                                                            activeTab={this.state.activeTab}
                                                        />
                                                        <div className="text-center my-1">
                                                            <Link to={`/jobs/${video.jobDocument._id}`}>
                                                                View All
                                                            </Link>
                                                        </div>
                                                    </Tab.Pane>
                                                }
                                            </Tab.Content>
                                        </Tab.Container>
                                    </div>
                                </>
                            }
                            {this.state.similarVideos &&
                                <>
                                    <p className="fw-bold">Similar Videos</p>
                                    {this.state.similarVideos.map(video =>
                                        <VideoPreview
                                            className="mb-2"
                                            video={video}
                                            width="168px"
                                            small
                                            horizontal
                                            key={video.extractor + video.id}
                                        />
                                    )}
                                </>
                            }
                        </Col>
                    </Row>
                </>}
            </PageLoadWrapper>
        );
    }
}

class VideoScroller extends Component {
    constructor(props) {
        super(props);
        this.ref = React.createRef();
    }

    componentDidMount() {
        this.ref.current.parentNode.scrollTop = this.ref.current.offsetTop;
    }

    componentDidUpdate(prevProps) {
        if (this.props.activeVideo !== prevProps.activeVideo ||
            this.props.activeTab !== prevProps.activeTab) {
            this.ref.current.parentNode.scrollTop = this.ref.current.offsetTop;
        }
    }

    render() {
        return (
            <div
                className="position-relative"
                style={{
                    height: '400px',
                    overflowY: 'auto'
                }}
            >
                {this.props.videos.map((video, i) => {
                    let active = video.extractor + video.id === this.props.activeVideo.extractor + this.props.activeVideo.id;
                    return <div
                        className={`py-1${active ? ' bg-light' : ''}`}
                        ref={active ? this.ref : undefined}
                        key={video.extractor + video.id}
                    >
                        <VideoPreview
                            video={video}
                            width="100px"
                            horizontal
                            small
                            simple
                        >
                            <small
                                className="text-muted m-auto text-center"
                                style={{ width: '28px' }}
                            >
                                {active
                                    ? <FontAwesomeIcon icon="caret-right" />
                                    : i + 1 + this.props.offset
                                }
                            </small>
                        </VideoPreview>
                    </div>
                })}
            </div>
        );
    }
}

const TableStatistic = (props) => {
    return (
        !!props.statistic
            ? <tr>
                <th style={{ whiteSpace: 'nowrap', padding: '0.25rem 0.75rem' }}>{props.title}</th>
                <td className="w-100" style={{ padding: '0.25rem 0.75rem' }}>
                    {!!props.link
                        ? <Link to={createSearchLink(props.statistic)}>
                            {props.statistic}{!!props.unit && ' ' + props.unit}
                        </Link>
                        : <>{props.statistic}{!!props.unit && ' ' + props.unit}</>
                    }
                </td>
            </tr>
            : null
    );
}
