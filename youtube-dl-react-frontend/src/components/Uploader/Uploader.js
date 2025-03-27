import React, { Component } from 'react';
import { Row, Col, Image } from 'react-bootstrap';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import MiniStatisticColumn from '../MiniStatisticsColumn/MiniStatisticsColumn';
import VideoList from '../VideoList/VideoList';
import TopTags from '../TopTagsList/TopTagsList';
import { UserContext } from '../../contexts/user.context';
import {
    dateToTimeSinceString,
    bytesToSizeString,
    secondsToDetailedString,
    abbreviateNumber
} from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';
import axios from '../../utilities/axios.utility';
import parsedEnv from '../../parse-env';
import AvatarForm from '../Settings/AvatarForm/AvatarForm';
import AlertModal from '../AlertModal/AlertModal';

export default class UploaderPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: undefined,
            uploader: undefined,
            imageKey: 0,
            showAlert: false,
        };
    }

    componentDidMount() {
        axios
            .get(`/api/uploaders/${this.props.match.params.extractor}/${this.props.match.params.id}`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        uploader: res.data.uploader,
                    });
                    document.title = `${res.data.uploader.name} - ${parsedEnv.REACT_APP_BRAND}`;
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    uploadAvatar = (e) => {
        let formData = new FormData();
        formData.append('avatar', e.target.files[0]);
        axios
            .post(`/api/uploaders/${this.state.uploader.extractor}/${this.state.uploader.id}/upload_avatar`, formData).then(res => {
                // Reload the avatar image
                this.setState((prevState) => ({ imageKey: prevState.imageKey + 1 }));
            }).catch(err => {
                console.error(err);
                this.setState({ showAlert: true });
            });
    }

    render() {
        const uploader = this.state.uploader;
        const statistics = uploader?.statistics;

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading && <>
                    <Row className="justify-content-center mb-4 mx-auto" style={{ maxWidth: '1140px' }}>
                        <Col
                            xs="auto"
                            className="align-self-start"
                        >
                            {this.context.getSetting('isSuperuser')
                                ? <AvatarForm
                                    width={145}
                                    height={145}
                                    src={getImage(uploader, 'avatar')}
                                    name="uploaderAvatar"
                                    onChange={this.uploadAvatar}
                                    imageKey={this.state.imageKey}
                                    className="mb-1 mb-lg-0"
                                />
                                : <Image
                                    width={145}
                                    height={145}
                                    src={getImage(uploader, 'avatar')}
                                    onError={(e) => { defaultImage(e, 'avatar') }}
                                    roundedCircle={this.context.getSetting('useCircularAvatars')}
                                    className="mb-1 mb-lg-0"
                                />
                            }
                        </Col>
                        <Col
                            xs="auto"
                            className="align-self-center"
                        >
                            <h3 className="text-center text-lg-start">
                                {uploader.name}
                            </h3>
                            <Row className="text-center justify-content-lg-center">
                                {statistics.newestVideoDateUploaded &&
                                    <MiniStatisticColumn
                                        title="Last Upload"
                                        icon="calendar-alt"
                                        statistic={dateToTimeSinceString(new Date(statistics.newestVideoDateUploaded))}
                                        detailedStatistic={new Date(statistics.newestVideoDateUploaded).toLocaleString()}
                                    />
                                }
                                {!!statistics.totalVideoCount &&
                                    <MiniStatisticColumn
                                        title="Video Count"
                                        icon="video"
                                        statistic={abbreviateNumber(statistics.totalVideoCount)}
                                        detailedStatistic={statistics.totalVideoCount.toLocaleString() + ' videos'}
                                    />
                                }
                                {!!statistics.totalDuration &&
                                    <MiniStatisticColumn
                                        title="Total Duration"
                                        icon="clock"
                                        statistic={secondsToDetailedString(statistics.totalDuration, true)}
                                        detailedStatistic={secondsToDetailedString(statistics.totalDuration)}
                                    />
                                }
                                {!!statistics.totalFilesize &&
                                    <MiniStatisticColumn
                                        title="Total Filesize"
                                        icon="file"
                                        statistic={bytesToSizeString(statistics.totalVideoFilesize, this.context.getSetting('reportBytesUsingIec'))}
                                        detailedStatistic={statistics.totalVideoFilesize.toLocaleString() + ' bytes'}
                                    />
                                }
                                {!!statistics.totalViewCount &&
                                    <MiniStatisticColumn
                                        title="Total Views"
                                        icon="eye"
                                        statistic={abbreviateNumber(statistics.totalViewCount)}
                                        detailedStatistic={statistics.totalViewCount.toLocaleString() + ' views'}
                                    />
                                }
                                {!!statistics.totalLikeCount &&
                                    <MiniStatisticColumn
                                        title="Total Likes"
                                        icon="thumbs-up"
                                        statistic={abbreviateNumber(statistics.totalLikeCount)}
                                        detailedStatistic={statistics.totalLikeCount.toLocaleString() + ' likes'}
                                    />
                                }
                                {!!statistics.totalDislikeCount &&
                                    <MiniStatisticColumn
                                        title="Total Dislikes"
                                        icon="thumbs-down"
                                        statistic={abbreviateNumber(statistics.totalDislikeCount)}
                                        detailedStatistic={statistics.totalDislikeCount.toLocaleString() + ' dislikes'}
                                    />
                                }
                                {!!uploader.url &&
                                    <MiniStatisticColumn
                                        title="Channel URL"
                                        icon="external-link-alt"
                                        statistic={<a
                                            href={uploader.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {uploader.url.replace('https://', '')
                                                .replace('http://', '')
                                                .replace('www.', '')
                                                .split('/')
                                                .shift()
                                            }
                                        </a>}
                                    />
                                }
                            </Row>
                            {statistics.tags.length > 0 &&
                                <div>
                                    <small>Tags: </small>
                                    <TopTags
                                        title="tags"
                                        tags={statistics.tags}
                                        inline
                                    />
                                </div>
                            }
                            {statistics.categories.length > 0 &&
                                <div>
                                    <small>Categories: </small>
                                    <TopTags
                                        title="categories"
                                        tags={statistics.categories}
                                        inline
                                    />
                                </div>
                            }
                            {statistics.hashtags.length > 0 &&
                                <div>
                                    <small>Hashtags: </small>
                                    <TopTags
                                        title="hashtags"
                                        tags={statistics.hashtags}
                                        inline
                                    />
                                </div>
                            }
                        </Col>
                    </Row>
                    <VideoList
                        location={this.props.location}
                        url={`uploaders/${this.props.match.params.extractor}/${this.props.match.params.id}`}
                        hideUploader={true}
                    />
                    <AlertModal
                        show={this.state.showAlert}
                        message="Failed to upload avatar"
                        onHide={() => this.setState({ showAlert: false })}
                    />
                </>}
            </PageLoadWrapper>
        );
    }
}
