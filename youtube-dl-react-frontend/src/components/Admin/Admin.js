import React, { Component } from 'react';
import { Tab, Form, Button, Accordion, Card, Nav, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { getErrorMessage, getWarningColor } from '../../utilities/format.utility';
import { UserContext } from '../../contexts/user.context';
import axios from '../../utilities/axios.utility';
import AccordionButton from '../AccordionButton/AccordionButton';

export default class AdminPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            success: undefined,
            error: undefined,
            jobs: [],
            errors: [],
            extractors: [],
            adminFiles: [],
            youtubeDlPath: undefined,
            defaultActivejobId: undefined,
        };
    }

    componentDidMount() {
        document.title = `Admin - ${window.documentTitle}`;

        axios
            .get('/api/admin').then(res => {
                if (res.status === 200) this.setState({
                    loading: false,
                    jobs: res.data.jobs,
                    errors: res.data.errors,
                    extractors: res.data.extractors,
                    adminFiles: res.data.adminFiles,
                    youtubeDlPath: res.data.youtubeDlPath,
                    defaultActivejobId: res.data.jobs[0]?._id,
                });
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    addJob(job) {
        this.setState({ jobs: [...this.state.jobs, job] });
    }

    setJob(job) {
        let jobs = [...this.state.jobs];
        for (let i = 0; i < jobs.length; i++) {
            if (jobs[i]._id === job._id) {
                jobs[i].name = job.name;
                break;
            }
        }
        this.setState({ jobs });
    }

    repairError = (errorId) => {
        axios
            .post(`/api/admin/errors/repair/${errorId}`)
            .then(res => {
                if (res.status === 200) {
                    if (res.data.success) alert(res.data.success)
                    if (res.data.error) alert(res.data.error)
                }
            }).catch(err => {
                alert(getErrorMessage(err));
            });
    }

    render() {
        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading &&
                    <div
                        className="mx-auto"
                        style={{ maxWidth: '1200px' }}
                    >
                        <h1 className="mb-4">Admin</h1>
                        {
                            !!process.env?.REACT_APP_CHECK_FOR_UPDATES
                            && process.env.REACT_APP_CHECK_FOR_UPDATES.toLowerCase() === 'true'
                            && <UpdateChecker />
                        }
                        {this.state.adminFiles.length > 0 &&
                            <>
                                <h5 className="mb-4">Logs</h5>
                                <div className="mb-3">
                                    {this.state.adminFiles.map(file => {
                                        return <Button href={'/static/admin/' + file} target="_blank" variant="outline-secondary" className="me-2 mb-2"><FontAwesomeIcon className="text-primary" icon="file" /> {file}</Button>
                                    })}
                                </div>
                            </>
                        }
                        <ApplicationManager youtubeDlPath={this.state.youtubeDlPath} />
                        <h5 className="mb-4">Download</h5>
                        <Card className="mb-4">
                            <Card.Body>
                                {this.state.jobs.length === 0 && <Alert variant="danger">You must create a job before you can download</Alert>}
                                <JobDownloader
                                    jobs={this.state.jobs}
                                />
                            </Card.Body>
                        </Card>
                        <h5 className="mb-4">Jobs</h5>
                        <Card className="mb-4">
                            <Tab.Container defaultActiveKey={this.state.defaultActivejobId || 'new'}>
                                <Card.Header>
                                    <Nav
                                        className="nav-tabs card-header-tabs"
                                        style={{ transform: 'translateY(1px)' }}
                                    >
                                        {this.state.jobs.map(job =>
                                            <Nav.Link
                                                eventKey={job._id}
                                                className="tab-constrained"
                                                title={job.name}
                                                key={job._id}
                                            >
                                                {job.name}
                                            </Nav.Link>
                                        )}
                                        <Nav.Link
                                            eventKey="new"
                                            className="tab-constrained"
                                            title="New Job"
                                        >
                                            <FontAwesomeIcon
                                                className="text-primary"
                                                icon="plus"
                                            />
                                        </Nav.Link>
                                    </Nav>
                                </Card.Header>
                                <Card.Body>
                                    <Tab.Content>
                                        {this.state.jobs.map(job =>
                                            <Tab.Pane
                                                eventKey={job._id}
                                                key={job._id}
                                            >
                                                <JobForm
                                                    job={job}
                                                    setJob={this.setJob.bind(this)}
                                                />
                                            </Tab.Pane>
                                        )}
                                        <Tab.Pane eventKey="new">
                                            <JobForm
                                                addJob={this.addJob.bind(this)}
                                                new
                                            />
                                        </Tab.Pane>
                                    </Tab.Content>
                                </Card.Body>
                            </Tab.Container>
                        </Card>
                        <VideoDeleter extractors={this.state.extractors} />
                        <ChannelIconDownloader />
                        <HashVerifier />
                        <h5 className="mb-4">Failed to import</h5>
                        <Alert variant="info">If you are expecting to see a video here but do not, check errors.txt or unknown_errors.txt in the output directory. Videos that failed to download will not be listed here and can be retried by rerunning the job.</Alert>
                        {this.state.errors.length > 0 ?
                            this.state.errors.map(error =>
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
                                                    onClick={(e) => { this.repairError(error._id) }}
                                                >
                                                    Retry Import
                                                </Button>
                                            </>
                                        </Accordion.Collapse>
                                    </Accordion>
                                </Alert>
                            )
                            : <p className="text-center fw-bold">Nothing here</p>}
                    </div>
                }
            </PageLoadWrapper>
        );
    }
}

