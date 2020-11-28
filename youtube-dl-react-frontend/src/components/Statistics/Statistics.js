import React, { Component } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import VideoPreview from '../VideoPreview/VideoPreview';
import TopTags from '../TopTagsList/TopTagsList';
import { UserContext } from '../../contexts/user.context';
import {
    secondsToDetailedString,
    bytesToSizeString,
    abbreviateNumber,
    dateToTimeSinceString
} from '../../utilities/format.utility';
import { Pie } from 'react-chartjs-2';
import axios from '../../utilities/axios.utility';

export default class StatisticsPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            error: null,
            statistic: null,
        };
    }

    componentDidMount() {
        document.title = `Statistics - ${window.documentTitle}`;

        axios
            .get('/api/statistics')
            .then(res => {
                if (res.status === 200) this.setState({
                    loading: false,
                    statistic: res.data.statistic
                });
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    render() {
        let statistic = this.state.statistic;

        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading &&
                    <div
                        className="mx-auto"
                        style={{ maxWidth: '1200px' }}
                    >
                        <h1 className="mb-4">Statistics</h1>
                        <Card className="mb-4">
                            <Card.Body>
                                <Row className="justify-content-center mb-4">
                                    <StatisticColumn
                                        title="Video Count"
                                        icon="video"
                                        statistic={abbreviateNumber(statistic.totalVideoCount)}
                                        detailedStatistic={statistic.totalVideoCount.toLocaleString() + ' videos'}
                                    />
                                    <StatisticColumn
                                        title="Total Duration"
                                        icon="clock"
                                        statistic={secondsToDetailedString(statistic.totalDuration, true)}
                                        detailedStatistic={secondsToDetailedString(statistic.totalDuration)}
                                    />
                                    <StatisticColumn
                                        title="Total Filesize"
                                        icon="file"
                                        statistic={bytesToSizeString(statistic.totalFilesize,
                                            this.context.user?.reportBytesUsingIec ?? true
                                        )}
                                        detailedStatistic={statistic.totalFilesize.toLocaleString() + ' bytes'}
                                    />
                                    <StatisticColumn
                                        title="Total Views"
                                        icon="eye"
                                        statistic={abbreviateNumber(statistic.totalViewCount)}
                                        detailedStatistic={statistic.totalViewCount.toLocaleString() + ' views'}
                                    />
                                    <StatisticColumn
                                        title="Total Likes"
                                        icon="thumbs-up"
                                        statistic={abbreviateNumber(statistic.totalLikeCount)}
                                        detailedStatistic={statistic.totalLikeCount.toLocaleString() + ' likes'}
                                    />
                                    <StatisticColumn
                                        title="Total Dislikes"
                                        icon="thumbs-down"
                                        statistic={abbreviateNumber(statistic.totalDislikeCount)}
                                        detailedStatistic={statistic.totalDislikeCount.toLocaleString() + ' dislikes'}
                                    />
                                </Row>
                                <h5>
                                    Tags:
                                <TopTags
                                        title="tags"
                                        tags={statistic.tags}
                                        variant="secondary"
                                    />
                                </h5>
                                <h5>
                                    Categories:
                                <TopTags
                                        title="tags"
                                        tags={statistic.categories}
                                        variant="secondary"
                                    />
                                </h5>
                                <h5 className="mb-4">
                                    Hashtags:
                                <TopTags
                                        title="tags"
                                        tags={statistic.hashtags}
                                        variant="secondary"
                                    />
                                </h5>
                                <div className="mx-auto">
                                    <Pie
                                        height={300}
                                        data={{
                                            labels: [
                                                'Videos',
                                                '.info.json',
                                                '.description',
                                                '.annotations.xml',
                                                'Thumbnails',
                                                'Resized Thumbnail Files',
                                                'Subtitle Files',
                                            ],
                                            datasets: [{
                                                data: [
                                                    statistic.totalVideoFilesize,
                                                    statistic.totalInfoFilesize,
                                                    statistic.totalDescriptionFilesize,
                                                    statistic.totalAnnotationsFilesize,
                                                    statistic.totalThumbnailFilesize,
                                                    statistic.totalResizedThumbnailFilesize,
                                                    statistic.totalSubtitleFilesize,
                                                ],
                                                backgroundColor: [
                                                    '#007bff',
                                                    '#6f42c1',
                                                    '#e83e8c',
                                                    '#dc3545',
                                                    '#fd7e14',
                                                    '#ffc107',
                                                    '#28a745',
                                                ],
                                                borderWidth: 0
                                            }]
                                        }}
                                        options={{
                                            title: {
                                                text: 'Filesize Breakdown',
                                                display: true
                                            },
                                            tooltips: {
                                                callbacks: {
                                                    label: (tooltipItem, data) => {
                                                        var label = data.labels[tooltipItem.index] || '';
                                                        if (label) {
                                                            label += ': ' + bytesToSizeString(
                                                                data.datasets[0].data[tooltipItem.index],
                                                                this.context.user?.reportBytesUsingIec ?? true
                                                            );
                                                        }
                                                        return label;
                                                    }
                                                }
                                            },
                                            maintainAspectRatio: false,
                                        }} />
                                </div>
                            </Card.Body>
                        </Card>
                        <Row
                            style={{
                                marginLeft: '-0.25rem',
                                marginRight: '-0.25rem'
                            }}
                        >
                            {statistic.recordViewCountVideo &&
                                <SignificantVideo
                                    title="Most Viewed Video"
                                    icon="eye"
                                    statistic={abbreviateNumber(statistic.recordViewCount)}
                                    detailedStatistic={statistic.recordViewCount.toLocaleString() + ' views'}
                                    video={statistic.recordViewCountVideo}
                                />
                            }
                            {statistic.recordLikeCountVideo &&
                                <SignificantVideo
                                    title="Most Liked Video"
                                    icon="thumbs-up"
                                    statistic={abbreviateNumber(statistic.recordLikeCount)}
                                    detailedStatistic={statistic.recordLikeCount.toLocaleString() + ' likes'}
                                    video={statistic.recordLikeCountVideo}
                                />
                            }
                            {statistic.recordDislikeCountVideo &&
                                <SignificantVideo
                                    title="Most Disliked Video"
                                    icon="thumbs-down"
                                    statistic={abbreviateNumber(statistic.recordDislikeCount)}
                                    detailedStatistic={statistic.recordDislikeCount.toLocaleString() + ' dislikes'}
                                    video={statistic.recordDislikeCountVideo}
                                />
                            }
                            {statistic.oldestVideo &&
                                <SignificantVideo
                                    title="Oldest Video"
                                    icon="hourglass-end"
                                    statistic={'Uploaded ' + dateToTimeSinceString(new Date(statistic.oldestVideoUploadDate))}
                                    detailedStatistic={'Uploaded on ' + new Date(statistic.oldestVideoUploadDate).toLocaleDateString()}
                                    video={statistic.oldestVideo}
                                />
                            }
                        </Row>
                    </div>}
            </PageLoadWrapper>
        );
    }
}

const StatisticColumn = props => {
    return (
        <Col
            xl="2"
            md="4"
            xs="6"
            className="text-center mb-3"
        >
            <h3 style={{ wordSpacing: '100vw' }}>{props.title}</h3>
            <h5 title={props.detailedStatistic}>
                <FontAwesomeIcon
                    className="text-primary"
                    icon={props.icon}
                /> {props.statistic}
            </h5>
        </Col>
    );
}

const SignificantVideo = props => {
    let video = props.video;
    return (
        <Col
            className="mb-3 px-1"
            lg="3"
            sm="6"
            xs="12"
        >
            <div>
                <h3>{props.title}</h3>
                <h5 title={props.detailedStatistic}>
                    <FontAwesomeIcon
                        className="text-primary"
                        icon={props.icon}
                    /> {props.statistic}
                </h5>
            </div>
            <VideoPreview video={video} icon />
        </Col>
    );
}
