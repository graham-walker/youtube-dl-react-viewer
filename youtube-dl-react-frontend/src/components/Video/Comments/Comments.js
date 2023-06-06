import React, { useState, useContext } from 'react';
import { Image, Form, Badge } from 'react-bootstrap';
import { defaultImage } from '../../../utilities/image.utility';
import { dateToTimeSinceString, abbreviateNumber } from '../../../utilities/format.utility';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Description from '../Description/Description';
import { UserContext } from '../../../contexts/user.context';

const Comments = props => {
    const [sort, setSort] = useState('like_count');

    function group(comments, parent = 'root') {
        let newComments = [];

        let i = comments.length;
        while (i--) {
            if (comments[i].parent === parent) {
                newComments.push(comments[i]);
                comments.splice(i, 1);
            }
        }
        for (let i = 0; i < newComments.length; i++) {
            newComments[i].replies = group(comments, newComments[i].id).sort((a, b) => (b.timestamp > a.timestamp) ? 1 : -1);
        }
        return newComments;
    }

    function n2(comments) {
        return comments.map((comment, i) => {
            return <Comment key={i} comment={comment} player={props.player} uploader={props.uploader}>{comment.replies.length > 0 ? <div className="comment-replies">{n2(comment.replies)}</div> : <></>}</Comment>
        });
    }

    let groupedComments;
    if (props.comments && props.comments.length > 0) {
        groupedComments = group([...props.comments]).sort((a, b) => b.is_favorited - a.is_favorited || b[sort] - a[sort])
    }

    return (
        <div className="video-comments">
            <p className="fw-bold">{props.comments.length.toLocaleString()} Comment{props.comments.length !== 1 ? 's' : ''}</p>
            <Form className="form-inline mb-4">
                <Form.Group>
                    <Form.Label className="me-2">Sort By</Form.Label>
                    <Form.Select
                        name="sort"
                        onChange={e => setSort(e.target.value)}
                        value={sort}
                    >
                        <option value="like_count">Likes</option>
                        <option value="timestamp">Newest</option>
                    </Form.Select>
                </Form.Group>
            </Form>
            <div style={{ maxHeight: 'calc(100vh - 56px - 1.5rem)', overflow: 'auto' }}>
                {!!groupedComments && n2(groupedComments)}
            </div>
        </div>
    );
}

const Comment = props => {
    let comment = props.comment;

    let [showReplies, setShowReplies] = useState(false);

    const userContext = useContext(UserContext);

    return (
        <div className="media-container">
            <Image
                width={48}
                height={48}
                src={process.env.REACT_APP_LOAD_EXTERNAL_THUMBNAILS.toLowerCase() === 'true' ? comment.author_thumbnail : '/default-avatar.svg'}
                onError={(e) => { defaultImage(e, 'avatar') }}
                roundedCircle={userContext.user?.useCircularAvatars ?? true}
            />
            <div className="media-body ms-3">
                <p className="mb-0"><span className="fw-bold">{comment.author_is_uploader ? <Badge bg="secondary" pill style={{ fontSize: '100%' }}>{comment.author}</Badge> : comment.author}</span><small className="ms-2" title={'Comment posted ' + new Date(comment.timestamp * 1000).toLocaleString()}>{dateToTimeSinceString(new Date(comment.timestamp * 1000))}</small></p>
                <Description text={comment.html ? comment.html : comment.text} player={props.player} type="comment" />
                {!!comment.like_count && <><FontAwesomeIcon icon="thumbs-up" className="text-muted" /> <span title={comment.like_count.toLocaleString() + ' Likes'}>{abbreviateNumber(comment.like_count)}</span></>}{comment.is_favorited && <FontAwesomeIcon title={props.uploader ? '♥ by ' + props.uploader : ''} icon="heart" className="text-danger ms-3" />}
                {comment.replies.length > 0 && <><br /><span className="fake-link" onClick={() => setShowReplies(!showReplies)}>{showReplies ? 'Hide' : 'Show'} {comment.replies.length.toLocaleString()} Replies</span></>}
                <div className="mt-3">{!!showReplies && <div className="comment-replies">{props.children}</div>}</div>
            </div>
        </div>
    );
}

export default Comments;
