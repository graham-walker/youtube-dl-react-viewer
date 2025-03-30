import React, { Component } from 'react';
import { Row, Col, Image } from 'react-bootstrap';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import VideoList from '../VideoList/VideoList';
import { UserContext } from '../../contexts/user.context';
import {
    dateToTimeSinceString,
    abbreviateNumber
} from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';
import axios from '../../utilities/axios.utility';
import Description from '../Video/Description/Description';
import parsedEnv from '../../parse-env';

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
                    document.title = `${res.data.playlist.name} - ${parsedEnv.REACT_APP_BRAND}`;
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    render() {
        const playlist = this.state.playlist;
        const statistics = playlist?.statistics;
        const uploaderName = playlist?.uploaderName;
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
                            <div className="playlist-header">
                                <div
                                    className="playlist-image bg-light mb-2"
                                >
                                    <Image
                                        src={getImage(video, 'thumbnail', 'medium')}
                                        onError={(e) => defaultImage(e, 'thumbnail')}
                                        style={{borderRadius: this.context.getSetting('useCircularAvatars') ? '0.5rem' : 0}}
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
                                {(!!uploaderName || playlist.description) && <hr />}
                                {!!uploaderName && <p className="fw-bold">{uploaderName}</p>}
                                {playlist.description && <Description text={playlist.description} />}
                            </div>
                        </Col>
                        <Col>
                            <VideoList
                                location={this.props.location}
                                url={`playlists/${this.props.match.params.extractor}/${this.props.match.params.id}`}
                                layout="playlist"
                                filter="relevance"
                                query={{ playlist: `"${this.state.playlist.name}"`, extractor: this.state.playlist.extractor }}
                                sidebar={true}
                            />
                        </Col>
                    </Row>
                </>}
            </PageLoadWrapper>
        );
    }
}
