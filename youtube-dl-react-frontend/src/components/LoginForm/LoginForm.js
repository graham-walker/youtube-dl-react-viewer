import React, { Component } from 'react';
import { Card, Form, Alert, Button } from 'react-bootstrap';
import { UserContext } from '../../contexts/user.context';
import AuthService from '../../services/auth.service';
import { getErrorMessage } from '../../utilities/format.utility';
import history from '../../utilities/history.utility';
import queryString from 'query-string';
import { Link } from 'react-router-dom';

export default class LoginForm extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            error: undefined,
            newuser: false,
        };
    }

    componentDidMount() {
        if (!this.props.location) return; // Will be undefined when the form is used in the dropdown
        let parsed = queryString.parse(this.props.location.search);
        if (parsed.newuser) this.setState({ username: parsed.newuser, newuser: parsed.newuser });
    }

    handleInputChange = (e) => {
        let { value, name } = e.target;
        if (this.props.inDropdown) name = name.slice(0, -'_dropdown'.length)
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();

        AuthService.login(this.state.username, this.state.password).then(() => {
            this.context.updateUser(AuthService.getCurrentUser());
            document.dispatchEvent(new MouseEvent('click'));
            window.location.pathname === '/login' ? history.push('/') : history.go(0);
        }).catch(err => {
            this.setState({ error: getErrorMessage(err), newuser: false })
        });
    }

    render() {
        return (
            <>
                <Card.Title className="mb-2">Login</Card.Title>
                {!!this.state.newuser &&
                    <Alert variant="success">User registered, please login</Alert>
                }
                {!!this.state.error &&
                    <Alert variant="danger">{this.state.error}</Alert>
                }
                <Form onSubmit={this.onSubmit}>
                    <Form.Group className="mb-3" controlId={'username' + (this.props.inDropdown ? '_dropdown' : '')}>
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type="text"
                            name={'username' + (this.props.inDropdown ? '_dropdown' : '')}
                            placeholder="Enter username"
                            value={this.state.username}
                            onChange={this.handleInputChange}
                            maxLength={50}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'password' + (this.props.inDropdown ? '_dropdown' : '')}>
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            name={'password' + (this.props.inDropdown ? '_dropdown' : '')}
                            placeholder="Enter password"
                            value={this.state.password}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Button type="submit">Login</Button>
                    {!this.props.inDropdown &&
                        <Button
                            as={Link}
                            variant='link'
                            to="/register"
                            className="ms-2"
                        >
                            Register
                        </Button>
                    }
                </Form>
            </>
        );
    }
}
