import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Media, Image, Table, Badge, Tab, Nav, Form, Button } from 'react-bootstrap';
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
            localVideoPath: undefined,
            loop: localStorage.getItem('loop') === 'true' ?? false,
            autoplay: localStorage.getItem('autoplay') === 'true' ?? false,
            transcodeVideos: localStorage.getItem('transcodeVideos') === 'true' ?? false,
        };
        this.videoRef = React.createRef();
    }

    componentDidMount() {
        this.getVideo();
    }

    componentWillUnmount() {
        if (this.player) {
            this.player.dispose();
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.location.pathname !==
            `/videos/${this.props.match.params.extractor}/${this.props.match.params.id}`
        ) this.getVideo();
    }

    getVideo() {
        axios
            .get(`/api/videos/${this.props.match.params.extractor}/${this.props.match.params.id}`)
            .then(res => {
                if (res.status === 200) {
                    window.scrollTo(0, 0);

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
                    }, () => {
                        document.title = `${res.data.video.title} - ${window.documentTitle}`;

                        if (!this.player) {
                            this.player = videojs(this.videoRef.current, {
                                fluid: true,
                                autoplay: true,
                                playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
                                techOrder: ['html5', 'flash'],
                            }, () => {
                                this.player.hotkeys({
                                    volumeStep: 0.1,
                                    seekStep: 5,
                                    enableModifiersForNumbers: false,
                                });

                                this.videoReady();

                                this.player.on('ended', () => {
                                    this.onVideoEnd();
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
        const baseSrc = `/${this.state.transcodeVideos ? 'transcoded' : 'static'}/videos/` + encodeURIComponent(video.directory) + '/';
        this.player.poster(getImage(this.state.video, 'thumbnail', 'medium'));
        this.player.src({
            src: baseSrc + encodeURIComponent(video.videoFile.name),
            type: this.state.transcodeVideos || video.videoFile.name.endsWith('.mkv')
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
        if (!this.state.loop && this.state.autoplay) {
            const nextVideo = this.state.nextVideos[this.state.activeTab];
            if (nextVideo) history.push(`/videos/${nextVideo.extractor}/${nextVideo.id}`);
        }
    }

    handleInputChange = (e) => {
        var { name, checked } = e.target;
        localStorage.setItem(name, checked);
        this.setState({ [name]: checked }, () => {
            if (name === 'transcodeVideos') this.videoReady();
        });
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
                        <Col>
                            <div data-vjs-player>
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
                                        <Media>
                                            <Link
                                                to={`/uploaders/${video.uploaderDocument.extractor}/${video.uploaderDocument.id}`}
                                                className="mr-3"
                                            >
                                                <Image
                                                    width={48}
                                                    height={48}
                                                    src={getImage(video, 'avatar')}
                                                    onError={(e) => { defaultImage(e, 'avatar') }}
                                                    roundedCircle={this.context.user?.useCircularAvatars ?? true}
                                                />
                                            </Link>
                                            <Media.Body>
                                                <Link
                                                    to={`/uploaders/${video.uploaderDocument.extractor}/${video.uploaderDocument.id}`}
                                                    className="text-dark">
                                                    {video.uploaderDocument.name}
                                                </Link>
                                                <small className="text-muted d-block">
                                                    {video.uploaderDocument.statistics.totalVideoCount.toLocaleString()} video
                                                    {video.uploaderDocument.statistics.totalVideoCount !== 1 && 's'}
                                                </small>
                                            </Media.Body>
                                        </Media>
                                    </Col>
                                }
                                <Col
                                    md="12"
                                    className="col-xxl-auto mx-sm-auto mr-xxl-0 mb-2"
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
                                        {!!video.resolution &&
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
                                                    <Badge className="mr-1" variant="secondary">
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
                                                        <Badge className="mr-1" variant="secondary">
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
                                className="mb-2 mr-2"
                                href={'/static/videos/' + encodeURIComponent(video.directory).replace(/!/g, '%21') + '/' + encodeURIComponent(video.videoFile.name).replace(/!/g, '%21')}
                                download={video.videoFile.name}
                            >
                                <FontAwesomeIcon icon="download" /> Download
                                    </Button>
                            <Button
                                variant="primary"
                                className="mb-2 mr-2"
                                href={'vlc://' + window.location.origin + '/static/videos/' + encodeURIComponent(video.directory).replace(/!/g, '%21') + '/' + encodeURIComponent(video.videoFile.name).replace(/!/g, '%21')}
                            >
                                <FontAwesomeIcon icon="play" /> Open in VLC
                                    </Button>
                            {window.location.hostname === 'localhost' &&
                                <Button
                                    variant="primary"
                                    className="mb-2"
                                    href={'vlc://file:///' + encodeURI(this.state.localVideoPath).replace(/!/g, '%21')}
                                >
                                    <FontAwesomeIcon icon="play" /> Open in VLC (local)
                                        </Button>
                            }
                        </Col>
                        <Col
                            xs="12"
                            className="recommendations-column"
                        >
                            {(this.state.uploaderVideos || this.state.playlistVideos || this.state.jobVideos) &&
                                <>
                                    <Form inline className="mb-1">
                                        <Form.Group>
                                            <Form.Check
                                                checked={this.state.loop}
                                                type="switch"
                                                name="loop"
                                                label="Loop"
                                                id="loop"
                                                onChange={this.handleInputChange}
                                                className="mr-2"
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
                                                className="mr-2"
                                            />
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Check
                                                checked={this.state.transcodeVideos}
                                                type="switch"
                                                name="transcodeVideos"
                                                label="Transcode video"
                                                id="transcodeVideos"
                                                onChange={this.handleInputChange}
                                            />
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
                                                                onSelect={(e) => { this.setState({ activeTab: e }) }}
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
                                                                onSelect={(e) => { this.setState({ activeTab: e }) }}
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
                                                                onSelect={(e) => { this.setState({ activeTab: e }) }}
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
                                    <p className="font-weight-bold">Similar Videos</p>
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