class UpdateChecker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: undefined,
            variant: undefined,
        }
    }

    componentDidMount() {
        axios.get(window.githubApiLink, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
            }
        }).then(res => {
            if (res.status === 200) {
                if (res?.data?.tag_name) {
                    if (this.getVersionScore(res.data.tag_name) > this.getVersionScore(window.scriptVersion)) {
                        this.setState({
                            message: <>A <a
                                href={window.gitHubLatestReleaseLink}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                new release is available
                            </a> ({res.data.tag_name.slice(1)} &gt; {window.scriptVersion})</>,
                            variant: 'info',
                        });
                    } else if (this.getVersionScore(res.data.tag_name) === this.getVersionScore(window.scriptVersion)) {
                        this.setState({ message: `You are using the latest version (${window.scriptVersion})`, variant: 'success' });
                    } else {
                        this.setState({
                            message: `You are using a development version (${window.scriptVersion}).
                        Features may not be complete or may cause irreversible damage to the database`, variant: 'warning'
                        });
                    }
                } else {
                    this.setState({ message: 'Failed to check the latest version.', variant: 'danger' });
                }
            }
        }).catch(err => {
            this.setState({ message: 'Failed to check the latest version.', variant: 'danger' });
        });
    }

    getVersionScore = (tagName) => {
        if (tagName.startsWith('v')) tagName = tagName.slice(1);
        let versionNumbers = tagName.split('.').reverse();
        console.dir(versionNumbers)
        let score = 0;
        let scale = 1;
        for (let i = 0; i < versionNumbers.length; i++) {
            score += parseInt(versionNumbers[i]) * scale;
            scale *= 100;
        }
        console.log(tagName, score)
        return score;

    }

    render() {
        return (
            this.state.message ? <Alert variant={this.state.variant}>{this.state.message}</Alert> : <></>
        );
    }
}

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
                return this.setState({ error: 'Select one or more job' });
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
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        });
    }

    render() {
        return (
            <>
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
            </>
        );
    }
}

