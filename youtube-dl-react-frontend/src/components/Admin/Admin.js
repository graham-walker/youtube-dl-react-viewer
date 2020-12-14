import React, { Component } from 'react';
import { Tab, Form, Button, Accordion, Card, Nav, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { getErrorMessage } from '../../utilities/format.utility';
import { UserContext } from '../../contexts/user.context';
import axios from '../../utilities/axios.utility';

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
                    if (res.data.error) alert('Error: ' + res.data.error)
                }
            }).catch(err => {
                alert('Error: ' + getErrorMessage(err));
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
                        <h5 className="mb-4">youtube-dl</h5>
                        <Card className="mb-4">
                            <Card.Body>
                                <ApplicationManager />
                            </Card.Body>
                        </Card>
                        <h5 className="mb-4">Download</h5>
                        <Card className="mb-4">
                            <Card.Body>
                                <JobDownloader
                                    jobs={this.state.jobs}
                                />
                            </Card.Body>
                        </Card>
                        <h5 className="mb-4">Edit jobs</h5>
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
                                                title={job.name}
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
                        <h5 className="mb-4">Failed downloads</h5>
                        <Alert variant="info">If you are expecting to see a error here but do not, check the errors.txt or unknown errors.txt file in the output directory.</Alert>
                        {this.state.errors.length > 0 ?
                            this.state.errors.map(error =>
                                <Alert variant="danger" key={error._id}>
                                    {error.videoPath}
                                    <Accordion>
                                        <Accordion.Toggle
                                            as="a"
                                            variant="link"
                                            eventKey="0"
                                            className="d-inline-block"
                                        >
                                            Show Details
                                    </Accordion.Toggle>
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
                                                    className="mr-2"
                                                >
                                                    Report Error
                                                </Button>
                                                <Button
                                                    className="mr-2"
                                                    variant="danger"
                                                    onClick={(e) => { this.repairError(error._id) }}
                                                >
                                                    Attempt Repair
                                                </Button>
                                            </>
                                        </Accordion.Collapse>
                                    </Accordion>
                                </Alert>
                            )
                            :
                            <p className="text-center font-weight-bold">Nothing here</p>}
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
                            message: <>A new release of youtube-dl-react-viewer is available ({res.data.tag_name.slice(1)} &gt; {window.scriptVersion}). <a
                                href={window.gitHubLatestReleaseLink}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Download it here.
                            </a></>,
                            variant: 'info',
                        });
                    } else {
                        this.setState({ message: `You are using the latest version of youtube-dl-react-viewer (${window.scriptVersion}).`, variant: 'success' });
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
            <Alert variant={this.state.variant}>{this.state.message}</Alert>
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
                    <Form.Group controlId="name">
                        <Form.Control
                            as="select"
                            name="selected"
                            onChange={this.handleInputChange}
                            value={this.state.selected}
                            disabled={this.props.jobs.length === 0}
                            multiple
                        >
                            {this.props.jobs.map(job =>
                                <option
                                    value={job._id}
                                    key={job._id}
                                >
                                    {job.name}
                                </option>
                            )}
                        </Form.Control>
                    </Form.Group>
                    <Button
                        className="mr-2"
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
                    <p className="text-muted">Last completed: {this.props.job.lastCompleted.toLocaleString()}</p>
                }
                <Form onSubmit={this.onSubmit}>
                    <Form.Group controlId={'name' + (this.props.job?._id || 'new')}>
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
                    <Form.Group controlId={'formatCode' + (this.props.job?._id || 'new')}>
                        <Form.Label>Format code</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Format code"
                            name="formatCode"
                            value={this.state.formatCode}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId={'isAudioOnly' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            custom
                            checked={this.state.isAudioOnly}
                            type="checkbox"
                            name="isAudioOnly"
                            label="Download audio only"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId={'username' + (this.props.job?._id || 'new')}>
                        <Form.Label>URL list</Form.Label>
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
                        <Accordion.Toggle
                            as="a"
                            variant="link"
                            eventKey="0"
                            className="mb-3 d-inline-block"
                        >
                            Advanced options
                        </Accordion.Toggle>
                        <Accordion.Collapse eventKey="0">
                            <>
                                <Form.Group controlId={'arguments' + (this.props.job?._id || 'new')}>
                                    <Form.Label>Override config</Form.Label>
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
                                <Form.Group controlId={'overrideUploader' + (this.props.job?._id || 'new')}>
                                    <Form.Label>Override uploader</Form.Label>
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
                {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                <Button
                    name="update"
                    type="submit"
                    onClick={this.post.bind(this)}
                >
                    Check for updates
                </Button>
            </>
        );
    }
}

