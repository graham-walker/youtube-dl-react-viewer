import React, { Component } from 'react';
import { Card, Form, Alert, Button } from 'react-bootstrap';
import AuthService from '../../services/auth.service';
import { getErrorMessage } from '../../utilities/format.utility';

export default class LoginForm extends Component {
    constructor(props) {
        super(props)
        this.state = {
            username: '',
            password: '',
            verifyPassword: '',
            error: undefined,
            success: undefined,
        };
    }

    handleInputChange = (e) => {
        const { value, name } = e.target;
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();

        this.setState({ success: undefined }, () => {
            if (this.state.password !== this.state.verifyPassword) {
                return this.setState({ error: 'Passwords do not match' });
            }
            if (this.state.password.length < 8) {
                return this.setState({ error: 'Password must be at least 8 characters' });
            }

            AuthService.register(this.state.username, this.state.password).then(() => {
                this.setState({
                    success: 'User registered',
                    error: undefined
                });
            }).catch(err => {
                this.setState({ error: getErrorMessage(err) });
            });
        });
    }

    render() {
        return (
            <>
                <Card.Title>Register</Card.Title>
                {!!this.state.success &&
                    <Alert variant="success">{this.state.success}</Alert>
                }
                {!!this.state.error &&
                    <Alert variant="danger">{this.state.error}</Alert>
                }
                <Card.Text>
                    <Form onSubmit={this.onSubmit}>
                        <Form.Group className="mb-3" controlId="username">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter username"
                                name="username"
                                value={this.state.username}
                                onChange={this.handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="password">
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
                        <Form.Group className="mb-3" controlId="verifyPassword">
                            <Form.Control
                                type="password"
                                name="verifyPassword"
                                placeholder="Verify password"
                                value={this.state.verifyPassword}
                                onChange={this.handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Button type="submit">Register</Button>
                    </Form>
                </Card.Text>
            </>
        );
    }
}
