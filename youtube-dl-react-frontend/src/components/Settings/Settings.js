import React, { Component } from 'react';
import { Form, Button, Alert, Image } from 'react-bootstrap';
import AuthService from '../../services/auth.service';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import Page from '../Page/Page';
import { getErrorMessage } from '../../utilities/format.utility';
import axios from '../../utilities/axios.utility';
import { defaultImage } from '../../utilities/image.utility';

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
        document.title = `Settings - ${window.documentTitle}`;

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
                    }
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        });
    }

    render() {
        const avatar = this.context.user.avatar ? '/static/users/avatars/' + this.context.user.avatar : '/default-avatar.jpg';
        return (
            <>
                {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                <Form onSubmit={this.onSubmit}>
                    <Form.Group controlId="avatar">
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
                    <Form.Group controlId="username">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Change username"
                            name="username"
                            value={this.state.username}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="password">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            placeholder="Change password"
                            value={this.state.password}
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="verifyPassword">
                        <Form.Control
                            type="password"
                            name="verifyPassword"
                            placeholder="Verify password"
                            value={this.state.verifyPassword}
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="resumeVideos"
                        className="d-none"
                    >
                        <Form.Check
                            custom
                            checked={this.state.resumeVideos}
                            type="checkbox"
                            name="resumeVideos"
                            label="Automatically resume videos from where you played them last"
                            id="resumeVideos"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group
                        controlId="enableSponsorblock"
                        className="d-none"
                    >
                        <Form.Check
                            custom
                            checked={this.state.enableSponsorblock}
                            type="checkbox"
                            name="enableSponsorblock"
                            label="Skip sponsored segments in videos using the SponsorBlock database"
                            id="enableSponsorblock"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="useCircularAvatars">
                        <Form.Check
                            custom
                            checked={this.state.useCircularAvatars}
                            type="checkbox"
                            name="useCircularAvatars"
                            label="Use circular avatar images"
                            id="useCircularAvatars"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Form.Group controlId="reportBytesUsingIec">
                        <Form.Check
                            custom
                            checked={this.state.reportBytesUsingIec}
                            type="checkbox"
                            name="reportBytesUsingIec"
                            label="Calculate filesizes using a divisor of 1024 bytes instead of 1000 bytes (On Windows, MiB is equivalent to MB)"
                            id="reportBytesUsingIec"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Button type="submit">Save</Button>
                </Form>
            </>
        );
    }
}
