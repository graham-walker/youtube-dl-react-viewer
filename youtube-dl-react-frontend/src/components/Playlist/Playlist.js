import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Image, Media } from 'react-bootstrap';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import VideoList from '../VideoList/VideoList';
import { UserContext } from '../../contexts/user.context';
import {
    dateToTimeSinceString,
    abbreviateNumber
} from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';
import axios from '../../utilities/axios.utility';

export default class Playlist extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: undefined,
            playlist: undefined,
        };
    }

    componentDidMount() {
        axios
            .get(`/api/playlists/${this.props.match.params.extractor}/${this.props.match.params.id}`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        playlist: res.data.playlist,
                    });
                    document.title = `${res.data.playlist.name} - ${window.documentTitle}`;
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    render() {
        const playlist = this.state.playlist;
        const statistics = playlist?.statistics;
        const uploader = playlist?.uploaderDocument;
        const video = statistics?.newestVideo;

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading && <>
                    <Row className="justify-content-center">
                        <Col
                            xs="12"
                            className="playlist-column mb-4"
                        >
                            <div style={{ position: 'sticky', top: 'calc(56px + 1.5rem)' }}>
                                <div
                                    className="bg-light mb-2"
                                    style={{
                                        width: '100%',
                                        paddingBottom: '56.25%',
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    <Image
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                        }}
                                        className="w-100"
                                        src={getImage(video, 'thumbnail', 'medium')}
                                        onLoad={(e) => e.target.parentElement.style.setProperty('background-color', '#000', 'important')}
                                        onError={(e) => defaultImage(e, 'thumbnail')}
                                    />
                                </div>
                                <h3>{playlist.name}</h3>
                                <p className="text-muted">
                                    <span title={statistics.totalVideoCount.toLocaleString() + ' videos'}>
                                        {abbreviateNumber(statistics.totalVideoCount)} video{statistics.totalVideoCount !== 1 && 's'}
                                    </span>
                                    <> &middot; </>
                                    <span title={statistics.totalViewCount.toLocaleString() + ' views'}>
                                        {abbreviateNumber(statistics.totalViewCount)} view{statistics.totalViewCount !== 1 && 's'}
                                    </span>
                                    <> &middot; </>
                                    <span title={new Date(statistics.newestVideoDateUploaded).toLocaleString()}>
                                        Updated {dateToTimeSinceString(new Date(statistics.newestVideoDateUploaded))}
                                    </span>
                                </p>
                                {!!uploader && <>
                                    <hr />
                                    <Media>
                                        <Link
                                            to={`/uploaders/${uploader.extractor}/${uploader.id}`}
                                            className="mr-3"
                                        >
                                            <Image
                                                width={48}
                                                height={48}
                                                src={getImage(uploader, 'avatar')}
                                                onError={(e) => { defaultImage(e, 'avatar') }}
                                                roundedCircle={this.context.user?.useCircularAvatars ?? true}
                                            />
                                        </Link>
                                        <Media.Body className="align-self-center">
                                            <Link
                                                to={`/uploaders/${uploader.extractor}/${uploader.id}`}
                                                className="text-dark font-weight-bold">
                                                {uploader.name}
                                            </Link>
                                        </Media.Body>
                                    </Media>
                                </>}
                            </div>
                        </Col>
                        <Col>
                            <VideoList
                                location={this.props.location}
                                url={`playlists/${this.props.match.params.extractor}/${this.props.match.params.id}`}
                                layout="playlist"
                                filter="relevance"
                            />
                        </Col>
                    </Row>
                </>}
            </PageLoadWrapper>
        );
    }
}
