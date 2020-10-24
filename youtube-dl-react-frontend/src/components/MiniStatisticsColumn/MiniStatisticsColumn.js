import React from 'react';
import { Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const MiniStatisticColumn = props => {
    return (
        <Col xs="6" md="auto" className="mb-2">
            <small className="text-muted text-uppercase d-block">{props.title}</small>
            <span title={props.detailedStatistic}>
                <FontAwesomeIcon className="text-primary" icon={props.icon} /> {props.statistic}
            </span>
        </Col>
    );
}

export default MiniStatisticColumn;
