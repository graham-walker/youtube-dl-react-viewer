import React, { Component } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { Row, Col, Image, Table, Badge, Tab, Nav, Form, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import MiniStatisticColumn from '../MiniStatisticsColumn/MiniStatisticsColumn';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import VideoPreview from '../VideoPreview/VideoPreview';
import Description from './Description/Description';
import { UserContext } from '../../contexts/user.context';
import { bytesToSizeString, abbreviateNumber, resolutionToBadge, getErrorMessage } from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';
import history from '../../utilities/history.utility';
import { createSearchLink } from '../../utilities/search.utility';
import ISO6391 from 'iso-639-1';
import videojs from 'video.js';
import axios from '../../utilities/axios.utility';
import { CommentsLoader } from './Comments/Comments';
import parsedEnv from '../../parse-env';
import ChatReplay from './ChatReplay/ChatReplay';
import ConfirmModal from '../ConfirmModal/ConfirmModal';
import AlertModal from '../AlertModal/AlertModal';
import ScreenshotButton from './ScreenshotButton/ScreenshotButton';
import TheaterModeButton from './TheaterModeButton/TheaterModeButton';
import AudioOnlyModeButton from './AudioOnlyModeButton/AudioOnlyModeButton';

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
            loop: localStorage.getItem('loop') === null ? false : localStorage.getItem('loop') === 'true',
            playNext: localStorage.getItem('playNext') === null ? false : localStorage.getItem('playNext') === 'true',
            spoofContentType: localStorage.getItem('spoofContentType') === null ? false : localStorage.getItem('spoofContentType') === 'true',
            redirect: false,
            playerTime: 0,
            showConfirm: false,
            showAlert: false,
            alertMessage: '',
            theaterMode: false,
            defaultVolumeSet: false,
            audioOnlyMode: false,
            audioOnlyModeDisabled: false,
        };
        this.videoRef = React.createRef();
        this.sponsorRef = React.createRef();
        this.playerRef = React.createRef();
        this.theaterModeButtonRef = React.createRef();
        this.audioOnlyModeButtonRef = React.createRef();
        this.preservedTimeRef = React.createRef();
        this.isAudioOnlyModeDisabledError = React.createRef();
    }

    componentDidMount() {
        this.getVideo();

        this.interval = setInterval(() => {
            if (this.player && !this.player.paused()) this.saveActivity();
        }, 10000);

        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // Use default theater and audio only mode
        this.setState({
            theaterMode: this.context.getPlayerSetting('enableDefaultTheaterMode'),
            audioOnlyMode: this.context.getPlayerSetting('enableDefaultAudioOnlyMode'),
        });
    }

    componentWillUnmount() {
        this.saveActivity();
        if (this.player) this.player.dispose();
        clearInterval(this.interval);
        if ('mediaSession' in navigator && 'MediaMetadata' in window) navigator.mediaSession.metadata = null;
        window.removeEventListener('resize', this.handleResize);
    }

    handleResize() {
        if (this.playerRef.current && this.state.video) {
            const theaterMode = this.state.theaterMode && window.innerWidth >= 1200;

            // Treat videos without a defined width and height as 16:9
            const videoWidth = this.state.video.width || 1920;
            const videoHeight = this.state.video.height || 1080;

            let newWidth = this.playerRef.current.parentNode.parentNode.offsetWidth - (window.innerWidth < 1200 ? 0 : 424); // 424 = width of the sidebar + grid gap
            if (theaterMode) newWidth = this.playerRef.current.parentNode.parentNode.offsetWidth;

            let newHeight = (videoHeight / videoWidth) * newWidth;

            const maxHeight = document.documentElement.clientHeight * (theaterMode ? 0.78 : 0.7);
            if (newHeight > maxHeight) {
                newWidth = (maxHeight / newHeight) * newWidth;
                newHeight = maxHeight;
            }

            this.playerRef.current.style.setProperty('--player-width', `${newWidth}px`);
            this.playerRef.current.style.setProperty('--player-height', `${newHeight}px`);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.location.pathname !==
            `/videos/${this.props.match.params.extractor}/${this.props.match.params.id}`
        ) {
            this.saveActivity();
            this.getVideo();
        }

        // Update the title of the theater mode button to say exit if it is enabled
        if (this.theaterModeButtonRef.current) {
            this.theaterModeButtonRef.current.updateText(this.state.theaterMode);
        }

        // Update the title of the audio only mode button to say disable if it is enabled
        if (this.audioOnlyModeButtonRef.current) {
            this.audioOnlyModeButtonRef.current.updateText(this.state.audioOnlyMode);
        }

        // Resize player on theater mode change
        if (prevState.theaterMode !== this.state.theaterMode) this.handleResize();

        // Reload player on audio only mode change
        if (prevState.audioOnlyMode !== this.state.audioOnlyMode) this.videoReady(true);
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

                    if (this.context.getSetting('enableSponsorblock')
                        && res.data.video.extractor === 'youtube'
                        && res.data.sponsorSegments
                    ) this.sponsorRef.current = res.data.sponsorSegments;

                    if (this.context.getSetting('enableReturnYouTubeDislike') && res.data.returnYouTubeDislikeVotes !== null) {
                        res.data.video.viewCount = res.data.returnYouTubeDislikeVotes.viewCount;
                        res.data.video.likeCount = res.data.returnYouTubeDislikeVotes.likes;
                        res.data.video.dislikeCount = res.data.returnYouTubeDislikeVotes.dislikes;
                    }

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
                        audioOnlyModeDisabled: res.data.audioOnlyModeDisabled,
                    }, () => {
                        this.handleResize();
                        document.title = `${res.data.video.title} - ${parsedEnv.REACT_APP_BRAND}`;

                        if ('mediaSession' in navigator && 'MediaMetadata' in window) {
                            navigator.mediaSession.metadata = new window.MediaMetadata({
                                title: res.data.video.title,
                                artist: res.data.video.uploader,
                                album: res.data.video.album,
                                artwork: [{ src: getImage(res.data.video, 'thumbnail', 'medium') }]
                            });
                        }

                        if (!this.player) {
                            this.player = videojs(this.videoRef.current, {
                                fluid: false,
                                autoplay: this.context.getPlayerSetting('autoplayVideo'),
                                playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3],
                                techOrder: ['html5'],
                                controlBar: {
                                    volumePanel: {
                                        inline: this.context.getPlayerSetting('volumeControlPosition') === 'inline',
                                    },
                                },
                            }, () => {
                                // Force the playback rate button to always show two decimal places so it does not shift the layout
                                const playbackRateButton = this.player.controlBar.playbackRateMenuButton;
                                playbackRateButton.updateLabel = function () {
                                    if (this.playbackRateSupported()) {
                                        const rate = this.player().playbackRate();
                                        this.labelEl_.textContent = rate.toFixed(2) + 'x';
                                    }
                                };
                                this.player.on('ratechange', function () {
                                    playbackRateButton.updateLabel();
                                });
                                playbackRateButton.updateLabel();

                                // Split the player control buttons into left and right groups
                                const durationDisplay = this.player.controlBar.getChild('DurationDisplay');
                                durationDisplay.el().insertAdjacentHTML('afterend', '<div class="custom-spacer"></div>');

                                // Add custom buttons to the player controls
                                const fullScreenButton = this.player.controlBar.getChild('FullscreenToggle');

                                // Add screenshot button
                                if (this.context.getPlayerSetting('enableScreenshotButton')) {
                                    const button = this.player.controlBar.addChild('ScreenshotButton', { behavior: this.context.getPlayerSetting('screenshotButtonBehavior') });
                                    this.player.controlBar.el().insertBefore(button.el(), fullScreenButton.el());
                                }

                                // Add audio only mode button
                                this.audioOnlyModeButtonRef.current = this.player.controlBar.addChild('AudioOnlyModeButton', {
                                    onClick: () => this.setState({ audioOnlyMode: !this.state.audioOnlyMode }),
                                });
                                this.player.controlBar.el().insertBefore(this.audioOnlyModeButtonRef.current.el(), fullScreenButton.el());

                                // Add theater mode button
                                this.theaterModeButtonRef.current = this.player.controlBar.addChild('TheaterModeButton', {
                                    onClick: () => this.setState({ theaterMode: !this.state.theaterMode }),
                                });
                                this.player.controlBar.el().insertBefore(this.theaterModeButtonRef.current.el(), fullScreenButton.el());

                                const playerControls = document.querySelector('.vjs-control-bar');
                                if (playerControls) {
                                    // Scale the player controls UI
                                    playerControls.style.fontSize = (this.context.getPlayerSetting('playerControlsScale') * 100) + '%';

                                    // Position the player controls below the video
                                    playerControls.classList.toggle('positioned-below', this.context.getPlayerSetting('playerControlsPosition') === 'under_video');
                                }

                                // Add extra margin below the video player if the player controls are positioned below the video
                                this.player.el().style.setProperty('--player-controls-offset',
                                    this.context.getPlayerSetting('playerControlsPosition') === 'under_video'
                                        ? `${34 * this.context.getPlayerSetting('playerControlsScale')}px` // 34 = 10px (default video.js font size) * 3.4em (default video.js controls height + progress control height)
                                        : '0px'
                                );

                                // Bypass the Video.js large play button and show the player controls before playback starts
                                this.player.el().classList.add('vjs-has-started');

                                // Show current time
                                if (this.context.getPlayerSetting('showCurrentTime')) this.player.el().classList.add('show-current-time');

                                // Hide remaining time
                                if (!this.context.getPlayerSetting('showRemainingTime')) this.player.el().classList.add('hide-remaining-time');

                                // Show/hide large play button
                                document.querySelector('.player-button.play-pause').classList.toggle('d-none', !this.context.getPlayerSetting('largePlayButtonEnabled'));

                                // Show/hide seek buttons
                                document.querySelectorAll('.player-button.skip-back, .player-button.skip-forwards')
                                    .forEach(button => button.classList.toggle('d-none', !this.context.getPlayerSetting('seekButtonsEnabled')));

                                // Set the default volume
                                if (!this.state.defaultVolumeSet) {
                                    this.player.volume(this.context.getPlayerSetting('defaultVolume'));
                                    this.setState({ defaultVolumeSet: true });
                                }

                                // Set the default playback rate
                                this.player.defaultPlaybackRate(this.context.getPlayerSetting('defaultPlaybackRate'));

                                // Configure the Video.js hotkeys plugin
                                this.player.hotkeys({
                                    volumeStep: 0.1,
                                    seekStep: 5,
                                    enableModifiersForNumbers: false,
                                    enableVolumeScroll: false,
                                });

                                // Load the video src
                                this.videoReady();

                                this.player.on('loadedmetadata', () => {
                                    // Resume playback
                                    if (this.preservedTimeRef.current) {
                                        // Step back an extra second because the estimated duration when transcoding audio doesn't exactly match the real duration
                                        this.player.currentTime(Math.max(this.preservedTimeRef.current - 1, 0));
                                        this.preservedTimeRef.current = null;
                                    } else if (this.state.resumeTime) {
                                        let resumeTime = Math.min(Math.max(this.player.duration() - 10, 0), this.state.resumeTime);
                                        this.player.currentTime(resumeTime);
                                    }

                                    // Mark sponsor segments
                                    if (this.sponsorRef.current) {
                                        for (let sponsor of this.sponsorRef.current) {
                                            if (this.context.getSetting('onlySkipLocked') && (sponsor.locked === 0 || sponsor.locked === null || sponsor.locked === false)) continue;

                                            if (!this.context.getSetting('skipSponsor') && sponsor.category === 'sponsor') continue;
                                            if (!this.context.getSetting('skipSelfpromo') && sponsor.category === 'selfpromo') continue;
                                            if (!this.context.getSetting('skipInteraction') && sponsor.category === 'interaction') continue;
                                            if (!this.context.getSetting('skipIntro') && sponsor.category === 'intro') continue;
                                            if (!this.context.getSetting('skipOutro') && sponsor.category === 'outro') continue;
                                            if (!this.context.getSetting('skipPreview') && sponsor.category === 'preview') continue;
                                            if (!this.context.getSetting('skipFiller') && sponsor.category === 'filler') continue;
                                            if (!this.context.getSetting('skipMusicOfftopic') && sponsor.category === 'music_offtopic') continue;

                                            let segmentElement = document.createElement('div');
                                            const left = (sponsor.segment[0] / sponsor.videoDuration) * 100;
                                            const width = ((sponsor.segment[1] - sponsor.segment[0]) / sponsor.videoDuration) * 100;
                                            segmentElement.innerHTML = `<div class="sponsor-segment sponsor-type-${sponsor.category}" style="left: ${left}%; width: ${width}%;"></div>`;
                                            document.getElementsByClassName('vjs-progress-holder')[0].appendChild(segmentElement.childNodes[0]);
                                        }
                                    }

                                    // Add chapter markers
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

                                        if (Math.ceil(currentTime) < Math.ceil(this.player.duration())) { // Fix playback getting stuck in a loop when skipping outros

                                            let skip = false;
                                            for (let sponsor of this.sponsorRef.current) {
                                                if (!this.context.getSetting('skipSponsor') && sponsor.category === 'sponsor') continue;
                                                if (!this.context.getSetting('skipSelfpromo') && sponsor.category === 'selfpromo') continue;
                                                if (!this.context.getSetting('skipInteraction') && sponsor.category === 'interaction') continue;
                                                if (!this.context.getSetting('skipIntro') && sponsor.category === 'intro') continue;
                                                if (!this.context.getSetting('skipOutro') && sponsor.category === 'outro') continue;
                                                if (!this.context.getSetting('skipPreview') && sponsor.category === 'preview') continue;
                                                if (!this.context.getSetting('skipFiller') && sponsor.category === 'filler') continue;
                                                if (!this.context.getSetting('skipMusicOfftopic') && sponsor.category === 'music_offtopic') continue;

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
                                    }

                                    this.setState({ playerTime: this.player.currentTime() })
                                });

                                this.player.on('pause', () => {
                                    this.saveActivity();
                                });

                                this.player.on('ended', () => {
                                    this.onVideoEnd();
                                });

                                this.player.on('error', () => {
                                    const errorElement = document.querySelector('.vjs-error-display .vjs-modal-dialog-content');
                                    if (this.isAudioOnlyModeDisabledError) {
                                        errorElement.innerHTML = `
                                            <div>
                                                <p class="mb-0">Audio only mode is disabled</p>
                                            </div>
                                        `;
                                    } else {
                                        const isSafariOrIos = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPhone|iPad|iPod/i.test(navigator.userAgent);
                                        errorElement.innerHTML = `
                                            <div>
                                                ${isSafariOrIos ? `<p>Playback in Safari/iOS is especially limited. <a href="${parsedEnv.REACT_APP_REPO_URL}#safariios-playback" target="_blank">Learn more<a/></p>` : ''}
                                                <p class="mb-0">A playback error has occurred, try:</p>
                                                <ul class="d-inline-block text-start">
                                                    <li><a id="spoofContentTypeLink" href="#">Enabling spoof type</a></li>
                                                    <li><a id="openInVlcLink" href="#">Opening the video in VLC</a></li>
                                                    <li>Using a different browser</li>
                                                    <li>Changing the format code and redownloading the video</li>
                                                </ul>
                                            </div>
                                        `;

                                        const spoofContentTypeLink = document.getElementById('spoofContentTypeLink');
                                        const openInVlcLink = document.getElementById('openInVlcLink');

                                        const handleSpoofContentTypeLinkClick = (e) => {
                                            e.preventDefault();
                                            document.getElementById('spoofContentType').click();
                                        };
                                        const handleOpenInVlcLinkClick = (e) => {
                                            e.preventDefault();
                                            document.getElementById('openInVlc').click();
                                        };

                                        spoofContentTypeLink.addEventListener('click', handleSpoofContentTypeLinkClick);
                                        openInVlcLink.addEventListener('click', handleOpenInVlcLinkClick);

                                        this.player.on('dispose', () => {
                                            spoofContentTypeLink?.removeEventListener('click', handleSpoofContentTypeLinkClick);
                                            openInVlcLink?.removeEventListener('click', handleOpenInVlcLinkClick);
                                        });
                                    }
                                });

                                this.player.on('userinactive', function () {
                                    document.querySelectorAll('.player-button').forEach(e => {
                                        e.classList.remove('player-button-visible');
                                        e.classList.add('player-button-hidden');
                                    });
                                });

                                this.player.on('useractive', function () {
                                    document.querySelectorAll('.player-button').forEach(e => {
                                        e.classList.add('player-button-visible');
                                        e.classList.remove('player-button-hidden');
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

    videoReady(preserveCurrentTime = false) {
        const video = this.state.video;
        if (!video) return;

        this.isAudioOnlyModeDisabledError = this.state.audioOnlyMode && this.state.audioOnlyModeDisabled;

        if (preserveCurrentTime) this.preservedTimeRef.current = this.player.currentTime();

        const baseSrc = `/${this.state.spoofContentType ? 'spoof' : 'static'}/videos/` + encodeURIComponent(video.directory) + '/';
        this.player.poster(getImage(this.state.video, 'thumbnail', 'medium'));
        this.player.src({
            src: (
                this.state.audioOnlyMode
                    ? `/api/transcode/${video.extractor}/${video.id}/audio_only`
                    : baseSrc + encodeURIComponent(video.videoFile.name)
            ),
            type: this.state.spoofContentType || video.videoFile.name.endsWith('.mkv') || this.state.audioOnlyMode
                ? (this.state.audioOnlyMode ? 'audio/mpeg' : 'video/webm')
                : undefined
        });

        for (let subtitle of video.subtitleFiles) {
            if (subtitle.language !== 'live_chat' && subtitle.language !== 'rechat') {
                this.player.addRemoteTextTrack({
                    kind: 'subtitles',
                    srclang: subtitle.language,
                    label: ISO6391.getName(subtitle.language) + (subtitle.isAutomatic ? ' (Automatic)' : ''),
                    src: baseSrc + encodeURIComponent(subtitle.name),
                }, false);
            }
        }
    }

    onVideoEnd() {
        this.saveActivity();
        if (!this.state.loop && this.state.playNext) {
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
            if (name === 'spoofContentType') this.videoReady(true);
        });
    }

    saveActivity() {
        if (this.context.getSetting('recordWatchHistory') && this.state.video && this.player) {
            let stopTime = this.player.currentTime();
            axios
                .post(`/api/activity/update`, {
                    eventType: 'watched',
                    videoId: this.state.video._id,
                    stopTime,
                })
                .catch(err => {
                    console.error(err);
                });
        }
    }

    render() {
        if (this.state.redirect) return <Redirect to="/" />

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

        let keepPlayerControlsVisible = this.context.getPlayerSetting('keepPlayerControlsVisible');

        // The player controls should also be kept visible if positioned under the video
        if (this.context.getPlayerSetting('playerControlsPosition') === 'under_video') {
            if (keepPlayerControlsVisible === 'never') keepPlayerControlsVisible = 'windowed';
            if (keepPlayerControlsVisible === 'fullscreen') keepPlayerControlsVisible = 'always';
        }

        // video.isAudioOnly only tells us if the audio only checkbox was enabled for the job which is why we also check for a vcodec
        const isAudioOnly = this.state.video?.isAudioOnly || this.state.video?.vcodec === 'none' || this.state.audioOnlyMode;

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading && <>
                    <div className={`video-grid${this.state.theaterMode ? ' theater-mode' : ''}`}>
                        <div className={`video-section keep-controls-open-${keepPlayerControlsVisible}${this.context.getSetting('useGradientEffect') ? '' : ' no-gradient'}${isAudioOnly ? ' is-audio-only' : ''}`}>
                            <div data-vjs-player ref={this.playerRef}>
                                <div
                                    className="player-button play-pause"
                                    onClick={() => {
                                        if (this.player.paused()) {
                                            this.player.play();
                                        } else {
                                            this.player.pause();
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon="play" />
                                    <FontAwesomeIcon icon="pause" />
                                </div>
                                <div
                                    className="player-button skip-back"
                                    onClick={() => {
                                        this.player.currentTime(Math.max(this.player.currentTime() - this.context.getPlayerSetting('backSeekButtonSeconds'), 0));
                                        this.player.play();
                                    }}
                                >
                                    <FontAwesomeIcon icon="rotate-left" />
                                    <div className='skip-amount'>{this.context.getPlayerSetting('backSeekButtonSeconds')}</div>
                                </div>
                                <div
                                    className="player-button skip-forwards"
                                    onClick={() => {
                                        this.player.currentTime(Math.min(this.player.currentTime() + this.context.getPlayerSetting('forwardSeekButtonSeconds'), this.player.duration()));
                                        this.player.play();
                                    }}
                                >
                                    <FontAwesomeIcon icon="rotate-right" />
                                    <div className='skip-amount'>{this.context.getPlayerSetting('forwardSeekButtonSeconds')}</div>
                                </div>
                                <video
                                    controls
                                    className="video-js vjs-big-play-centered mb-3"
                                    ref={this.videoRef}
                                    loop={this.state.loop}
                                    autoPlay={this.context.getPlayerSetting('autoplayVideo')}
                                    playsInline={true}
                                >
                                </video>
                            </div>
                        </div>
                        <div className='description-section'>
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
                                                    roundedCircle={this.context.getSetting('useCircularAvatars')}
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
                                                statistic={isNaN(parseFloat(video.fps, 10)) ? video.fps : parseFloat(video.fps, 10).toFixed(2)}
                                                detailedStatistic={video.fps}
                                            />
                                        }
                                        {!!video.videoFile.filesize &&
                                            <MiniStatisticColumn
                                                title="Filesize"
                                                icon="file"
                                                statistic={bytesToSizeString(video.videoFile.filesize, this.context.getSetting('reportBytesUsingIec'))}
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
                                href={`${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : ''}/static/videos/` + encodeURIComponent(video.directory).replace(/!/g, '%21') + '/' + encodeURIComponent(video.videoFile.name).replace(/!/g, '%21')}
                                download={video.videoFile.name}
                            >
                                <FontAwesomeIcon icon="download" /> Download
                            </Button>
                            <Button
                                variant="primary"
                                className="mb-2 me-2"
                                href={`${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : ''}/api/videos/${this.props.match.params.extractor}/${this.props.match.params.id}/?metadata=true`}
                                target="_blank"
                            >
                                <FontAwesomeIcon icon="database" /> Metadata
                            </Button>
                            <Button
                                id="openInVlc"
                                variant="primary"
                                className="mb-2 me-2"
                                href={'vlc://' + window.location.origin + '/static/videos/' + encodeURIComponent(video.directory).replace(/!/g, '%21') + '/' + encodeURIComponent(video.videoFile.name).replace(/!/g, '%21')}
                                onClick={() => {
                                    let warned = localStorage.getItem('seenVLCWarning') === null ? false : localStorage.getItem('seenVLCWarning') === 'true';
                                    if (!warned && window.innerWidth > 768) {
                                        this.setState({ showAlert: true, alertMessage: <>To open videos using the open in VLC button on PC/Mac you must register the vlc:// URL protocol. <a href={parsedEnv.REACT_APP_REPO_URL + '#how-do-i-open-videos-in-vlc'} target='_blank'>Learn more</a></> });
                                        localStorage.setItem('seenVLCWarning', 'true');
                                    }
                                }}
                            >
                                <FontAwesomeIcon icon="play" /> Open in VLC
                            </Button>
                            {this.state.localVideoPath && window.location.hostname === 'localhost' &&
                                <Button
                                    variant="primary"
                                    className="mb-2 me-2"
                                    href={'vlc://file:///' + encodeURI(this.state.localVideoPath).replace(/!/g, '%21')}
                                    onClick={() => {
                                        let warned = localStorage.getItem('seenVLCWarning') === null ? false : localStorage.getItem('seenVLCWarning') === 'true';
                                        if (!warned && window.innerWidth > 768) {
                                            this.setState({ showAlert: true, alertMessage: <>To open videos using the open in VLC button on PC/Mac you must register the vlc:// URL protocol. <a href={parsedEnv.REACT_APP_REPO_URL + '#how-do-i-open-videos-in-vlc'} target='_blank'>Learn more</a></> });
                                            localStorage.setItem('seenVLCWarning', 'true');
                                        }
                                    }}
                                >
                                    <FontAwesomeIcon icon="play" /> Open in VLC (local)
                                </Button>
                            }
                            <AlertModal
                                show={this.state.showAlert}
                                message={this.state.alertMessage}
                                onHide={() => this.setState({ showAlert: false })}
                            />
                            {this.context?.getSetting('isSuperuser') && <Button
                                onClick={() => this.setState({ showConfirm: true })}
                                variant="danger"
                                className="mb-2 me-2"
                            >
                                <FontAwesomeIcon icon="trash" /> Delete
                            </Button>}
                            <ConfirmModal
                                show={this.state.showConfirm}
                                onHide={() => this.setState({ showConfirm: false })}
                                onConfirm={(preventRedownload) => {
                                    this.setState({ showConfirm: false });
                                    axios
                                        .post(
                                            '/api/admin/delete/', {
                                            extractor: this.state.video.extractor,
                                            id: this.state.video.id,
                                            preventRedownload,
                                        }
                                        ).then(res => {
                                            this.setState({ redirect: true });
                                        }).catch(err => {
                                            console.error(err);
                                        });
                                }}
                                title="Delete video"
                                checkboxText="Prevent the video from being redownloaded"
                            />
                            {!!video.downloadedCommentCount &&
                                <>
                                    <hr />
                                    <CommentsLoader
                                        key={video.id + video.extractor}
                                        id={video.id}
                                        extractor={video.extractor}
                                        player={this.player}
                                        uploader={video?.uploader}
                                        commentCount={video.downloadedCommentCount}
                                    />
                                </>
                            }
                        </div>
                        <div className="recommendations-section">
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
                                                checked={this.state.playNext}
                                                type="switch"
                                                name="playNext"
                                                label="Play next"
                                                id="playNext"
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
                                            </div>
                                        </Form.Group>
                                    </Form>
                                    {video.extractor === 'youtube' && video.subtitleFiles.findIndex(subtitle => subtitle.language === 'live_chat' || subtitle.language === 'rechat') !== -1 && <ChatReplay id={video.id} extractor={video.extractor} time={this.state.playerTime} />}
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
                                                    {!!video.uploaderDocument &&
                                                        <Nav.Item>
                                                            <Nav.Link
                                                                eventKey="uploader"
                                                                onClick={() => { this.setState({ activeTab: 'uploader' }) }}
                                                                title={'Videos by ' + video.uploaderDocument.name}
                                                                className='video-list-tab'
                                                            >
                                                                <FontAwesomeIcon icon="user" /> Videos by {video.uploaderDocument.name}
                                                            </Nav.Link>
                                                        </Nav.Item>
                                                    }
                                                    {!!video.playlistDocument &&
                                                        <Nav.Item>
                                                            <Nav.Link
                                                                eventKey="playlist"
                                                                onClick={() => { this.setState({ activeTab: 'playlist' }) }}
                                                                title={video.playlistDocument.name}
                                                                className='video-list-tab'
                                                            >
                                                                <FontAwesomeIcon icon="list" /> {video.playlistDocument.name}
                                                            </Nav.Link>
                                                        </Nav.Item>
                                                    }
                                                    {!!video.jobDocument &&
                                                        <Nav.Item>
                                                            <Nav.Link
                                                                eventKey="job"
                                                                onClick={() => { this.setState({ activeTab: 'job' }) }}
                                                                title={'Downloaded by ' + video.jobDocument.name}
                                                                className='video-list-tab'
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
                                            watched={video.watchHistory ? true : false}
                                            stopTime={video.watchHistory ? video.watchHistory.stopTime : undefined}
                                        />
                                    )}
                                </>
                            }
                        </div>
                    </div>
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
        if (this.ref.current) this.ref.current.parentNode.scrollTop = this.ref.current.offsetTop;
    }

    componentDidUpdate(prevProps) {
        if (
            this.ref.current &&
            (
                this.props.activeVideo !== prevProps.activeVideo ||
                this.props.activeTab !== prevProps.activeTab
            )
        ) {
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
                            stopTime={video.watchHistory ? video.watchHistory.stopTime : undefined}
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
