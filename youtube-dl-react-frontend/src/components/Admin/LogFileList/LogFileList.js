import { useEffect, useRef, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';

const LogFileList = (props) => {

    const consoleOutputRef = useRef();
    const [adminFiles, setAdminFiles] = useState(props.adminFiles);
    const [consoleOutput, setConsoleOutput] = useState(props.consoleOutput);

    useEffect(() => {
        if (consoleOutputRef.current) consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
    }, []);

    const updateLogs = () => {
        axios
            .get(`/api/admin/logs`
            ).then(res => {
                setAdminFiles(res.data.adminFiles);
                setConsoleOutput(res.data.consoleOutput);
                if (consoleOutputRef.current) consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
            }).catch(err => {
                alert(getErrorMessage(err));
            });
    };

    return (
        <>
            <h5 className="mb-4">Logs</h5>
            <Card className="mb-4">
                <Card.Body>
                    {adminFiles && adminFiles.length > 0 && adminFiles.map((file, i) => {
                        return <Button key={i} href={`${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : ''}/static/admin/${file}`} target="_blank" variant="outline-secondary" className="me-2 mb-2"><FontAwesomeIcon className="text-primary" icon="file" /> {file}</Button>
                    })}
                    <Form.Group className="mb-3">
                        <Form.Label>Console output</Form.Label>
                        <div id="logs">
                            <div ref={consoleOutputRef}>
                                {consoleOutput && consoleOutput.length > 0 && consoleOutput.map((line, i) => <span key={i} className={`text-${line.level}`}>{line.msg}</span>)}
                            </div>
                        </div>
                    </Form.Group>
                    <Button
                        onClick={() => updateLogs()}
                    >
                        Refresh
                    </Button>
                </Card.Body>
            </Card>
        </>
    )
}

export default LogFileList;
