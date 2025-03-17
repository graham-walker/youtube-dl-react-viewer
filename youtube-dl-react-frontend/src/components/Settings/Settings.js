import React, { Component } from 'react';
import { Form, Button, Alert, Image, Tab, Card, Nav } from 'react-bootstrap';
import AuthService from '../../services/auth.service';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import Page from '../Page/Page';
import { getErrorMessage, capitalizeFirstLetter } from '../../utilities/format.utility';
import axios from '../../utilities/axios.utility';
import { defaultImage } from '../../utilities/image.utility';
import parsedEnv from '../../parse-env';
import { getDefaultUserSettings } from '../../utilities/user.utility';

export default class SettingsPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            success: undefined,
            error: undefined,
            user: undefined,
        };
    }

    componentDidMount() {
        document.title = `Settings - ${parsedEnv.REACT_APP_BRAND}`;

        axios
            .get('/api/users/settings').then(res => {
                if (res.status === 200) {
                    res.data.user.password = '';
                    res.data.user.verifyPassword = '';
                    this.setState({ loading: false, user: res.data.user });
                }
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    render() {
        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading &&
                    <Page title="Settings" clamp="1200px">
                        <SettingsForm user={this.state.user} />
                    </Page>}
            </PageLoadWrapper>
        );
    }
}

