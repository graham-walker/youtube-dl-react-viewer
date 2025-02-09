import React, { Component } from 'react';
import { Form, Button, Accordion, Card, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getErrorMessage } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import AccordionButton from '../../AccordionButton/AccordionButton';
import { scrollToElement } from '../../../utilities/scroll.utility';
import parsedEnv from '../../../parse-env';

class VideoImporter extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
            folder: '',
            jobName: '',
            subfolders: true,
            copy: true,
            continueOnFailed: false,
            overrideExt: '',
        };
    }

    onSubmit = (e) => {
        e.preventDefault();

        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    `/api/admin/import/`, {
                    folder: this.state.folder,
                    jobName: this.state.jobName,
                    subfolders: this.state.subfolders,
                    copy: this.state.copy,
                    continueOnFailed: this.state.continueOnFailed,
                    overrideExt: this.state.overrideExt,
                }
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error,
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#import-videos-anchor');
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
                <h5 id="import-videos-anchor" className="mb-4">Import videos</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {this.props.jobs.length === 0 && <Alert variant="danger">You must create a job before you can import</Alert>}
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Form onSubmit={this.onSubmit}>
                            <Form.Group className="mb-3" controlId="folder">
                                <Form.Label>Folder to import</Form.Label>
                                {parsedEnv.REACT_APP_RUNNING_IN_DOCKER && <Alert variant='warning'>When installed using Docker videos must be copied into the container before they can be imported. <a href={parsedEnv.REACT_APP_REPO_URL + '#importing-already-downloaded-videos'} target='_blank'>Learn more</a></Alert>}
                                <Form.Control
                                    type="text"
                                    placeholder={parsedEnv.REACT_APP_RUNNING_IN_DOCKER ? '/youtube-dl/TEMP' : 'C:\\Your\\Existing\\Downloads'}
                                    name="folder"
                                    value={this.state.folder}
                                    onChange={this.handleInputChange}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="jobName">
                                <OverlayTrigger overlay={<Tooltip>Imported videos will appear in the web app as if they were downloaded by the specified job</Tooltip>}>
                                    <Form.Label>Add imported videos to job <FontAwesomeIcon icon="circle-info" /></Form.Label>
                                </OverlayTrigger>
                                <Form.Select
                                    name="jobName"
                                    onChange={this.handleInputChange}
                                    value={this.state.jobName}
                                    disabled={this.props.jobs.length === 0}
                                    required
                                >
                                    <option value="">—Select One—</option>
                                    {this.props.jobs.map((job, i) => <option value={job.name} key={i}>{job.name}</option>)}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="subfolders">
                                <Form.Check
                                    checked={this.state.subfolders}
                                    type="checkbox"
                                    name="subfolders"
                                    label="Search subfolders"
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="copy">
                                <Form.Check
                                    checked={this.state.copy}
                                    type="checkbox"
                                    name="copy"
                                    label="Copy files instead of moving them"
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="continueOnFailed">
                                <Form.Check
                                    checked={this.state.continueOnFailed}
                                    type="checkbox"
                                    name="continueOnFailed"
                                    label={
                                        <OverlayTrigger overlay={<Tooltip>If a video fails to import, continue to the next video instead of stopping</Tooltip>}>
                                            <Form.Label>Continue on failed <FontAwesomeIcon icon="circle-info" /></Form.Label>
                                        </OverlayTrigger>
                                    }
                                    onChange={this.handleInputChange}
                                />
                            </Form.Group>
                            <Accordion>
                                <AccordionButton
                                    variant="link"
                                    eventKey="0"
                                    className="mb-3 d-inline-block p-0"
                                >
                                    Advanced options
                                </AccordionButton>
                                <Accordion.Collapse eventKey="0">
                                    <>
                                        <Form.Group className="mb-3" controlId="overrideExt">
                                            <OverlayTrigger overlay={<Tooltip>Specify a video extention for the importer to look for if it cannot be determined automatically</Tooltip>}>
                                                <Form.Label>Override ext <FontAwesomeIcon icon="circle-info" /></Form.Label>
                                            </OverlayTrigger>
                                            <Form.Control
                                                type="text"
                                                placeholder="Video file extension"
                                                name="overrideExt"
                                                value={this.state.overrideExt}
                                                onChange={this.handleInputChange}
                                            />
                                        </Form.Group>
                                    </>
                                </Accordion.Collapse>
                            </Accordion>
                            <Button type="submit" disabled={this.props.jobs.length === 0}>Import</Button>
                        </Form>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

export default VideoImporter;