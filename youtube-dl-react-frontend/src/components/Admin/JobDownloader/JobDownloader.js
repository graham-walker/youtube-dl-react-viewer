import React, { Component } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { getErrorMessage, getWarningColor } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';

class JobDownloader extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
            selected: [],
        };
    }

    handleInputChange = (e) => {
        const { name, options } = e.target;
        this.setState({
            [name]: [...options]
                .filter(({ selected }) => selected)
                .map(({ value }) => value)
        })
    }

    onSubmit = (e) => {
        e.preventDefault();

        let formAction = e.target.name;
        this.setState({ success: undefined, error: undefined }, () => {
            if (formAction === 'download' && this.state.selected.length === 0) {
                scrollToElement('#download-anchor');
                return this.setState({ error: 'Select one or more jobs' });
            }

            axios
                .post(
                    `/api/admin/jobs/${formAction}`,
                    formAction === 'download'
                        ? this.state.selected
                        : undefined
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error
                    });
                    if (res.data.youtubeDlVersion) this.props.onYoutubeDlVersionChange(res.data.youtubeDlVersion);
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#download-anchor');
                });
        });
    }

    render() {
        return (
            <>
                <h5 id="download-anchor" className="mb-4">Download</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {this.props.jobs.length === 0 && <Alert variant="danger">You must create a job before you can download</Alert>}
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Form>
                            <Form.Group className="mb-3" controlId="name">
                                <Form.Control
                                    as="select"
                                    name="selected"
                                    onChange={this.handleInputChange}
                                    value={this.state.selected}
                                    disabled={this.props.jobs.length === 0}
                                    multiple
                                    style={{ resize: 'vertical', minHeight: 300 }}
                                >
                                    {this.props.jobs.map(job =>
                                        <option
                                            value={job._id}
                                            key={job._id}
                                            className={getWarningColor(job)}
                                        >
                                            {job.name}
                                        </option>
                                    )}
                                </Form.Control>
                            </Form.Group>
                            <Button
                                className="me-2"
                                name="download"
                                type="submit"
                                onClick={this.onSubmit}
                                disabled={this.props.jobs.length === 0}
                            >
                                Run
                            </Button>
                            <Button
                                name="stop"
                                type="submit"
                                onClick={this.onSubmit}
                                disabled={this.props.jobs.length === 0}
                            >
                                Stop
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

export default JobDownloader;
