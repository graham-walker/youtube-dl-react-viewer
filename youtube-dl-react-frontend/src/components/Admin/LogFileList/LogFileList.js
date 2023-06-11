import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const LogFileList = (props) => {
    return (
        (props.adminFiles && props.adminFiles.length > 0)
            ? <>
                <h5 className="mb-4">Logs</h5>
                <div className="mb-3">
                    {props.adminFiles.map((file, i) => {
                        return <Button key={i} href={`${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : ''}/static/admin/${file}`} target="_blank" variant="outline-secondary" className="me-2 mb-2"><FontAwesomeIcon className="text-primary" icon="file" /> {file}</Button>
                    })}
                </div>
            </>
            : <></>
    )
}

export default LogFileList;