const defaultArguments = `# Some options are not included here are are set when executing youtube-dl. If you attempt to set those options here they will be overwritten.
# Some options here should not be modified or if modified should only contain certain values.
# You should be able set most other youtube-dl options without preventing the script from working properly.

# These options will BREAK the script, do not set them:
# --batch-file
# --keep-fragments

# These options are set by the script when executing youtube-dl. Do not include them here, they will be overridden:
# --exec
# --write-info-json
# --prefer-ffmpeg
# --ffmpeg-location 
# --output
# --format
# --extract-audio
# --download-archive
# --cache-dir

# These options may help the script run but are not necessary. They can be freely modified or removed:
--geo-bypass
--force-ipv4

# If you are encountering 429 errors on YouTube you might want to consider including these options, or signing in:
#--sleep-interval 5
#--max-sleep-interval 30
#--cookies "/Path/To/cookies.txt"

# These options are not required, but are preferred by the script:
# --write-all-thumbnails can be replaced with --write-thumbnail and --all-subs can be replaced with --write-sub or --write-auto-sub
--write-description
--write-annotations
--write-all-thumbnails
--all-subs
--sub-format srt
--merge-output-format mkv
--add-metadata
--xattrs
--xattr-set-filesize
--no-overwrites
--no-continue
--ignore-errors`;
const defaultFormatCode = '(bestvideo[vcodec^=av01][height>=4320][fps>30]/bestvideo[vcodec^=vp9.2][height>=4320][fps>30]/bestvideo[vcodec^=vp9][height>=4320][fps>30]/bestvideo[vcodec^=avc1][height>=4320][fps>30]/bestvideo[height>=4320][fps>30]/bestvideo[vcodec^=av01][height>=4320]/bestvideo[vcodec^=vp9.2][height>=4320]/bestvideo[vcodec^=vp9][height>=4320]/bestvideo[vcodec^=avc1][height>=4320]/bestvideo[height>=4320]/bestvideo[vcodec^=av01][height>=2880][fps>30]/bestvideo[vcodec^=vp9.2][height>=2880][fps>30]/bestvideo[vcodec^=vp9][height>=2880][fps>30]/bestvideo[vcodec^=avc1][height>=2880][fps>30]/bestvideo[height>=2880][fps>30]/bestvideo[vcodec^=av01][height>=2880]/bestvideo[vcodec^=vp9.2][height>=2880]/bestvideo[vcodec^=vp9][height>=2880]/bestvideo[vcodec^=avc1][height>=2880]/bestvideo[height>=2880]/bestvideo[vcodec^=av01][height>=2160][fps>30]/bestvideo[vcodec^=vp9.2][height>=2160][fps>30]/bestvideo[vcodec^=vp9][height>=2160][fps>30]/bestvideo[vcodec^=avc1][height>=2160][fps>30]/bestvideo[height>=2160][fps>30]/bestvideo[vcodec^=av01][height>=2160]/bestvideo[vcodec^=vp9.2][height>=2160]/bestvideo[vcodec^=vp9][height>=2160]/bestvideo[vcodec^=avc1][height>=2160]/bestvideo[height>=2160]/bestvideo[vcodec^=av01][height>=1440][fps>30]/bestvideo[vcodec^=vp9.2][height>=1440][fps>30]/bestvideo[vcodec^=vp9][height>=1440][fps>30]/bestvideo[vcodec^=avc1][height>=1440][fps>30]/bestvideo[height>=1440][fps>30]/bestvideo[vcodec^=av01][height>=1440]/bestvideo[vcodec^=vp9.2][height>=1440]/bestvideo[vcodec^=vp9][height>=1440]/bestvideo[vcodec^=avc1][height>=1440]/bestvideo[height>=1440]/bestvideo[vcodec^=av01][height>=1080][fps>30]/bestvideo[vcodec^=vp9.2][height>=1080][fps>30]/bestvideo[vcodec^=vp9][height>=1080][fps>30]/bestvideo[vcodec^=avc1][height>=1080][fps>30]/bestvideo[height>=1080][fps>30]/bestvideo[vcodec^=av01][height>=1080]/bestvideo[vcodec^=vp9.2][height>=1080]/bestvideo[vcodec^=vp9][height>=1080]/bestvideo[vcodec^=avc1][height>=1080]/bestvideo[height>=1080]/bestvideo[vcodec^=av01][height>=720][fps>30]/bestvideo[vcodec^=vp9.2][height>=720][fps>30]/bestvideo[vcodec^=vp9][height>=720][fps>30]/bestvideo[vcodec^=avc1][height>=720][fps>30]/bestvideo[height>=720][fps>30]/bestvideo[vcodec^=av01][height>=720]/bestvideo[vcodec^=vp9.2][height>=720]/bestvideo[vcodec^=vp9][height>=720]/bestvideo[vcodec^=avc1][height>=720]/bestvideo[height>=720]/bestvideo[vcodec^=av01][height>=480][fps>30]/bestvideo[vcodec^=vp9.2][height>=480][fps>30]/bestvideo[vcodec^=vp9][height>=480][fps>30]/bestvideo[vcodec^=avc1][height>=480][fps>30]/bestvideo[height>=480][fps>30]/bestvideo[vcodec^=av01][height>=480]/bestvideo[vcodec^=vp9.2][height>=480]/bestvideo[vcodec^=vp9][height>=480]/bestvideo[vcodec^=avc1][height>=480]/bestvideo[height>=480]/bestvideo[vcodec^=av01][height>=360][fps>30]/bestvideo[vcodec^=vp9.2][height>=360][fps>30]/bestvideo[vcodec^=vp9][height>=360][fps>30]/bestvideo[vcodec^=avc1][height>=360][fps>30]/bestvideo[height>=360][fps>30]/bestvideo[vcodec^=av01][height>=360]/bestvideo[vcodec^=vp9.2][height>=360]/bestvideo[vcodec^=vp9][height>=360]/bestvideo[vcodec^=avc1][height>=360]/bestvideo[height>=360]/bestvideo[vcodec^=av01][height>=240][fps>30]/bestvideo[vcodec^=vp9.2][height>=240][fps>30]/bestvideo[vcodec^=vp9][height>=240][fps>30]/bestvideo[vcodec^=avc1][height>=240][fps>30]/bestvideo[height>=240][fps>30]/bestvideo[vcodec^=av01][height>=240]/bestvideo[vcodec^=vp9.2][height>=240]/bestvideo[vcodec^=vp9][height>=240]/bestvideo[vcodec^=avc1][height>=240]/bestvideo[height>=240]/bestvideo[vcodec^=av01][height>=144][fps>30]/bestvideo[vcodec^=vp9.2][height>=144][fps>30]/bestvideo[vcodec^=vp9][height>=144][fps>30]/bestvideo[vcodec^=avc1][height>=144][fps>30]/bestvideo[height>=144][fps>30]/bestvideo[vcodec^=av01][height>=144]/bestvideo[vcodec^=vp9.2][height>=144]/bestvideo[vcodec^=vp9][height>=144]/bestvideo[vcodec^=avc1][height>=144]/bestvideo[height>=144]/bestvideo)+(bestaudio[acodec^=opus]/bestaudio)/best';
const defaultFormatCodeAudioOnly = '(bestaudio[acodec^=opus]/bestaudio)/best';
