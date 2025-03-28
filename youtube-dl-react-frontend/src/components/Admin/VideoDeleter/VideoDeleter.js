import React, { Component } from 'react';
import { Form, Button, Card, Alert, InputGroup } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import axios from '../../../utilities/axios.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';
import ConfirmModal from '../../ConfirmModal/ConfirmModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
                        <Form className="form-inline mb-1" id="mass-delete-form">
                            <div className='w-100 text-secondary' style={{ marginBottom: '-0.5rem' }}>
                                <small><FontAwesomeIcon icon="circle-info" className='me-1' />Surround text in quotes "like this" to look for an exact match</small>
                            </div>
                            <InputGroup className="w-100">
                                <InputGroup.Text><FontAwesomeIcon icon="database" />Video ID</InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="id"
                                    value={this.state.id}
                                    onChange={this.handleInputChange}
                                />
                            </InputGroup>
                            <InputGroup className="half">
                                <InputGroup.Text><FontAwesomeIcon icon="user" />Uploader</InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="uploader"
                                    value={this.state.uploader}
                                    onChange={this.handleInputChange}
                                />
                            </InputGroup>
                            <InputGroup className="half">
                                <InputGroup.Text><FontAwesomeIcon icon="list" />Playlist</InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Any"
                                    name="playlist"
                                    value={this.state.playlist}
                                    onChange={this.handleInputChange}
                                />
                            </InputGroup>
                            <InputGroup className="half">
                                <InputGroup.Text><FontAwesomeIcon icon="briefcase" />Job</InputGroup.Text>
                                <Form.Select
                                    name="job"
                                    onChange={this.handleInputChange}
                                    value={this.state.job}
                                >
                                    <option value="">Any</option>
                                    {this.props.jobs.map((job, i) => <option value={job._id} key={i}>{job.name}</option>)}
                                </Form.Select>
                            </InputGroup>
                            <InputGroup className="half">
                                <InputGroup.Text><FontAwesomeIcon icon="globe" />Website</InputGroup.Text>
                                <Form.Select
                                    name="extractor"
                                    onChange={this.handleInputChange}
                                    value={this.state.extractor}
                                >
                                    <option value="">Any</option>
                                    {this.props.extractors.map((extractor, i) => <option value={extractor} key={i}>{extractor}</option>)}
                                </Form.Select>
                            </InputGroup>
                            <InputGroup className="half">
                                <InputGroup.Text><FontAwesomeIcon icon="calendar-alt" />After</InputGroup.Text>
                                <Form.Control
                                    type="datetime-local"
                                    name="uploadStart"
                                    value={this.state.uploadStart}
                                    onChange={this.handleInputChange}
                                />
                            </InputGroup>
                            <InputGroup className="half">
                                <InputGroup.Text><FontAwesomeIcon icon="calendar-alt" />Before</InputGroup.Text>
                                <Form.Control
                                    type="datetime-local"
                                    name="uploadEnd"
                                    value={this.state.uploadEnd}
                                    onChange={this.handleInputChange}
                                />
                            </InputGroup>
                        </Form>
                        <Form.Group className="mt-2 mb-3" controlId="preventRedownload">
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