class SettingsForm extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            success: undefined,
            error: undefined,
            playerSettingsTab: 'desktop',
            verifyPassword: '',
            ...getDefaultUserSettings(),
        };
    }

    componentDidMount() {
        this.setState({ ...this.props.user });
    }

    handleInputChange = (e) => {
        var { value, name, type } = e.target;
        if (type === 'checkbox') value = e.target.checked;
        if (type === 'file') value = e.target.files[0];
        this.setState({ [name]: value });
    }

    onSubmit = (event) => {
        event.preventDefault();

        let { success, error, ...user } = this.state;

        this.setState({ error: undefined, success: undefined }, () => {
            if (user.password !== user.verifyPassword) {
                return this.setState({ error: 'Passwords do not match' });
            }
            if (user.password.length > 0 && user.password.length < 8) {
                return this.setState({ error: 'Password must be at least 8 characters' });
            }
            delete user.verifyPassword;

            var formData = new FormData();
            for (var key in user) {
                if (key.includes('PlayerSettings')) {
                    formData.append(key, JSON.stringify(user[key]));
                    continue;
                }
                formData.append(key, user[key]);
            }

            axios
                .post('/api/users/settings', formData).then(res => {
                    if (res.status === 200) {
                        this.setState({ success: 'Settings Saved', password: '', verifyPassword: '' });
                        let user = AuthService.getCurrentUser();
                        for (let key in res.data) {
                            user[key] = res.data[key];
                        }
                        this.context.updateUser(user);
                        localStorage.setItem('user', JSON.stringify(user));
                        window.scrollTo(0, 0);
                    }
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                    window.scrollTo(0, 0);
                });
        });
    }

    render() {
        const avatar = this.context.user.avatar ? '/static/users/avatars/' + this.context.user.avatar : '/default-avatar.svg';
        const viewports = ['desktop', 'tablet', 'mobile'];
        return (
            <>
                {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                <Form onSubmit={this.onSubmit}>
                    <strong className='d-block mb-2'>Account</strong>
                    <Form.Group className="mb-3" controlId="avatar">
                        <Image
                            width={145}
                            height={145}
                            src={avatar}
                            onError={(e) => { defaultImage(e, 'avatar') }}
                            roundedCircle={this.context.user?.useCircularAvatars ?? true}
                            style={{ display: 'block', marginBottom: '0.5rem' }}
                        />
                        <Form.Control
                            type="file"
                            name="avatar"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="username">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Change username"
                            name="username"
                            value={this.state.username}
                            onChange={this.handleInputChange}
                            maxLength={50}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="password">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            placeholder="Change password"
                            value={this.state.password}
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="verifyPassword">
                        <Form.Control
                            type="password"
                            name="verifyPassword"
                            placeholder="Verify password"
                            value={this.state.verifyPassword}
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <strong className='d-block'>Video Player</strong>
                    <Tab.Container activeKey={this.state.playerSettingsTab} onSelect={tab => this.setState({ playerSettingsTab: tab })}>
                        <Card.Header>
                            <Nav
                                className="nav-tabs card-header-tabs"
                                style={{ transform: 'translateY(1px)' }}
                            >
                                {viewports.map(viewport =>
                                    <Nav.Link
                                        eventKey={viewport}
                                        className="tab-constrained"
                                        title={viewport}
                                        key={viewport}
                                    >
                                        {capitalizeFirstLetter(viewport)}
                                    </Nav.Link>
                                )}
                            </Nav>
                        </Card.Header>
                        <Card.Body>
                            <Tab.Content>
                                {viewports.map(viewport =>
                                    <Tab.Pane
                                        eventKey={viewport}
                                        key={viewport}
                                    >
                                        <PlayerSettingsForm
                                            viewport={viewport}
                                            settings={this.state[viewport + 'PlayerSettings']}
                                            onSettingsChange={(settings) => this.setState({ [viewport + 'PlayerSettings']: settings })}
                                        />
                                    </Tab.Pane>
                                )}
                            </Tab.Content>
                        </Card.Body>
                    </Tab.Container>
                    <strong className='d-block mb-2'>Appearance</strong>
                    <Form.Group className="mb-3" controlId="hideShorts">
                        <Form.Check
                            checked={this.state.hideShorts}
                            type="checkbox"
                            name="hideShorts"
                            label="Hide shorts on the search, channel, and playlist pages"
                            id="hideShorts"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="useLargeLayout">
                        <Form.Check
                            checked={this.state.useLargeLayout}
                            type="checkbox"
                            name="useLargeLayout"
                            label="Use large layout"
                            id="useLargeLayout"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="fitThumbnails">
                        <Form.Check
                            checked={this.state.fitThumbnails}
                            type="checkbox"
                            name="fitThumbnails"
                            label="Crop thumbnails to 16:9"
                            id="fitThumbnails"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="useCircularAvatars">
                        <Form.Check
                            checked={this.state.useCircularAvatars}
                            type="checkbox"
                            name="useCircularAvatars"
                            label="Rounded corners"
                            id="useCircularAvatars"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="reportBytesUsingIec">
                        <Form.Check
                            checked={this.state.reportBytesUsingIec}
                            type="checkbox"
                            name="reportBytesUsingIec"
                            label="Use base 1024 (KiB, MiB, GiB) when displaying file sizes instead of base 1000 (kB, MB, GB)"
                            id="reportBytesUsingIec"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <strong className='d-block mb-2'>History</strong>
                    <Form.Group className="mb-3" controlId="recordWatchHistory">
                        <Form.Check
                            checked={this.state.recordWatchHistory}
                            type="checkbox"
                            name="recordWatchHistory"
                            label="Save watched history"
                            id="recordWatchHistory"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="resumeVideos">
                        <Form.Check
                            checked={this.state.resumeVideos}
                            type="checkbox"
                            name="resumeVideos"
                            label="Resume videos where you left off"
                            id="resumeVideos"
                            onChange={this.handleInputChange}
                            disabled={!this.state.recordWatchHistory}
                        />
                    </Form.Group>
                    <strong className='d-block mb-2'>SponsorBlock</strong>
                    <Form.Group
                        controlId="enableSponsorblock"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.enableSponsorblock}
                            type="checkbox"
                            name="enableSponsorblock"
                            label="Skip sponsored segments"
                            id="enableSponsorblock"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="onlySkipLocked"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.onlySkipLocked}
                            type="checkbox"
                            name="onlySkipLocked"
                            label="Only skip approved segments"
                            id="onlySkipLocked"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipSponsor"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipSponsor}
                            type="checkbox"
                            name="skipSponsor"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-sponsor"></span>Sponsors</span>}
                            id="skipSponsor"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipSelfpromo"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipSelfpromo}
                            type="checkbox"
                            name="skipSelfpromo"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-selfpromo"></span>Unpaid/Self Promotion</span>}
                            id="skipSelfpromo"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipInteraction"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipInteraction}
                            type="checkbox"
                            name="skipInteraction"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-interaction"></span>Interaction Reminder (Subscribe)</span>}
                            id="skipInteraction"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipIntro"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipIntro}
                            type="checkbox"
                            name="skipIntro"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-intro"></span>Intermission/Intro Animation</span>}
                            id="skipIntro"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipOutro"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipOutro}
                            type="checkbox"
                            name="skipOutro"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-outro"></span>Endcards/Credits</span>}
                            id="skipOutro"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipPreview"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipPreview}
                            type="checkbox"
                            name="skipPreview"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-preview"></span>Preview/Recap</span>}
                            id="skipPreview"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipFiller"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipFiller}
                            type="checkbox"
                            name="skipFiller"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-filler"></span>Filler Tangent/Jokes</span>}
                            id="skipFiller"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="skipMusicOfftopic"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.skipMusicOfftopic}
                            type="checkbox"
                            name="skipMusicOfftopic"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-music_offtopic"></span>Music: Non-Music Section</span>}
                            id="skipMusicOfftopic"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <strong className='d-block mb-2'>Return YouTube Dislike</strong>
                    <Form.Group
                        controlId="enableReturnYouTubeDislike"
                        className="mb-3"
                    >
                        <Form.Check
                            checked={this.state.enableReturnYouTubeDislike}
                            type="checkbox"
                            name="enableReturnYouTubeDislike"
                            label="Fetch views, likes, and dislikes from Return YouTube Dislike"
                            id="enableReturnYouTubeDislike"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <div
                        className='position-sticky bottom-0 py-3'
                        style={{ background: 'var(--bs-card-bg)', marginTop: '-1rem', marginBottom: '-1rem' }}
                    >
                        <Button type="submit">Save</Button>
                    </div>
                </Form>
            </>
        );
    }
}

