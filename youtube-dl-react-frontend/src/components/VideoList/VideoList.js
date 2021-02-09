import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Spinner, Form, Button, Accordion, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import InfiniteScroll from 'react-infinite-scroll-component';
import VideoPreview from '../VideoPreview/VideoPreview';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import { bytesToSizeString, secondsToDetailedString } from '../../utilities/format.utility';
import queryString from 'query-string';
import history from '../../utilities/history.utility';
import axios from '../../utilities/axios.utility';

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
        let parsed = queryString.parse(this.props.location.search);
        this.setState({ sort: parsed['sort'] }, () => {
            this.getVideos();
        });
    }

    componentDidUpdate(prevProps) {
        if (this.props.location.pathname === '/'
            || this.props.location.pathname === '/videos'
        ) {
            let parsed = queryString.parse(this.props.location.search);
            document.title = parsed.search
                ? `${parsed.search} - ${window.documentTitle}`
                : window.documentTitle;
        }

        if (prevProps.location.search !== this.props.location.search) {
            this.setState({ page: 0, hasMore: true }, () => {
                this.getVideos();
            });
        }
    }

    onChangeSubmit = (e) => {
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
                        randomVideo: res.data?.randomVideo ?? this.state.randomVideo,
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
                className="mb-3 px-1 col-xxl-2"
                lg="3"
                sm="6"
                xs="12"
                key={video.extractor + video.id}
            >
                <VideoPreview
                    video={video}
                    width="100%"
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
                            </h1>
                            <h5 className="mb-4">
                                {bytesToSizeString(this.state.totals.filesize,
                                    this.context.user?.reportBytesUsingIec ?? true
                                )} - {secondsToDetailedString(this.state.totals.duration)}
                            </h5>
                        </>
                    }
                    <Accordion className="mb-4">
                        <Row>
                            <Col className="mb-2 mb-sm-0">
                                <Accordion.Toggle as={Button} eventKey="0">
                                    <><FontAwesomeIcon icon="filter" /> Filter</>
                                </Accordion.Toggle>
                            </Col>
                            {this.state.randomVideo &&
                                <Col className="col-12 col-sm-auto">
                                    <Link to={`/videos/${this.state.randomVideo.extractor}/${this.state.randomVideo.id}`}>
                                        <Button>
                                            <FontAwesomeIcon icon="random" /> Random
                                        </Button>
                                    </Link>
                                </Col>
                            }
                        </Row>
                        <Accordion.Collapse eventKey="0">
                            <>
                                <Card className="mt-4">
                                    <Card.Body>
                                        <Form
                                            className="mr-2"
                                            onSubmit={this.onSubmit}
                                        >
                                            <Form.Group>
                                                <Form.Label>Sort By</Form.Label>
                                                <Form.Control
                                                    as="select"
                                                    id="a"
                                                    name="sort"
                                                    onChange={this.onChangeSubmit}
                                                    value={this.state['sort']}
                                                >
                                                    <option value="relevance">Relevance</option>
                                                    <option value="newest_date">Uploaded (Newest)</option>
                                                    <option value="oldest_date">Uploaded (Oldest)</option>
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
                                                </Form.Control>
                                            </Form.Group>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </>
                        </Accordion.Collapse>
                    </Accordion>
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
                            <p className="text-center font-weight-bold">
                                {this.state.totals.count === 0 ? 'No results found' : 'No more results'}
                            </p>
                        }
                        style={{ overflow: 'hidden' }}>
                        <Row
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
