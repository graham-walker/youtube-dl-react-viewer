import { Button, Accordion, Alert } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';
import AccordionButton from '../../AccordionButton/AccordionButton';

const RetryImports = (props) => {

    const repairError = (errorId) => {
        axios
            .post(`/api/admin/errors/repair/${errorId}`)
            .then(res => {
                if (res.status === 200) {
                    if (res.data.success) alert(res.data.success);
                    if (res.data.error) alert(res.data.error);
                }
            }).catch(err => {
                alert(getErrorMessage(err));
            });
    }

    return (
        <>
            <h5 className="mb-4">Failed to import</h5>
            <Alert variant="info">If you are expecting to see a video here but do not, check errors.txt or unknown_errors.txt. Videos that failed to download will not be listed here.</Alert>
            {props.errors && props.errors.length > 0 ?
                props.errors.map(error =>
                    <Alert variant="danger" key={error._id}>
                        {error.videoPath}
                        <Accordion>
                            <AccordionButton
                                variant="link"
                                eventKey="0"
                                className="d-inline-block p-0"
                            >
                                Show Details
                            </AccordionButton>
                            <Accordion.Collapse eventKey="0">
                                <>
                                    <pre className="pre-scrollable">
                                        {JSON.stringify(JSON.parse(error.errorObject), null, 4).replace(/\\n/g, '\n')}
                                    </pre>
                                    {!!error.success && <Alert variant="success">{error.success}</Alert>}
                                    {!!error.error && <Alert variant="danger">{error.error}</Alert>}
                                    <Button
                                        href={window.gitHubLink + '/issues'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="danger"
                                        className="me-2"
                                    >
                                        Report Error
                                    </Button>
                                    <Button
                                        className="me-2"
                                        variant="danger"
                                        onClick={(e) => { repairError(error._id) }}
                                    >
                                        Retry Import
                                    </Button>
                                </>
                            </Accordion.Collapse>
                        </Accordion>
                    </Alert>
                )
                : <p className="text-center fw-bold">Nothing here</p>}
        </>
    );
}

export default RetryImports;
