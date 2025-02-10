import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const ConfirmModal = ({ show, onHide, onConfirm, title, message, checkboxText, confirmText, cancelText }) => {
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        setChecked(false);
    }, [show]);

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>{title || 'Confirm'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {message || (checkboxText ? '' : 'Are you sure?')}
                {checkboxText &&
                    <Form.Check
                        checked={checked}
                        type="checkbox"
                        label={checkboxText}
                        id="modal-checkbox"
                        onChange={(e) => setChecked(e.target.checked)}
                    />
                }
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    {cancelText || 'Cancel'}
                </Button>
                <Button variant="primary" onClick={() => onConfirm(checked)}>
                    {confirmText || 'Confirm'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConfirmModal;
