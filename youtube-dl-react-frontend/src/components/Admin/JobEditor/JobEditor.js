import React, { Component, useState } from 'react';
import { Tab, Form, Button, Accordion, Card, Nav, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getErrorMessage, getWarningColor } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import AccordionButton from '../../AccordionButton/AccordionButton';
import { scrollToElement } from '../../../utilities/scroll.utility';
import ImportSubscriptionsButton from '../../ImportSubscriptionsButton/ImportSubscriptionsButton';
import parsedEnv from '../../../parse-env';

const JobEditor = (props) => {
    const [activeKey, setActiveKey] = useState(props.defaultActivejobId || 'new');

    const addJob = (job) => {
        setActiveKey(job._id);
        job.isNew = true;
        props.onJobsChange([...props.jobs, job]);
    }

    const setJob = (job) => {
        let jobs = [...props.jobs];
        for (let i = 0; i < jobs.length; i++) {
            if (jobs[i]._id === job.jobId) {
                jobs[i].name = job.name;
                break;
            }
        }
        props.onJobsChange(jobs);
    }

    return (
        <>
            <h5 id="jobs-anchor" className="mb-4">Jobs</h5>
            <Card className="mb-4">
                <Tab.Container activeKey={activeKey} onSelect={activeKey => setActiveKey(activeKey)}>
                    <Card.Header>
                        <Nav
                            className="nav-tabs card-header-tabs"
                            style={{ transform: 'translateY(1px)' }}
                        >
                            {props.jobs.map(job =>
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
                            {props.jobs.map(job =>
                                <Tab.Pane
                                    eventKey={job._id}
                                    key={job._id}
                                >
                                    <JobForm
                                        job={job}
                                        setJob={setJob}
                                        active={activeKey === job._id}
                                    />
                                </Tab.Pane>
                            )}
                            <Tab.Pane eventKey="new">
                                <JobForm
                                    addJob={addJob}
                                    new
                                    active={activeKey === 'new'}
                                />
                            </Tab.Pane>
                        </Tab.Content>
                    </Card.Body>
                </Tab.Container>
            </Card>
        </>
    );
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
            downloadComments: true,
            recodeVideo: false,
            urls: '',
            arguments: parsedEnv.REACT_APP_RUNNING_IN_DOCKER ? dockerDefaultArguments : manualDefaultArguments,
            overrideUploader: '',
        }
        this.initialState = { ...this.state };
    }

    componentDidMount() {
        if (this.props.job) {
            let job = { ...this.props.job };
            delete job._id;
            if (job.isNew) {
                delete job.isNew;
                this.setState({ ...job, success: 'New job saved' });
            } else {
                this.setState(job);
            }
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.active && !this.props.active) {
            this.setState({ ...this.state, error: undefined, success: undefined });
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
                            this.setState(state);
                            this.props.addJob(res.data);
                        } else {
                            this.setState({ success: 'Job saved' });
                            this.props.setJob(res.data);
                        }
                    }
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#jobs-anchor');
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
                    <Form.Group className="mb-3" controlId={'downloadComments' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            checked={this.state.downloadComments}
                            type="checkbox"
                            name="downloadComments"
                            label="Download comments"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'recodeVideo' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            checked={this.state.recodeVideo}
                            type="checkbox"
                            name="recodeVideo"
                            label="Recode video to mp4 to improve browser playback compatibility (may reduce quality)"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'isAudioOnly' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            checked={this.state.isAudioOnly}
                            type="checkbox"
                            name="isAudioOnly"
                            label="Download audio only"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'username' + (this.props.job?._id || 'new')}>
                        <Form.Label>URLs</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows="5"
                            placeholder="Enter URLs, one per line. Lines starting with '#', ';' or ']' are comments"
                            name="urls"
                            value={this.state.urls}
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <ImportSubscriptionsButton
                        className="mb-3"
                        emit={(subscriptions) => this.setState({
                            urls:
                                this.state.urls.trim() === ''
                                    ? subscriptions
                                    : this.state.urls.replace(/\n*$/, '\n\n') + subscriptions
                        })}
                    />
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
                                    <OverlayTrigger overlay={<Tooltip>Command line arguments passed to yt-dlp</Tooltip>}>
                                        <Form.Label>Arguments <FontAwesomeIcon icon="circle-info" /></Form.Label>
                                    </OverlayTrigger>
                                    {parsedEnv.REACT_APP_RUNNING_IN_DOCKER && <Alert variant='warning'>When installed using Docker --cookies-from-browser will not work and --cookies must be set to a path inside the output directory. <a href={parsedEnv.REACT_APP_REPO_URL + '#how-do-i-download-from-websites-that-require-a-login'} target="_blank" rel="noopener noreferrer">Learn more</a></Alert>}
                                    <Form.Control
                                        as="textarea"
                                        rows="10"
                                        placeholder="Enter options, one per line. Lines starting with '#', ';' or ']' are comments"
                                        name="arguments"
                                        value={this.state.arguments}
                                        onChange={this.handleInputChange}
                                        spellCheck="false"
                                        required
                                    >
                                        {defaultArguments}
                                    </Form.Control>
                                </Form.Group>
                                <Form.Group className="mb-3" controlId={'overrideUploader' + (this.props.job?._id || 'new')}>
                                    <OverlayTrigger overlay={<Tooltip>Treat all videos downloaded by this job as if they were uploaded by the specified uploader</Tooltip>}>
                                        <Form.Label>Override uploader <FontAwesomeIcon icon="circle-info" /></Form.Label>
                                    </OverlayTrigger>
                                    <Form.Control
                                        type="text"
                                        placeholder="Uploader name"
                                        name="overrideUploader"
                                        value={this.state.overrideUploader}
                                        onChange={this.handleInputChange}
                                    />
                                </Form.Group>
                                {this.props.job?._id &&
                                    <Form.Group className="mb-3" controlId={'jobId' + this.props.job._id}>
                                        <OverlayTrigger overlay={<Tooltip>Used to interact with the job from the API</Tooltip>}>
                                            <Form.Label>Job ID <FontAwesomeIcon icon="circle-info" /></Form.Label>
                                        </OverlayTrigger>
                                        <Form.Control
                                            type="text"
                                            placeholder="Job ID"
                                            name="jobId"
                                            value={this.props.job._id}
                                            disabled={true}
                                        />
                                    </Form.Group>
                                }
                            </>
                        </Accordion.Collapse>
                    </Accordion>
                    <Button type="submit">Save</Button>
                </Form>
            </>
        );
    }
}

