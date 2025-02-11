import { Modal, Button } from 'react-bootstrap';

const AlertModal = ({ show, onHide, title, message, confirmText }) => {
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{title || 'Alert'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {message}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={onHide}>
                    {confirmText || 'OK'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AlertModal;
