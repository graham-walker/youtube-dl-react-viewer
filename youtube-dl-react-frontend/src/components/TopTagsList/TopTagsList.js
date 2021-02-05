import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import queryString from 'query-string';

const TopTagsList = props => {
    const tags = props.tags.sort((a, b) => b.count - a.count).slice(0, 5);
    return (
        tags.map((tag, i) =>
            <Link
                to={`/videos?${queryString.stringify({ search: `"${tag.name}"` })}`}
                key={i}
            >
                <Badge
                    variant={props.variant || 'light'}
                    className="ml-1"
                >
                    {tag.name} ({tag.count.toLocaleString()})
                </Badge>
            </Link>
        )
    );
}

export default TopTagsList;
