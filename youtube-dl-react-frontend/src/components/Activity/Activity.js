import React, { Component, useContext } from 'react';
import { Row, Col, Image, Spinner, Button } from 'react-bootstrap';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import InfiniteScroll from 'react-infinite-scroll-component';
import { UserContext } from '../../contexts/user.context';
import { defaultImage } from '../../utilities/image.utility';
import VideoPreview from '../VideoPreview/VideoPreview';
import axios from '../../utilities/axios.utility';

export default class ActivityPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: undefined,
            activities: [],
            page: 0,
            count: undefined,
            user: undefined,
            hasMore: true,
        };
    }

    componentDidMount() {
        document.title = `History - ${window.documentTitle}`;
        this.getActivity();
    }

    getActivity = () => {
        axios
            .get(`/api/activity/recall/${this.state.page}`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        activities: this.state.activities.concat(res.data.activities),
                        count: res.data.count ?? this.state.count,
                        user: res.data.user ?? this.state.user,
                        page: this.state.page + 1,
                        hasMore: (this.state.activities.length + res.data.activities.length) < res.data.count,
                    });
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    clearActivity = () => {
        axios.post(`/api/activity/clear`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({ activities: [], count: 0 });
                }
            }).catch(err => {
            });
    }

    render() {
        const user = this.state.user;
        const avatar = this.context.user && this.context.user.avatar ? '/static/users/avatars/' + this.context.user.avatar : '/default-avatar.jpg';

        const activities = this.state.activities.map((activity, i) =>
            <Col
                style={{ flex: '0 0 100%', maxWidth: '100%' }}
                className="mb-3 px-1 col-xxl-2"
                lg="3"
                sm="6"
                xs="12"
                key={i}
            >
                <ActivityItem activity={activity} />
            </Col>
        );

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
                                <div className="text-center">
                                    <Image
                                        width={145}
                                        height={145}
                                        src={avatar}
                                        onError={(e) => { defaultImage(e, 'avatar') }}
                                        roundedCircle={this.context.user?.useCircularAvatars ?? true}
                                    />
                                    <h3>Activity for {user.username}</h3>
                                </div>
                                <p className="text-muted text-center">
                                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                                <p className="text-right"><Button onClick={this.clearActivity}>Clear Activity</Button></p>
                            </div>
                        </Col>
                        <Col>
                            <InfiniteScroll
                                dataLength={this.state.activities.length}
                                next={this.getActivity}
                                hasMore={this.state.hasMore}
                                loader={
                                    <div className="text-center">
                                        <Spinner animation="border" />
                                    </div>
                                }
                                endMessage={
                                    <p className="text-center fw-bold">
                                        {this.state.count === 0 ? 'No activity found' : 'End of activity'}
                                    </p>
                                }
                                style={{ overflow: 'hidden' }}>
                                <Row
                                    style={{
                                        marginLeft: '-0.25rem',
                                        marginRight: '-0.25rem'
                                    }}
                                >
                                    {activities}
                                </Row>
                            </InfiniteScroll>
                        </Col>
                    </Row>
                </>}
            </PageLoadWrapper>
        );
    }
}

const ActivityItem = props => {
    const userContext = useContext(UserContext);
    const avatar = userContext.user && userContext.user.avatar ? '/static/users/avatars/' + userContext.user.avatar : '/default-avatar.jpg';

    const activity = props.activity;

    let eventType;
    let activityBody;
    switch (activity.eventType) {
        case "watched":
            eventType = 'watched a video';
            activityBody = <VideoPreview
                video={activity.videoDocument}
                width={'168px'}
                small={true}
                horizontal={true}
                watched={true}
                stopTime={activity.stopTime}
            />
            break;
        default:
            eventType = 'Unknown Event';
            break;
    }

    return (
        <>
            <div className="activity-header">
                <p><Image
                    width={36}
                    height={36}
                    src={avatar}
                    onError={(e) => { defaultImage(e, 'avatar') }}
                    roundedCircle={userContext.user?.useCircularAvatars ?? true}
                    className="me-2"
                />
                    <span className="fw-bold">{userContext.user.username} {eventType}</span><small className="text-muted ms-3">{new Date(activity.createdAt).toLocaleString()}</small></p>
            </div>
            <div className="activity-body">{activityBody}</div>
        </>
    );
}