class JobForm extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            error: undefined,
            success: undefined,
            name: '',
            formatCode: defaultFormatCode,
            isAudioOnly: false,
            downloadComments: false,
            urls: '',
            arguments: defaultArguments,
            overrideUploader: '',
        }
        this.initialState = { ...this.state };
    }

    componentDidMount() {
        if (this.props.job) {
            let job = { ...this.props.job };
            delete job._id;
            this.setState(job);
        }
    }

    handleInputChange = (e) => {
        let { value, name, type } = e.target;
        if (type === 'checkbox') value = e.target.checked;
        if (name === 'isAudioOnly') {
            if (value) {
                if (this.state.formatCode === defaultFormatCode
                    || !this.state.formatCode
                ) this.setState({ formatCode: defaultFormatCodeAudioOnly });
            } else {
                if (this.state.formatCode === defaultFormatCodeAudioOnly
                    || !this.state.formatCode
                ) this.setState({ formatCode: defaultFormatCode });
            }
        }
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();

        let form = { ...this.state };
        delete form.error;
        this.setState({ error: undefined, success: undefined }, () => {
            axios
                .post('/api/admin/jobs/save/' + (this.props.new
                    ? 'new'
                    : this.props.job._id
                ), form).then(res => {
                    if (res.status === 200) {
                        if (this.props.new) {
                            let state = { ...this.initialState };
                            state.success = 'New job saved';
                            this.setState(state);
                            this.props.addJob(res.data);
                        } else {
                            this.setState({ success: 'Job saved' });
                            this.props.setJob(res.data);
                        }
                    }
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        })
    }
    render() {
        return (
            <>
                {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                {this.props.job?.lastCompleted &&
                    <p className={getWarningColor(this.props.job)}>Last downloaded: {new Date(this.props.job.lastCompleted).toLocaleString()}</p>
                }
                <Form onSubmit={this.onSubmit}>
                    <Form.Group className="mb-3" controlId={'name' + (this.props.job?._id || 'new')}>
                        <Form.Label>Job name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Job name"
                            name="name"
                            value={this.state.name}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'formatCode' + (this.props.job?._id || 'new')}>

                        <OverlayTrigger overlay={<Tooltip>Same as --format</Tooltip>}>
                            <Form.Label>Format code</Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                            type="text"
                            placeholder="Format code"
                            name="formatCode"
                            value={this.state.formatCode}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'isAudioOnly' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            custom
                            checked={this.state.isAudioOnly}
                            type="checkbox"
                            name="isAudioOnly"
                            label="Download audio only"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'downloadComments' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            custom
                            checked={this.state.downloadComments}
                            type="checkbox"
                            name="downloadComments"
                            label="Download comments (yt-dlp only)"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'username' + (this.props.job?._id || 'new')}>
                        <Form.Label>URLs</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows="5"
                            placeholder="Enter URLs, one per line. Lines starting with '#', ';' or ']' are ignored"
                            name="urls"
                            value={this.state.urls}
                            onChange={this.handleInputChange}
                            required
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
                                <Form.Group className="mb-3" controlId={'arguments' + (this.props.job?._id || 'new')}>
                                    <OverlayTrigger overlay={<Tooltip>Set the arguments used when executing youtube-dl</Tooltip>}>
                                        <Form.Label>Override config</Form.Label>
                                    </OverlayTrigger>
                                    <Form.Control
                                        as="textarea"
                                        rows="10"
                                        placeholder="Enter options, one per line. Lines starting with '#', ';' or ']' are ignored"
                                        name="arguments"
                                        value={this.state.arguments}
                                        onChange={this.handleInputChange}
                                        required
                                    >
                                        {defaultArguments}
                                    </Form.Control>
                                </Form.Group>
                                <Form.Group className="mb-3" controlId={'overrideUploader' + (this.props.job?._id || 'new')}>
                                    <OverlayTrigger overlay={<Tooltip>Set the uploader. Useful when downloading from websites that do not return uploader in their metadata</Tooltip>}>
                                        <Form.Label>Override uploader</Form.Label>
                                    </OverlayTrigger>
                                    <Form.Control
                                        type="text"
                                        placeholder="Uploader name"
                                        name="overrideUploader"
                                        value={this.state.overrideUploader}
                                        onChange={this.handleInputChange}
                                    />
                                </Form.Group>
                            </>
                        </Accordion.Collapse>
                    </Accordion>
                    <Button type="submit">Save</Button>
                </Form>
            </>
        );
    }
}

