import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Badge, Image, Media } from 'react-bootstrap';
import { UserContext } from '../../contexts/user.context';
import {
    dateToTimeSinceString,
    videoDurationToOverlay,
    resolutionToBadge,
    abbreviateNumber
} from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';

const VideoPreview = props => {
    const userContext = useContext(UserContext);

    const video = props.video;
    const uploaderLink = `/uploaders/${video.extractor}/${video.uploader}`
    const videoLink = `/videos/${video.extractor}/${video.id}`;

    const videoInfo = <>
        <Media>
            {!!props.icon && video.uploader &&
                <Link
                    to={uploaderLink}
                    className="mr-2"
                >
                    <Image
                        width={36}
                        height={36}
                        src={getImage(video, 'avatar')}
                        onError={(e) => { defaultImage(e, 'avatar') }}
                        roundedCircle={userContext.user?.useCircularAvatars ?? true}
                        className="mt-1"
                    />
                </Link>
            }
            <Media.Body>
                <Link
                    className={`text-dark font-weight-bold video-title-link${!props.simple ? (props.horizontal ? ' mb-1' : ' my-1') : ''}`}
                    to={videoLink}
                    title={video.title}
                >
                    {video.title}
                </Link>
                {video.uploader &&
                    <Link
                        className="video-uploader-link"
                        to={uploaderLink}
                    >
                        <small>{video.uploader}</small>
                    </Link>
                }
                {!!props.simple ||
                    <Row>
                        <Col xs="auto">
                            <small className="text-muted">
                                {!!video.viewCount &&
                                    <span title={video.viewCount.toLocaleString() + ' views'}>
                                        {abbreviateNumber(video.viewCount) + ' views'}
                                    </span>
                                }
                                {!!video.viewCount && video.uploadDate &&
                                    <span> &middot; </span>
                                }
                                {video.uploadDate &&
                                    <span title={new Date(video.uploadDate).toLocaleDateString()}>
                                        {dateToTimeSinceString(new Date(video.uploadDate))}
                                    </span>
                                }
                            </small>
                        </Col>
                        {!!video.width && !!video.height && resolutionToBadge(video.width, video.height) &&
                            <Col
                                xs="12"
                                md={!!props.horizontal || 'auto'}
                                className="ml-auto"
                            >
                                <small>
                                    <Badge variant="light">
                                        {resolutionToBadge(video.width, video.height)}
                                    </Badge>
                                </small>
                            </Col>
                        }
                    </Row>
                }
            </Media.Body>
        </Media>
    </>;

    const videoImage = <div
        className="bg-light"
        style={{
            width: props.width,
            paddingBottom: '56.25%',
            overflow: 'hidden',
            position: 'relative',
            // backgroundImage: `url('${getImage(video, 'thumbnail', props.small ? 'small' : 'medium')}'), url('/default-thumbnail.jpg')`,
            // backgroundSize: 'cover',
            // backgroundRepeat: 'no-repeat',
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
            // style={{ height: 'auto', width: 'auto' }}
            src={getImage(video, 'thumbnail', props.small ? 'small' : 'medium')}
            onLoad={(e) => e.target.parentElement.style.setProperty('background-color', '#000', 'important')}
            onError={(e) => defaultImage(e, 'thumbnail')}
        />
        {!!video.duration &&
            <span className="video-duration-overlay">
                {videoDurationToOverlay(video.duration)}
            </span>
        }
    </div>;

    if (!!props.horizontal) {
        return (
            <Media
                className={props.className}
                style={{ lineHeight: '1em' }}
            >
                {props.children}
                <Link
                    to={videoLink}
                    className="position-relative mr-2"
                >
                    {videoImage}
                </Link>
                <Media.Body className="pr-3">
                    {videoInfo}
                </Media.Body>
            </Media>
        );
    } else {
        return (
            <div
                className={props.className}
                style={{ lineHeight: '1em' }}
            >
                <Link to={videoLink}>
                    <div className="position-relative mb-1">
                        {videoImage}
                    </div>
                </Link>
                {videoInfo}
            </div>
        );
    }
}

export default VideoPreview;
