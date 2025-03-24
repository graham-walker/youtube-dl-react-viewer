import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Spinner, Form, Button, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import InfiniteScroll from 'react-infinite-scroll-component';
import VideoPreview from '../VideoPreview/VideoPreview';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import { bytesToSizeString, secondsToDetailedString } from '../../utilities/format.utility';
import queryString from 'query-string';
import history from '../../utilities/history.utility';
import axios from '../../utilities/axios.utility';
import parsedEnv from '../../parse-env';

export default class VideoList extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            page: 0,
            loading: true,
            error: undefined,
            videos: [],
            hasMore: true,
            totals: undefined,
            randomVideo: undefined,
            sort: 'relevance',
        };
    }

    componentDidMount() {
        const parsed = queryString.parse(this.props.location.search);
        this.setState({ sort: parsed['sort'] }, () => {
            this.getVideos();
        });

        this.unlisten = history.listen((location) => {
            const parsed = queryString.parse(location.search);
            this.setState({ sort: parsed['sort'] || 'relevance' });
        });
    }

    componentWillUnmount() {
        if (this.unlisten) {
            this.unlisten();
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.location.pathname === '/'
            || this.props.location.pathname === '/videos'
        ) {
            let parsed = queryString.parse(this.props.location.search);
            document.title = parsed.search
                ? `${parsed.search} - ${parsedEnv.REACT_APP_BRAND}`
                : parsedEnv.REACT_APP_BRAND;
        }

        if (prevProps.location.search !== this.props.location.search) {
            this.setState({ page: 0, hasMore: true }, () => {
                this.getVideos();
            });
        }
    }

    handleInputChange = (e) => {
        e.preventDefault();
        this.setState({ [e.target.name]: e.target.value }, () => {
            const parsed = queryString.parse(this.props.location.search);
            const stringified = queryString.stringify({
                search: parsed?.search,
                sort: this.state['sort']
            });
            history.push(`${this.props.location.pathname}${stringified ? '?' + stringified : ''}`);
        });
    }

    getVideos = () => {
        axios
            .get(`/api/${this.props.url}/${this.state.page}${this.props.location.search}`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        videos: this.state.videos.concat(res.data.videos),
                        totals: res.data.totals ? res.data.totals : this.state.totals,
                        randomVideo: res.data?.randomVideo ?? undefined,
                        hasMore: (this.state.videos.length + res.data.videos.length) < (res.data.totals?.count ?? this.state.totals.count)
                    });
                }
            }).catch(err => {
                this.setState({ error: err });
            });

        this.setState({
            videos: this.state.page === 0 ? [] : this.state.videos,
            page: this.state.page + 1
        });
    }

    render() {
        const videos = this.state.videos.map(video =>
            <Col
                style={this.props?.layout === 'playlist' ? { flex: '0 0 100%', maxWidth: '100%' } : {}}
                className="mb-3 px-1"
                key={video.extractor + video.id}
            >
                <VideoPreview
                    video={video}
                    width={this.props?.layout === 'playlist' ? '168px' : '100%'}
                    small={this.props?.layout === 'playlist' ? true : false}
                    horizontal={this.props?.layout === 'playlist' ? true : false}
                    badge={this.state['sort']}
                    icon={this.props.url === 'videos/search' ? this.context.getSetting('useLargeLayout') : this.props.icon}
                    hideUploader={this.props.hideUploader}
                    watched={video.watchHistory ? true : false}
                    stopTime={video.watchHistory ? video.watchHistory.stopTime : undefined}
                />
            </Col>
        );

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading && <>
                    {!!this.props.stats &&
                        <>
                            <h1>
                                {this.state.totals.count.toLocaleString()} Video
                                {this.state.totals.count !== 1 && 's'}
                                {this.context.getSetting('hideShorts') && this.state.totals.shorts > 0 && ` (${this.state.totals.shorts.toLocaleString()} short${this.state.totals.shorts === 1 ? '' : 's'} hidden)`}
                            </h1>
                            <h5 className="mb-4">
                                {bytesToSizeString(this.state.totals.filesize,
                                    this.context.getSetting('reportBytesUsingIec')
                                )} - {secondsToDetailedString(this.state.totals.duration)}
                            </h5>
                        </>
                    }
                    {!!!this.props.stats && this.context.getSetting('hideShorts') && this.state.totals.shorts > 0 &&
                        <>
                            <h5 className="mb-4">{this.state.totals.shorts.toLocaleString()} short{this.state.totals.shorts !== 1 && 's'} hidden</h5>
                        </>
                    }
                    <Row className="mb-4 justify-content-between">
                        <Col xs="12" sm="auto">
                            <InputGroup className="mb-3">
                                <InputGroup.Text><FontAwesomeIcon className='me-1' icon="sort" />Sort by</InputGroup.Text>
                                <Form.Select
                                    name="sort"
                                    onChange={this.handleInputChange}
                                    value={this.state['sort']}
                                >
                                    <option value="relevance">Relevance</option>
                                    <option value="newest_date">Date Uploaded (Newest)</option>
                                    <option value="oldest_date">Date Uploaded (Oldest)</option>
                                    <option value="longest_duration">Duration (Longest)</option>
                                    <option value="shortest_duration">Duration (Shortest)</option>
                                    <option value="largest_size">Filesize (Largest)</option>
                                    <option value="smallest_size">Filesize (Smallest)</option>
                                    <option value="most_views">Views (Most)</option>
                                    <option value="least_views">Views (Least)</option>
                                    <option value="most_likes">Likes (Most)</option>
                                    <option value="least_likes">Likes (Least)</option>
                                    <option value="most_dislikes">Dislikes (Most)</option>
                                    <option value="least_dislikes">Dislikes (Least)</option>
                                    <option value="ratio_likes">Likes to Dislikes (Ratio)</option>
                                    <option value="ratio_dislikes">Dislikes to Likes (Ratio)</option>
                                    <option value="newest_download">Date Downloaded (Newest)</option>
                                    <option value="oldest_download">Date Downloaded (Oldest)</option>
                                </Form.Select>
                            </InputGroup>
                        </Col>
                        <Col className='ms-auto' xs="auto">
                            {!!this.state.randomVideo
                                ? <Button as={Link} to={`/videos/${this.state.randomVideo.extractor}/${this.state.randomVideo.id}`} >
                                    <FontAwesomeIcon icon="random" /> Random
                                </Button>
                                : <Button disabled={true}>
                                    <FontAwesomeIcon icon="random" /> Random
                                </Button>
                            }
                        </Col>
                    </Row>
                    <InfiniteScroll
                        dataLength={videos.length}
                        next={this.getVideos}
                        hasMore={this.state.hasMore}
                        loader={
                            <div className="text-center">
                                <Spinner animation="border" />
                            </div>
                        }
                        endMessage={
                            <p className="text-center fw-bold">
                                {this.state.totals.count === 0 ? 'No results found' : 'No more results'}
                            </p>
                        }
                        style={{ overflow: 'hidden' }}>
                        <Row
                            className={
                                this.context.getSetting('useLargeLayout')
                                    ? 'row-cols-xxxxl-5 row-cols-xxl-4 row-cols-xl-3 row-cols-md-2 row-cols-1'
                                    : 'row-cols-xxl-6 row-cols-xl-5 row-cols-lg-4 row-cols-md-3 row-cols-sm-2 row-cols-1'
                            }
                            style={{
                                marginLeft: '-0.25rem',
                                marginRight: '-0.25rem'
                            }}
                        >
                            {videos}
                        </Row>
                    </InfiniteScroll>
                </>}
            </PageLoadWrapper>
        );
    }
}
