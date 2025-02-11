import { useEffect, useRef, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';

const LogFileList = (props) => {

    const consoleOutputRef = useRef();
    const [adminFiles, setAdminFiles] = useState(props.adminFiles);
    const [consoleOutput, setConsoleOutput] = useState(props.consoleOutput);
    const [autoConsoleRefresh, setAutoConsoleRefresh] = useState(localStorage.getItem('autoConsoleRefresh') === null ? true : localStorage.getItem('autoConsoleRefresh') === 'true');
    const intervalRef = useRef();
    const historyUpdatedRef = useRef(props.historyUpdated);

    useEffect(() => {
        if (consoleOutputRef.current) consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (autoConsoleRefresh) {
            intervalRef.current = setInterval(() => {
                updateLogs(true);
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
    }, [autoConsoleRefresh]);

    const updateLogs = (auto = false) => {
        axios
            .get(`/api/admin/logs`
            ).then(res => {
                setAdminFiles(res.data.adminFiles);

                if (!auto || historyUpdatedRef.current < res.data.historyUpdated) {
                    setConsoleOutput(res.data.consoleOutput);
                    if (consoleOutputRef.current) consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
                }
                historyUpdatedRef.current = res.data.historyUpdated;

                if (!auto) scrollToElement('#logs-anchor');
            }).catch(err => {
                console.error(getErrorMessage(err));
            });
    };

    return (
        <>
            <h5 id="logs-anchor" className="mb-4">Logs</h5>
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
                    <Form.Check
                        checked={autoConsoleRefresh}
                        type="switch"
                        name="autoConsoleRefresh"
                        label="Auto-refresh"
                        id="autoConsoleRefresh"
                        onChange={(e) => {
                            const checked = e.target.checked;
                            setAutoConsoleRefresh(checked);
                            localStorage.setItem('autoConsoleRefresh', checked.toString());
                            if (checked) updateLogs();
                        }}
                        className="ms-2 mt-2"
                        style={{ float: 'right' }}
                    />
                </Card.Body>
            </Card>
        </>
    )
}

export default LogFileList;
