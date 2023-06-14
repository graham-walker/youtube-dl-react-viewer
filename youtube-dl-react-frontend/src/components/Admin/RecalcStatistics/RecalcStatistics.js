import React, { useState } from 'react';
import { Button, Card, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';

const RecalcStatistics = (props) => {
    const [success, setSuccess] = useState(undefined);
    const [error, setError] = useState(undefined);

    const post = (cancel = false) => {
        axios
            .post(
                `/api/admin/statistics/recalculate/?cancel=${cancel}`
            ).then(res => {
                setSuccess(res.data.success);
                setError(res.data.error);
            }).catch(err => {
                setError(getErrorMessage(err));
            });
    }

    return (
        <>
            <h5 className="mb-4">Recalculate statistics</h5>
            <Card className="mb-4">
                <Card.Body>
                    {!!success && <Alert variant="success">{success}</Alert>}
                    {!!error && <Alert variant="danger">{error}</Alert>}
                    <Button
                        name="update"
                        type="submit"
                        className="me-2"
                        onClick={() => post()}
                    >
                        Recalculate
                    </Button>
                    <Button
                        name="update"
                        type="submit"
                        variant="danger"
                        onClick={() => post(true)}
                    >
                        Cancel
                    </Button>
                </Card.Body>
            </Card>
        </>
    );
}

export default RecalcStatistics;