const defaultArguments = `# Uncomment and replace with the path to your Netscape cookie file to login to websites
$COOKIES

# Uncomment to prevent yt-dlp from downloading playlist metafiles every time a channel is downloaded
#--no-write-playlist-metafiles

# Uncomment to prevent downloading livestreams
#--match-filter "!is_live & !live"

# These options will cause downloads to fail, do not set them:
#--batch-file
#--keep-fragments

# These options are controlled by the web app, any value set here will be overridden:
#--exec
#--write-info-json
#--ffmpeg-location 
#--output
#--format
#--extract-audio
#--download-archive
#--cache-dir
#--write-comments
#--recode-video

# These options are used by default, but are not required:
#--write-thumbnail can be replaced with --write-all-thumbnails
#--all-subs can be replaced with --write-sub or --write-auto-sub
#--merge-output-format can cause downloads to fail depending on the format code combination used
--write-description
--write-annotations
--write-thumbnail
--all-subs
--add-metadata
--xattrs
--xattr-set-filesize
--no-overwrites
--no-continue
--ignore-errors

# These options may improve download stability, but are not required:
#--geo-bypass
#--force-ipv4
#--sleep-interval 5
#--max-sleep-interval 30
#--sleep-requests 1
#--datebefore "$(date --date="30 days ago" +%Y%m%d)"
`;
const manualDefaultArguments = defaultArguments.replace('$COOKIES', '#--cookies "C:\\cookies.txt"');
const dockerDefaultArguments = defaultArguments.replace('$COOKIES', '#--cookies /youtube-dl/cookies.txt');
const defaultFormatCode = 'bestvideo*+bestaudio/best';
const defaultFormatCodeAudioOnly = 'bestaudio/best';

export default JobEditor;
