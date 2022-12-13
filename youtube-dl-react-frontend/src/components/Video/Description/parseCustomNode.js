import React from 'react';
import { Link } from 'react-router-dom';

const ExternalLink = ({ url }) => (
    <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
    </a>
);

export const PREFIX = 'custom-';

export const parseCustomNode = (node, idx, player) => {
    const nodeName = node.nodeName.toLowerCase();

    if (!nodeName.startsWith(PREFIX)) return null;

    switch (nodeName.toLowerCase().slice(PREFIX.length)) {
        case 'externallink':
            return <ExternalLink key={idx} url={node.textContent} />;
        case 'hashtag':
            return <Link key={idx} to={`/videos?search=${encodeURIComponent(node.textContent)}`}>
                {node.textContent}
            </Link>;
        case 'settime':
            return <span className="fake-link" key={idx} onClick={() => {
                if (player) {
                    window.scrollTo(0, 0);
                    player.currentTime(parseInt(node.attributes.time.value));
                    player.play();
                }
            }}>
                {node.textContent}
            </span>
        default:
            return null;
    }
};
