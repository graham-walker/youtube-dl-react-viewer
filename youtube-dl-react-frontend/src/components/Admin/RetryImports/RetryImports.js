import { useState } from 'react';
import { Button, Accordion, Alert, Card } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';
import AccordionButton from '../../AccordionButton/AccordionButton';
import parsedEnv from '../../../parse-env';
import { scrollToElement } from '../../../utilities/scroll.utility';

const RetryImports = (props) => {
    const [successMessage, setSuccessMessage] = useState(undefined);
    const [errorMessage, setErrorMessage] = useState(undefined);
    const [limit, setLimit] = useState(10);

    const repairError = (method, errorId = undefined) => {
        setSuccessMessage(undefined);
        setErrorMessage(undefined);

        axios
            .post(`/api/admin/errors/repair`, { resolveBy: method, errorId })
            .then(res => {
                if (res.status === 200) {
                    if (res.data.success) setSuccessMessage(res.data.success);
                    if (res.data.error) setErrorMessage(res.data.error);
                }
            }).catch(err => {
                setErrorMessage(getErrorMessage(err));
            }).finally(() => {
                scrollToElement('#failed-to-parse-anchor');
            });
    }

    const stopRepairing = () => {
        setSuccessMessage(undefined);
        setErrorMessage(undefined);

        axios
            .post(`/api/admin/errors/stop`)
            .then(res => {
                if (res.status === 200) {
                    if (res.data.success) setSuccessMessage(res.data.success);
                    if (res.data.error) setErrorMessage(res.data.error);
                }
            }).catch(err => {
                setErrorMessage(getErrorMessage(err));
            }).finally(() => {
                scrollToElement('#failed-to-parse-anchor');
            });
    }

    return (
        <>
            <h5 id="failed-to-parse-anchor" className="mb-4">Failed to parse</h5>
            <Card className="mb-4">
                <Card.Body>
                    <Alert variant="info">Videos that the web app failed to parse. Videos that yt-dlp failed to download will not be listed here. If you are expecting to see a failed video here but do not, refresh the page or check errors.txt or unknown_errors.txt. <a href={parsedEnv.REACT_APP_REPO_URL + '#handling-download-errors'} target="_blank" rel="noopener noreferrer">Learn more</a></Alert>
                    {!!successMessage && <Alert variant="success">{successMessage}</Alert>}
                    {!!errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
                    <Button
                        className="me-2"
                        onClick={() => { repairError('retry') }}
                    >
                        Retry all
                    </Button>
                    <Button
                        className="me-2"
                        variant="danger"
                        onClick={() => { repairError('delete') }}
                    >
                        Delete all
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => { stopRepairing() }}
                    >
                        Stop
                    </Button>

                    {props.errors && props.errors.length > 0 ?
                        <>
                            {
                                props.errors.map((error, i) =>
                                    i < limit
                                        ? <Alert className='mt-3 mb-0' variant="danger" key={error._id}>
                                            {error.videoPath}
                                            <Accordion>
                                                <AccordionButton
                                                    variant="link"
                                                    eventKey="0"
                                                    className="d-inline-block p-0"
                                                >
                                                    Show details
                                                </AccordionButton>
                                                <Accordion.Collapse eventKey="0">
                                                    <>
                                                        <pre className="pre-scrollable">
                                                            {JSON.stringify(JSON.parse(error.errorObject), null, 4).replace(/\\n/g, '\n')}
                                                        </pre>
                                                        {!!error.success && <Alert variant="success">{error.success}</Alert>}
                                                        {!!error.error && <Alert variant="danger">{error.error}</Alert>}
                                                        <Button
                                                            href={parsedEnv.REACT_APP_REPO_URL + '/issues'}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="me-2"
                                                        >
                                                            Report error
                                                        </Button>
                                                        <Button
                                                            className="me-2"
                                                            onClick={(e) => { repairError('retry', error._id) }}
                                                        >
                                                            Retry
                                                        </Button>
                                                        <Button
                                                            className="me-2"
                                                            variant="danger"
                                                            onClick={(e) => { repairError('delete', error._id) }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </>
                                                </Accordion.Collapse>
                                            </Accordion>
                                        </Alert>
                                        : <></>
                                )
                            }
                            {!(props.errors.length <= limit) &&
                                <div className="text-center mt-3">
                                    <Button
                                        onClick={() => { setLimit(limit + 10) }}
                                    >
                                        Load more
                                    </Button>
                                </div>
                            }
                        </>
                        : <p className="text-center fw-bold">Nothing here</p>}
                </Card.Body>
            </Card>
        </>
    );
}

export default RetryImports;