const PlayerSettingsForm = (props) => {
    const viewport = props.viewport;
    const settings = props.settings;

    const handleInputChange = (e) => {
        let newSettings = { ...settings };
        let { value, name, type } = e.target;
        name = name.slice(viewport.length);
        if (type === 'checkbox') value = e.target.checked;
        newSettings[name] = value;
        props.onSettingsChange(newSettings);
    }

    return (
        <>
            {viewport !== 'desktop' &&
                <Form.Group className="mb-3" controlId={viewport + 'enabled'}>
                    <Form.Check
                        type="checkbox"
                        checked={settings.enabled}
                        name={viewport + 'enabled'}
                        label={`Use separate player settings for ${viewport}, otherwise the next largest viewport's settings will be used`}
                        onChange={handleInputChange}
                    />
                </Form.Group>
            }
            <div className={settings.enabled ? undefined : 'opacity-50'}>
                <Form.Group className="mb-3" controlId={viewport + 'defaultPlaybackRate'}>
                    <Form.Label>Default playback speed</Form.Label>
                    <Form.Select
                        name={viewport + 'defaultPlaybackRate'}
                        onChange={handleInputChange}
                        value={settings.defaultPlaybackRate}
                        disabled={!settings.enabled}
                    >
                        <option value="0.25">0.25x</option>
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="1.75">1.75x</option>
                        <option value="2">2x</option>
                        <option value="2.25">2.25x</option>
                        <option value="2.5">2.5x</option>
                        <option value="2.75">2.75x</option>
                        <option value="3">3x</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'autoplayVideo'}>
                    <Form.Check
                        type="checkbox"
                        checked={settings.autoplayVideo}
                        name={viewport + 'autoplayVideo'}
                        label="Autoplay video on page load"
                        disabled={!settings.enabled}
                        onChange={handleInputChange}
                    />
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'keepPlayerControlsVisible'}>
                    <Form.Label>Keep video player controls visible</Form.Label>
                    <Form.Select
                        name={viewport + 'keepPlayerControlsVisible'}
                        onChange={handleInputChange}
                        value={settings.keepPlayerControlsVisible}
                        disabled={!settings.enabled}
                    >
                        <option value="never">Never</option>
                        <option value="windowed">Windowed</option>
                        <option value="fullscreen">Fullscreen</option>
                        <option value="always">Always</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'playerControlsPosition'}>
                    <Form.Label>Player controls are positioned</Form.Label>
                    <Form.Select
                        name={viewport + 'playerControlsPosition'}
                        onChange={handleInputChange}
                        value={settings.playerControlsPosition}
                        disabled={!settings.enabled}
                    >
                        <option value="on_video">On the video</option>
                        <option value="under_video">Under the video</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'playerControlsScale'}>
                    <Form.Label>Player controls scale</Form.Label>
                    <Form.Select
                        name={viewport + 'playerControlsScale'}
                        onChange={handleInputChange}
                        value={settings.playerControlsScale}
                        disabled={!settings.enabled}
                    >
                        <option value="1">1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="1.75">1.75x</option>
                        <option value="2">2x</option>
                        <option value="2.25">2.25x</option>
                        <option value="2.5">2.5x</option>
                        <option value="2.75">2.75x</option>
                        <option value="3">3x</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'largePlayButtonEnabled'}>
                    <Form.Check
                        type="checkbox"
                        checked={settings.largePlayButtonEnabled}
                        name={viewport + 'largePlayButtonEnabled'}
                        label="Enable large play button"
                        onChange={handleInputChange}
                        disabled={!settings.enabled}
                    />
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'seekButtonsEnabled'}>
                    <Form.Check
                        type="checkbox"
                        checked={settings.seekButtonsEnabled}
                        name={viewport + 'seekButtonsEnabled'}
                        label="Enable seek buttons"
                        onChange={handleInputChange}
                        disabled={!settings.enabled}
                    />
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'forwardSeekButtonSeconds'}>
                    <Form.Label>Forward seek button step</Form.Label>
                    <Form.Select
                        name={viewport + 'forwardSeekButtonSeconds'}
                        onChange={handleInputChange}
                        value={settings.forwardSeekButtonSeconds}
                        disabled={!settings.enabled || !settings.seekButtonsEnabled}
                    >
                        <option value="5">5 seconds</option>
                        <option value="10">10 seconds</option>
                        <option value="15">15 seconds</option>
                        <option value="20">20 seconds</option>
                        <option value="25">25 seconds</option>
                        <option value="30">30 seconds</option>
                        <option value="45">45 seconds</option>
                        <option value="60">60 seconds</option>
                        <option value="90">90 seconds</option>
                        <option value="120">120 seconds</option>
                        <option value="180">180 seconds</option>
                    </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3" controlId={viewport + 'backSeekButtonSeconds'}>
                    <Form.Label>Back seek button step</Form.Label>
                    <Form.Select
                        name={viewport + 'backSeekButtonSeconds'}
                        onChange={handleInputChange}
                        value={settings.backSeekButtonSeconds}
                        disabled={!settings.enabled || !settings.seekButtonsEnabled}
                    >
                        <option value="5">5 seconds</option>
                        <option value="10">10 seconds</option>
                        <option value="15">15 seconds</option>
                        <option value="20">20 seconds</option>
                        <option value="25">25 seconds</option>
                        <option value="30">30 seconds</option>
                        <option value="45">45 seconds</option>
                        <option value="60">60 seconds</option>
                        <option value="90">90 seconds</option>
                        <option value="120">120 seconds</option>
                        <option value="180">180 seconds</option>
                    </Form.Select>
                </Form.Group>
            </div>
        </>
    );
}
