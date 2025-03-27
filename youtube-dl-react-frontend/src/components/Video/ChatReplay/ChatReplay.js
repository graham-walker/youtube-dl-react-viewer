import React, { useState, useEffect, useContext, useRef } from 'react';
import { Image, Button } from 'react-bootstrap';
import { defaultImage } from '../../../utilities/image.utility';
import { videoDurationToOverlay } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import { Spinner } from 'react-bootstrap';
import parsedEnv from '../../../parse-env';

const ChatReplay = (props) => {
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState(null);
    const [rendered, setRendered] = useState([]);
    const [lastCommentIndex, setLastCommentIndex] = useState(null);
    const [visible, setVisible] = useState(localStorage.getItem('showChatReplay') === null ? false : localStorage.getItem('showChatReplay') === 'true');
    const [error, setError] = useState(null);

    const userContext = useContext(UserContext);

    const chatRef = useRef(null);

    useEffect(() => {
        axios
            .get(`/api/videos/${props.extractor}/${props.id}/livechat`)
            .then(res => {
                setLoading(false);
                setComments(res.data.comments);
            })
            .catch(err => {
                setLoading(false);
                setError(err?.response?.data?.error || 'Failed to load chat replay');
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!!comments && visible) {
            let latestCommentIndex = comments.findLastIndex(comment => comment.offset <= props.time);
            if (lastCommentIndex !== latestCommentIndex) {
                setLastCommentIndex(latestCommentIndex);
                if (latestCommentIndex === -1) {
                    setRendered([]);
                } else {
                    setRendered(comments.slice(Math.max(0, latestCommentIndex - 50), latestCommentIndex));
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.time, comments, visible]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [rendered]);

    useEffect(() => {
        localStorage.setItem('showChatReplay', visible.toString());
    }, [visible]);

    return (
        <div className="card mb-3">
            {!visible
                ? <Button onClick={() => setVisible(true)} variant="link">Show chat replay</Button>
                : <>
                    <div className="p-3"><p className="mb-0"><strong>Chat replay</strong></p></div>
                    {loading
                        ? <div className="p-3 pt-0 text-center"><Spinner animation="border" /></div>
                        : <>
                            <div className="px-3" style={{ height: '500px', overflowY: 'auto' }} ref={chatRef}>
                                {rendered.length > 0
                                    ? rendered.map(comment =>
                                        <div className="media-container">
                                            <Image
                                                width={24}
                                                height={24}
                                                src={parsedEnv.REACT_APP_LOAD_EXTERNAL_THUMBNAILS ? comment.photo : '/default-avatar.svg'}
                                                onError={(e) => { defaultImage(e, 'avatar') }}
                                                roundedCircle={userContext.getSetting('useCircularAvatars')}
                                            />
                                            <div className="media-body ms-2">
                                                <p className="mb-0">
                                                    <span className="fw-bold">{comment.name}</span>
                                                    {comment.date && <small className="ms-2" title={'Comment posted ' + new Date(comment.date).toLocaleString()}>{videoDurationToOverlay(comment.offset)}</small>}
                                                    <p className="mb-1">{comment.message}</p>
                                                </p>
                                            </div>
                                        </div>
                                    )
                                    : (!!comments
                                        ? <p className="text-center"><strong>No comments yet</strong></p>
                                        : <p className="text-center"><strong>{error}</strong></p>
                                    )}
                            </div >
                            <Button onClick={() => setVisible(false)} variant="link">Hide chat replay</Button>
                        </>
                    }
                </>
            }
        </div >
    );
}

export default ChatReplay;
