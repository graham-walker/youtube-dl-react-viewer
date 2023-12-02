import React, { Component } from 'react';
import { Form, Button, Alert, Image } from 'react-bootstrap';
import AuthService from '../../services/auth.service';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import Page from '../Page/Page';
import { getErrorMessage } from '../../utilities/format.utility';
import axios from '../../utilities/axios.utility';
import { defaultImage } from '../../utilities/image.utility';
import parsedEnv from '../../parse-env';

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
            username: '',
            password: '',
            verifyPassword: '',
            resumeVideos: false,
            enableSponsorblock: false,
            useCircularAvatars: false,
            reportBytesUsingIec: false,
            avatar: '',
            recordWatchHistory: false,
            hideShorts: false,
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
                formData.append(key, user[key]);
            }

            axios
                .post('/api/users/settings', formData).then(res => {
                    if (res.status === 200) {
                        this.setState({ success: 'Settings Saved' });
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
        return (
            <>
                {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                <Form onSubmit={this.onSubmit}>
                    <Form.Group className="mb-3" controlId="avatar">
                        <Form.Label>Profile Image</Form.Label>
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
                    <Form.Group className="mb-3" controlId="hideShorts">
                        <Form.Check
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
                            checked={this.state.reportBytesUsingIec}
                            type="checkbox"
                            name="reportBytesUsingIec"
                            label="Use base 1024 (KiB, MiB, GiB) when calculating filesize instead of base 1000 (kB, MB, GB)"
                            id="reportBytesUsingIec"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="recordWatchHistory">
                        <Form.Check
                            custom
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
                            custom
                            checked={this.state.resumeVideos}
                            type="checkbox"
                            name="resumeVideos"
                            label="Resume videos where you left off"
                            id="resumeVideos"
                            onChange={this.handleInputChange}
                            disabled={!this.state.recordWatchHistory}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="enableSponsorblock"
                        className="mb-3"
                    >
                        <Form.Label>SponsorBlock</Form.Label>
                        <Form.Check
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
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
                            custom
                            checked={this.state.skipMusicOfftopic}
                            type="checkbox"
                            name="skipMusicOfftopic"
                            label={<span className="d-flex align-items-center"><span className="pip sponsor-type-music_offtopic"></span>Music: Non-Music Section</span>}
                            id="skipMusicOfftopic"
                            onChange={this.handleInputChange}
                            disabled={!this.state.enableSponsorblock}
                        />
                    </Form.Group>
                    <Button type="submit">Save</Button>
                </Form>
            </>
        );
    }
}
