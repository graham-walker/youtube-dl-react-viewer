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

export default class UploaderPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: undefined,
            uploader: undefined,
        };
    }

    componentDidMount() {
        axios
            .get(`/api/uploaders/${this.props.match.params.extractor}/${this.props.match.params.name}`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        uploader: res.data.uploader,
                    });
                    document.title = `${res.data.uploader.name} - ${window.documentTitle}`;
                }
            }).catch(err => {
                this.setState({ error: err });
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
                    <Row className="justify-content-center mb-4">
                        <Col
                            xs="auto"
                            className="align-self-center"
                        >
                            <Image
                                width={145}
                                height={145}
                                src={getImage(uploader, 'avatar')}
                                onError={(e) => { defaultImage(e, 'avatar') }}
                                roundedCircle={this.context.user?.useCircularAvatars ?? true}
                            />
                        </Col>
                        <Col
                            xs="auto"
                            className="align-self-center"
                        >
                            <h3 className="text-center text-md-left">
                                {uploader.name}
                            </h3>
                            <Row className="text-center justify-content-md-center">
                                {statistics.lastDateUploaded &&
                                    <MiniStatisticColumn
                                        title="Last Upload"
                                        icon="calendar-alt"
                                        statistic={dateToTimeSinceString(new Date(statistics.lastDateUploaded))}
                                        detailedStatistic={new Date(statistics.lastDateUploaded).toLocaleString()}
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
                                        statistic={bytesToSizeString(statistics.totalVideoFilesize,
                                            this.context.user?.reportBytesUsingIec ?? true
                                        )}
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
                            </Row>
                            {statistics.tags.length > 0 &&
                                <div>
                                    <small>Tags: </small>
                                    <TopTags
                                        title="tags"
                                        tags={statistics.tags}
                                    />
                                </div>
                            }
                            {statistics.categories.length > 0 &&
                                <div>
                                    <small>Categories: </small>
                                    <TopTags
                                        title="categories"
                                        tags={statistics.categories}
                                    />
                                </div>
                            }
                            {statistics.hashtags.length > 0 &&
                                <div>
                                    <small>Hashtags: </small>
                                    <TopTags
                                        title="hashtags"
                                        tags={statistics.hashtags}
                                    />
                                </div>
                            }
                        </Col>
                    </Row>
                    <VideoList
                        location={this.props.location}
                        url={`uploaders/${this.props.match.params.extractor}/${this.props.match.params.name}`}
                    />
                </>}
            </PageLoadWrapper>
        );
    }
}
