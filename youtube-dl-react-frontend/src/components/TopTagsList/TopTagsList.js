import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import { createSearchLink } from '../../utilities/search.utility';

const TopTagsList = props => {
    const As = props.as || 'span';
    const tags = props.tags.sort((a, b) => b.count - a.count);

    const list = tags.map((tag, i) =>
        <As>
            <Link
                to={createSearchLink(tag.name)}
                key={i}
            >
                <Badge
                    bg={props.bg || 'light'}
                    className="ms-1"
                >
                    {tag.name} ({tag.count.toLocaleString()})
                </Badge>
            </Link>
        </As>
    );

    return (
        props.inline
            ? list
            : <div className="d-flex flex-wrap">{list}</div>
    );
}

export default TopTagsList;
