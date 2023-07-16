import React, { Component } from 'react';
import { Tab, Form, Button, Accordion, Card, Nav, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getErrorMessage, getWarningColor } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import AccordionButton from '../../AccordionButton/AccordionButton';

const JobEditor = (props) => {

    const addJob = (job) => props.onJobsChange([...props.jobs, job]);

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
            <h5 className="mb-4">Jobs</h5>
            <Card className="mb-4">
                <Tab.Container defaultActiveKey={props.defaultActivejobId || 'new'}>
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
                                    />
                                </Tab.Pane>
                            )}
                            <Tab.Pane eventKey="new">
                                <JobForm
                                    addJob={addJob}
                                    new
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
            downloadComments: false,
            recodeVideo: true,
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
                            checked={this.state.isAudioOnly}
                            type="checkbox"
                            name="isAudioOnly"
                            label="Download audio only"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'downloadComments' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            checked={this.state.downloadComments}
                            type="checkbox"
                            name="downloadComments"
                            label="Download comments (yt-dlp only)"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'recodeVideo' + (this.props.job?._id || 'new')}>
                        <Form.Check
                            checked={this.state.recodeVideo}
                            type="checkbox"
                            name="recodeVideo"
                            label="Recode video if necessary to improve browser playback compatability (may reduce quality)"
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
                                        placeholder="Enter options, one per line. Lines starting with '#', ';' or ']' are comments"
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

const defaultArguments = `# Replace with your cookie file to sign in to websites
#--cookies "/Path/To/cookies.txt"

# Uncomment this line to prevent yt-dlp from downloading playlist metafiles every time
#--no-write-playlist-metafiles

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
#--recode-video

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
const defaultFormatCode = '(bestvideo[vcodec^=h264]+bestaudio[acodec^=aac])/best';
const defaultFormatCodeAudioOnly = '(bestaudio[acodec^=aac]/bestaudio)/best';

export default JobEditor;
