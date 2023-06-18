import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Image } from 'react-bootstrap';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import Pageinator from '../Pageinator/Pageinator';
import { UserContext } from '../../contexts/user.context';
import { bytesToSizeString, dateToTimeSinceString } from '../../utilities/format.utility';
import axios from '../../utilities/axios.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';
import parsedEnv from '../../parse-env';

export default class UploaderList extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            uploaders: [],
            totalWebsites: undefined,
            totalUploaders: undefined,
            maxPages: undefined,
            loading: true,
            error: undefined,
        };
    }

    componentDidMount() {
        document.title = `Uploaders - ${parsedEnv.REACT_APP_BRAND}`;
        this.getUploaders();
    }

    componentDidUpdate(prevProps) {
        if (this.props.location.pathname !== prevProps.location.pathname) {
            this.getUploaders();
        }
    }

    getUploaders = () => {
        axios
            .get(`/api/uploaders/page/${this.props.match.params.page ? `${this.props.match.params.page}` : '1'}`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        totalWebsites: res.data.totalWebsites,
                        uploaders: res.data.uploaders,
                        totalUploaders: res.data.totalUploaders,
                        maxPages: res.data.maxPages,
                    });
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    render() {
        const uploaders = this.state.uploaders.map(uploader =>
            <Col
                className="mb-3 px-1"
                xl="4"
                md="6"
                xs="12"
                key={uploader.extractor + uploader.name}
            >

                <div className="media-container">
                    <Link to={`/uploaders/${uploader.extractor}/${uploader.id}`}>
                        <Image
                            width={145}
                            height={145}
                            src={getImage(uploader, 'avatar')}
                            onError={(e) => { defaultImage(e, 'avatar') }}
                            roundedCircle={this.context.user?.useCircularAvatars ?? true}
                            className="me-3"
                        />
                    </Link>
                    <div className="media-body align-self-center">
                        <Link
                            to={`/uploaders/${uploader.extractor}/${uploader.id}`}
                            className="uploader-title-link text-dark"
                        >
                            <h5 title={uploader.name}>{uploader.name}</h5>
                        </Link>
                        <p className="text-muted mb-0">
                            <small>
                                {uploader.statistics.totalVideoCount.toLocaleString()} video{(uploader.statistics.totalVideoCount !== 1) && 's'}
                                <span> &middot; </span>
                                {uploader.playlistCreatedCount.toLocaleString()} playlist{(uploader.playlistCreatedCount !== 1) && 's'}
                                <span> &middot; </span>
                                {bytesToSizeString(uploader.statistics.totalVideoFilesize,
                                    this.context.user?.reportBytesUsingIec ?? true)}
                            </small>
                        </p>
                        <p className="text-muted mb-0">
                            <small>
                                Last upload was {dateToTimeSinceString(new Date(uploader.statistics.newestVideoDateUploaded))}
                            </small>
                        </p>
                        <p className="text-muted mb-0">
                            <small>
                                Uploads to <span style={{ textTransform: 'capitalize' }}>{uploader.extractor}</span>
                            </small>
                        </p>
                    </div>
                </div>
            </Col>
        );

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading && <>
                    <h1>
                        {this.state.totalUploaders.toLocaleString()} Uploader
                        {this.state.totalUploaders !== 1 && 's'}
                    </h1>
                    <h5 className="mb-4">
                        From {this.state.totalWebsites} different websites
                    </h5>
                    {this.state.uploaders.length === 0
                        ? <p className="text-center fw-bold">No results found</p>
                        : <>
                            <Pageinator baseUrl="uploaders/page" page={this.props.match.params.page || 1} maxPages={this.state.maxPages} />
                            <Row
                                style={{
                                    marginLeft: '-0.25rem',
                                    marginRight: '-0.25rem'
                                }}
                            >
                                {uploaders}
                            </Row>
                            <Pageinator baseUrl="uploaders/page" page={this.props.match.params.page || 1} maxPages={this.state.maxPages} bottom />
                        </>
                    }
                </>}
            </PageLoadWrapper>
        );
    }
}
