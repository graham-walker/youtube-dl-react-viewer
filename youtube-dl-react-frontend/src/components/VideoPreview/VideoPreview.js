import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Badge, Image } from 'react-bootstrap';
import { UserContext } from '../../contexts/user.context';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    dateToTimeSinceString,
    videoDurationToOverlay,
    resolutionToBadge,
    abbreviateNumber,
    bytesToSizeString,
} from '../../utilities/format.utility';
import { getImage, defaultImage } from '../../utilities/image.utility';

const VideoPreview = props => {
    const userContext = useContext(UserContext);

    const video = props.video;

    if (!video) {
        const videoInfo = <>
            <div className="media-container">
                {!!props.icon && video.uploaderDocument &&
                    <Image
                        width={36}
                        height={36}
                        src="/default-avatar.svg"
                        roundedCircle={userContext.user?.useCircularAvatars ?? true}
                        className="mt-1"
                    />
                }
                <div className="media-body">
                    <span
                        className="video-title-link fw-bold text-dark"
                        title="Unknown Video"
                        style={{ textDecoration: 'none' }}
                    >Unknown Video</span>
                </div>
            </div>
        </>;

        const videoImage = <>
            <div
                className="video-thumbnail bg-light"
                style={{ width: props.width }}
            >
                <Image
                    style={{ filter: props.watched ? 'brightness(75%)' : 'none', borderRadius: (userContext.user?.useCircularAvatars ?? true) ? '0.5rem' : 0 }}
                    src="/default-thumbnail.svg"
                    onLoad={(e) => e.target.parentElement.style.setProperty('background-color', 'transparent', 'important')}
                />
                {!!props.watched &&
                    <Badge
                        bg="dark"
                        className="video-badge badge-left"
                    >
                        <FontAwesomeIcon icon="history" />
                        <> Watched</>
                    </Badge>
                }
            </div>
        </>;

        if (!!props.horizontal) {
            return (
                <div
                    className={'media-container ' + props.className}
                    style={{ lineHeight: '1em' }}
                >
                    {props.children}
                    <span className="position-relative me-2">
                        {videoImage}
                    </span>
                    <div className="media-body pr-3">
                        {videoInfo}
                    </div>
                </div>
            );
        } else {
            return (
                <div
                    className={props.className}
                    style={{ lineHeight: '1em' }}
                >
                    <div className="position-relative mb-1">
                        {videoImage}
                    </div>
                    {videoInfo}
                </div>
            );
        }
    } else {
        const uploaderLink = `/uploaders/${video.uploaderDocument?.extractor}/${video.uploaderDocument?.id}`;
        const videoLink = `/videos/${video.extractor}/${video.id}`;

        const videoInfo = <>
            <div className="media-container">
                {!!props.icon && video.uploaderDocument &&
                    <Link
                        to={uploaderLink}
                        className="me-2"
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
                <div className="media-body">
                    <Link
                        className={`text-dark fw-bold video-title-link${!props.simple ? (props.horizontal ? ' mb-1' : ' my-1') : ''}`}
                        to={videoLink}
                        title={video.title}
                    >
                        {video.title}
                    </Link>
                    {video.uploaderDocument &&
                        <Link
                            className="video-uploader-link"
                            to={uploaderLink}
                        >
                            <small>{video.uploaderDocument.name}</small>
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
                                    className="ms-auto"
                                >
                                    <small>
                                        <Badge bg="light">
                                            {resolutionToBadge(video.width, video.height)}
                                        </Badge>
                                    </small>
                                </Col>
                            }
                        </Row>
                    }
                </div>
            </div>
        </>;

        const videoImage = <>
            <div
                className="video-thumbnail bg-light"
                style={{ width: props.width }}
            >
                <Image
                    style={{ filter: props.watched ? 'brightness(75%)' : 'none', borderRadius: (userContext.user?.useCircularAvatars ?? true) ? '0.5rem' : 0 }}
                    src={getImage(video, 'thumbnail', props.small ? 'small' : 'medium')}
                    onLoad={(e) => e.target.parentElement.style.setProperty('background-color', 'transparent', 'important')}
                    onError={(e) => defaultImage(e, 'thumbnail')}
                />
                {!!video.duration &&
                    <span className="video-duration-overlay">
                        {videoDurationToOverlay(video.duration)}
                    </span>
                }
                {!!props.watched &&
                    <Badge
                        bg="dark"
                        className="video-badge badge-left"
                    >
                        <FontAwesomeIcon icon="history" />
                        <> Watched</>
                    </Badge>
                }
                <VideoStatBadge video={video} type={props.badge} />
            </div>
            {!!props.stopTime &&
                <div className="video-watchtime">
                    <div className="video-watchtimebar" style={{ width: ((props.stopTime / video.duration) * 100) + '%' }}></div>
                </div>
            }
        </>;

        if (!!props.horizontal) {
            return (
                <div
                    className={'media-container ' + props.className}
                    style={{ lineHeight: '1em' }}
                >
                    {props.children}
                    <Link
                        to={videoLink}
                        className="position-relative me-2"
                    >
                        {videoImage}
                    </Link>
                    <div className="media-body pr-3">
                        {videoInfo}
                    </div>
                </div>
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
}

const VideoStatBadge = props => {
    const video = props.video;

    if (props.type) {
        let badgeProps;
        try {
            switch (props.type) {
                case 'largest_size':
                case 'smallest_size':
                    badgeProps = {
                        icon: 'file',
                        text: bytesToSizeString(video.videoFile.filesize),
                        title: video.videoFile.filesize.toLocaleString() + ' bytes',
                    };
                    break;
                case 'most_likes':
                case 'least_likes':
                    badgeProps = {
                        icon: 'thumbs-up',
                        text: abbreviateNumber(video.likeCount),
                        title: video.likeCount.toLocaleString() + ' likes',
                    };
                    break;
                case 'most_dislikes':
                case 'least_dislikes':
                    badgeProps = {
                        icon: 'thumbs-down',
                        text: abbreviateNumber(video.dislikeCount),
                        title: video.dislikeCount.toLocaleString() + ' dislikes',
                    };
                    break;
                case 'ratio_likes':
                case 'ratio_dislikes':
                    let likeNumber;
                    let dislikeNumber;

                    if (video.likeCount > video.dislikeCount) {
                        if (video.dislikeCount === 0) {
                            likeNumber = 1;
                            dislikeNumber = 0;
                        } else {
                            likeNumber = Number((video.likeCount / video.dislikeCount).toFixed(2));
                            dislikeNumber = 1;
                        }
                    } else {
                        if (video.likeCount === 0) {
                            likeNumber = 0;
                            dislikeNumber = 1;
                        } else {
                            likeNumber = 1;
                            dislikeNumber = Number((video.dislikeCount / video.likeCount).toFixed(2));
                        }
                    }

                    badgeProps = {
                        icon: 'balance-scale',
                        text: `${likeNumber} : ${dislikeNumber}`,
                        title: `${likeNumber} like${likeNumber !== 1 ? 's' : ''} per ${dislikeNumber} dislike${dislikeNumber !== 1 ? 's' : ''}`,
                    };
                    break;

                case 'newest_download':
                case 'oldest_download':
                    badgeProps = {
                        icon: 'calendar-alt',
                        text: dateToTimeSinceString(new Date(video.dateDownloaded)),
                        title: new Date(video.dateDownloaded).toLocaleString(),
                    };
                    break;
                default:
                    break;
            }
            if (badgeProps) {
                return (
                    <Badge
                        bg="primary"
                        className="video-badge badge-right"
                        title={badgeProps.title}
                    >
                        <FontAwesomeIcon icon={badgeProps.icon} />
                        <> {badgeProps.text}</>
                    </Badge>
                );
            }
        } catch { };
    }
    return <></>;
}

export default VideoPreview;
