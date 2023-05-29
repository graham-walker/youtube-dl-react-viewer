import React from 'react';
import { parseStringToDom } from './parseStringToDom';
import { mapDomToReact } from './mapDomToReact';

const Description = ({ text, player, type }) => {
    try {
        const comments = parseStringToDom(text).map((node, idx) => mapDomToReact(node, idx, player));

        return (<div className="video-description">{comments}</div>);
    } catch (err) {
        console.log(err);
        return (<div className="video-description"><strong className="text-danger">Failed to render {type === 'comment' ? 'comment' : 'description'}</strong></div>);
    }
};

export default Description;
