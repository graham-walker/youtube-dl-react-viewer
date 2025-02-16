import React, { Component } from 'react';
import { Form, Button, Card, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';

class VideoDeleter extends Component {
    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
            uploader: '',
            playlist: '',
            job: '',
            extractor: '',
            id: '',
            uploadStart: '',
            uploadEnd: '',
            preventRedownload: false,
            showConfirm: false,
        };
    }

    post(preview = false) {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    `/api/admin/delete/?preview=${preview}`, {
                    uploader: this.state.uploader,
                    playlist: this.state.playlist,
                    job: this.state.job,
                    extractor: this.state.extractor,
                    id: this.state.id,
                    uploadStart: this.state.uploadStart,
                    uploadEnd: this.state.uploadEnd,
                    preventRedownload: this.state.preventRedownload,
                }
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error,
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#delete-videos-anchor');
                });
        });
    }

    handleInputChange = (e) => {
        var { value, name, type } = e.target;
        if (type === 'checkbox') value = e.target.checked;
        this.setState({ [name]: value });
    }

    render() {
        return (
            <>
                <h5 id="delete-videos-anchor" className="mb-4">Delete videos</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Form className="form-inline mb-1" id="delete-form">
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="uploader">
                                <Form.Label className="mb-0 me-2">Uploader: </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="uploader"
                                    value={this.state.uploader}
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="playlist">
                                <Form.Label className="mb-0 me-2">Playlist ID: </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="playlist"
                                    value={this.state.playlist}
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="job">
                                <Form.Label className="mb-0 me-2">Job: </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="job"
                                    value={this.state.job}
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="extractor">
                                <Form.Label className="mb-0 me-2">Extractor: </Form.Label>
                                <Form.Select
                                    name="extractor"
                                    onChange={this.handleInputChange}
                                    value={this.state.extractor}
                                >
                                    <option value="">Any</option>
                                    {this.props.extractors.map((extractor, i) => <option value={extractor} key={i}>{extractor}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="id">
                                <Form.Label className="mb-0 me-2">Video ID: </Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="id"
                                    value={this.state.id}
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="uploadStart">
                                <Form.Label className="mb-0 me-2">Between: </Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    name="uploadStart"
                                    value={this.state.uploadStart}
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 d-flex align-items-center" controlId="uploadEnd">
                                <Form.Label className="mb-0 me-2">And: </Form.Label>
                                <Form.Control
                                    type="datetime-local"
                                    name="uploadEnd"
                                    value={this.state.uploadEnd}
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                        </Form>
                        <Form.Group className="mb-3" controlId="preventRedownload">
                            <Form.Check
                                checked={this.state.preventRedownload}
                                type="checkbox"
                                name="preventRedownload"
                                label="Prevent videos from being redownloaded"
                                id="preventRedownload"
                                onChange={this.handleInputChange}
                            />
                        </Form.Group>
                        <Button
                            onClick={() => this.post(true)}
                            className="me-2"
                        >
                            Preview
                        </Button>
                        <Button
                            onClick={() => this.setState({ showConfirm: true })}
                            variant="danger"
                        >
                            Delete
                        </Button>
                        <ConfirmModal
                            show={this.state.showConfirm}
                            onHide={() => this.setState({ showConfirm: false })}
                            onConfirm={() => {
                                this.setState({ showConfirm: false });
                                this.post();
                            }}
                            title="Delete videos"
                        />
                    </Card.Body>
                </Card>
            </>
        );
    }
}

export default VideoDeleter;