class ApplicationManager extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
        };
    }

    componentDidMount() {
        if (!this.props.youtubeDlPath) {
            this.setState({ error: 'Environment variable YOUTUBE_DL_PATH is not set' });
        }
    }

    post() {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    `/api/admin/youtube-dl/update`
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        });
    }

    render() {
        return (
            <>
                <h5 className="mb-4">youtube-dl</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <p>Using <code><span style={{ color: '#569CD6' }}>YOUTUBE_DL_PATH</span>=<span style={{ color: '#CE9178' }}>{this.props.youtubeDlPath}</span></code></p>
                        <Button
                            name="update"
                            type="submit"
                            onClick={this.post.bind(this)}
                            disabled={!this.props.youtubeDlPath}
                        >
                            Update
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

class ChannelIconDownloader extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
        };
        this.post = this.post.bind(this);
    }

    post(force = false) {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    '/api/admin/download_uploader_icons?force=' + force
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        });
    }

    render() {
        return (
            <>
                <h5 className="mb-4">Uploader icons</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Button
                            name="update"
                            type="submit"
                            onClick={() => this.post()}
                            className="me-2"
                        >
                            Download
                        </Button>
                        <Button
                            name="update"
                            type="submit"
                            onClick={() => this.post(true)}
                        >
                            Download (overwrite)
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

class HashVerifier extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
        };
    }

    post() {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    '/api/admin/verify_hashes'
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        });
    }

    render() {
        return (
            <>
                <h5 className="mb-4">File integrity</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Button
                            name="update"
                            type="submit"
                            onClick={this.post.bind(this)}
                            className="me-2"
                        >
                            Verify file hashes
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

class VideoDeleter extends Component {
    static contextType = UserContext;

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
                <h5 className="mb-4">Delete videos</h5>
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
                                    {this.props.extractors.map(extractor => <option value={extractor}>{extractor}</option>)}
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
                                custom
                                checked={this.state.preventRedownload}
                                type="checkbox"
                                name="preventRedownload"
                                label={
                                    <OverlayTrigger overlay={<Tooltip>Video IDs will not be deleted from archive.txt</Tooltip>}>
                                        <Form.Label>Prevent videos from being redownloaded</Form.Label>
                                    </OverlayTrigger>
                                }
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
                            onClick={() => {
                                let ok = window.confirm('Are you sure you want to delete?');
                                if (ok) this.post();
                            }}
                            variant="danger"
                        >
                            Delete
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

const defaultArguments = `# Sign in to websites:
#--cookies "/Path/To/cookies.txt"

# These options will BREAK the script, do not set them:
#--batch-file
#--keep-fragments

# These options are set by the script, they will be overridden:
#--exec
#--write-info-json
#--prefer-ffmpeg
#--ffmpeg-location 
#--output
#--format
#--extract-audio
#--download-archive
#--cache-dir
#--write-comments

# These options are set by the script if using the yt-dlp, they will be overridden:
#--compat-options youtube-dl

# These options are not required, but are used by default:
#--write-all-thumbnails can be replaced with --write-thumbnail
#--all-subs can be replaced with --write-sub or --write-auto-sub
#--merge-output-format can cause downloads to fail depending on the format code used
--write-description
--write-annotations
--write-all-thumbnails
--all-subs
--merge-output-format mkv
--add-metadata
--xattrs
--xattr-set-filesize
--no-overwrites
--no-continue
--ignore-errors

# These options may help the script, but are not necessary:
#--geo-bypass
#--force-ipv4
#--match-filter "!is_live & !live"

# Prevent 429 errors:
#--sleep-interval 5
#--max-sleep-interval 30

# These options are recommended if using yt-dlp:
#--sleep-requests 1
#--datebefore "$(date --date="30 days ago" +%Y%m%d)"
`;
const defaultFormatCode = '(bestvideo[vcodec^=av01][height>=4320][fps>30]/bestvideo[vcodec^=vp9.2][height>=4320][fps>30]/bestvideo[vcodec^=vp9][height>=4320][fps>30]/bestvideo[vcodec^=avc1][height>=4320][fps>30]/bestvideo[height>=4320][fps>30]/bestvideo[vcodec^=av01][height>=4320]/bestvideo[vcodec^=vp9.2][height>=4320]/bestvideo[vcodec^=vp9][height>=4320]/bestvideo[vcodec^=avc1][height>=4320]/bestvideo[height>=4320]/bestvideo[vcodec^=av01][height>=2880][fps>30]/bestvideo[vcodec^=vp9.2][height>=2880][fps>30]/bestvideo[vcodec^=vp9][height>=2880][fps>30]/bestvideo[vcodec^=avc1][height>=2880][fps>30]/bestvideo[height>=2880][fps>30]/bestvideo[vcodec^=av01][height>=2880]/bestvideo[vcodec^=vp9.2][height>=2880]/bestvideo[vcodec^=vp9][height>=2880]/bestvideo[vcodec^=avc1][height>=2880]/bestvideo[height>=2880]/bestvideo[vcodec^=av01][height>=2160][fps>30]/bestvideo[vcodec^=vp9.2][height>=2160][fps>30]/bestvideo[vcodec^=vp9][height>=2160][fps>30]/bestvideo[vcodec^=avc1][height>=2160][fps>30]/bestvideo[height>=2160][fps>30]/bestvideo[vcodec^=av01][height>=2160]/bestvideo[vcodec^=vp9.2][height>=2160]/bestvideo[vcodec^=vp9][height>=2160]/bestvideo[vcodec^=avc1][height>=2160]/bestvideo[height>=2160]/bestvideo[vcodec^=av01][height>=1440][fps>30]/bestvideo[vcodec^=vp9.2][height>=1440][fps>30]/bestvideo[vcodec^=vp9][height>=1440][fps>30]/bestvideo[vcodec^=avc1][height>=1440][fps>30]/bestvideo[height>=1440][fps>30]/bestvideo[vcodec^=av01][height>=1440]/bestvideo[vcodec^=vp9.2][height>=1440]/bestvideo[vcodec^=vp9][height>=1440]/bestvideo[vcodec^=avc1][height>=1440]/bestvideo[height>=1440]/bestvideo[vcodec^=av01][height>=1080][fps>30]/bestvideo[vcodec^=vp9.2][height>=1080][fps>30]/bestvideo[vcodec^=vp9][height>=1080][fps>30]/bestvideo[vcodec^=avc1][height>=1080][fps>30]/bestvideo[height>=1080][fps>30]/bestvideo[vcodec^=av01][height>=1080]/bestvideo[vcodec^=vp9.2][height>=1080]/bestvideo[vcodec^=vp9][height>=1080]/bestvideo[vcodec^=avc1][height>=1080]/bestvideo[height>=1080]/bestvideo[vcodec^=av01][height>=720][fps>30]/bestvideo[vcodec^=vp9.2][height>=720][fps>30]/bestvideo[vcodec^=vp9][height>=720][fps>30]/bestvideo[vcodec^=avc1][height>=720][fps>30]/bestvideo[height>=720][fps>30]/bestvideo[vcodec^=av01][height>=720]/bestvideo[vcodec^=vp9.2][height>=720]/bestvideo[vcodec^=vp9][height>=720]/bestvideo[vcodec^=avc1][height>=720]/bestvideo[height>=720]/bestvideo[vcodec^=av01][height>=480][fps>30]/bestvideo[vcodec^=vp9.2][height>=480][fps>30]/bestvideo[vcodec^=vp9][height>=480][fps>30]/bestvideo[vcodec^=avc1][height>=480][fps>30]/bestvideo[height>=480][fps>30]/bestvideo[vcodec^=av01][height>=480]/bestvideo[vcodec^=vp9.2][height>=480]/bestvideo[vcodec^=vp9][height>=480]/bestvideo[vcodec^=avc1][height>=480]/bestvideo[height>=480]/bestvideo[vcodec^=av01][height>=360][fps>30]/bestvideo[vcodec^=vp9.2][height>=360][fps>30]/bestvideo[vcodec^=vp9][height>=360][fps>30]/bestvideo[vcodec^=avc1][height>=360][fps>30]/bestvideo[height>=360][fps>30]/bestvideo[vcodec^=av01][height>=360]/bestvideo[vcodec^=vp9.2][height>=360]/bestvideo[vcodec^=vp9][height>=360]/bestvideo[vcodec^=avc1][height>=360]/bestvideo[height>=360]/bestvideo[vcodec^=av01][height>=240][fps>30]/bestvideo[vcodec^=vp9.2][height>=240][fps>30]/bestvideo[vcodec^=vp9][height>=240][fps>30]/bestvideo[vcodec^=avc1][height>=240][fps>30]/bestvideo[height>=240][fps>30]/bestvideo[vcodec^=av01][height>=240]/bestvideo[vcodec^=vp9.2][height>=240]/bestvideo[vcodec^=vp9][height>=240]/bestvideo[vcodec^=avc1][height>=240]/bestvideo[height>=240]/bestvideo[vcodec^=av01][height>=144][fps>30]/bestvideo[vcodec^=vp9.2][height>=144][fps>30]/bestvideo[vcodec^=vp9][height>=144][fps>30]/bestvideo[vcodec^=avc1][height>=144][fps>30]/bestvideo[height>=144][fps>30]/bestvideo[vcodec^=av01][height>=144]/bestvideo[vcodec^=vp9.2][height>=144]/bestvideo[vcodec^=vp9][height>=144]/bestvideo[vcodec^=avc1][height>=144]/bestvideo[height>=144]/bestvideo)+(bestaudio[acodec^=opus]/bestaudio)/best';
const defaultFormatCodeAudioOnly = '(bestaudio[acodec^=opus]/bestaudio)/best';
