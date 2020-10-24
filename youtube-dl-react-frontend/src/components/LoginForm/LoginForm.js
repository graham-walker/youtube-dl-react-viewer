import React, { Component } from 'react';
import { Card, Form, Alert, Button } from 'react-bootstrap';
import { UserContext } from '../../contexts/user.context';
import AuthService from '../../services/auth.service';
import { getErrorMessage } from '../../utilities/format.utility';
import history from '../../utilities/history.utility';

export default class LoginForm extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            username: '',
            password: '',
            error: undefined,
        };
    }

    handleInputChange = (e) => {
        const { value, name } = e.target;
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();

        AuthService.login(this.state.username, this.state.password).then(() => {
            this.context.updateUser(AuthService.getCurrentUser());
            document.dispatchEvent(new MouseEvent('click'));
            history.push('/');
        }).catch(err => {
            this.setState({ error: getErrorMessage(err) })
        });
    }

    render() {
        return (
            <>
                <Card.Title>Login</Card.Title>
                {!!this.state.error &&
                    <Alert variant="danger">{this.state.error}</Alert>
                }
                <Form onSubmit={this.onSubmit}>
                    <Form.Group controlId="username">
                        <Form.Label>Username</Form.Label>
                        <Form.Control
                            type="text"
                            name="username"
                            placeholder="Enter username"
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
                            placeholder="Enter password"
                            value={this.state.password}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Button type="submit">Login</Button>
                </Form>
            </>
        );
    }
}
