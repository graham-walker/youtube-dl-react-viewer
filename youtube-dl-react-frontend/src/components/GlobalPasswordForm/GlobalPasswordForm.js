import React, { Component } from 'react';
import { Card, Form, Alert, Button } from 'react-bootstrap';
import { UserContext } from '../../contexts/user.context';
import AuthService from '../../services/auth.service';
import { getErrorMessage } from '../../utilities/format.utility';
import ThemeController from '../ThemeController/ThemeController';

export default class GlobalPasswordForm extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            globalPassword: '',
            error: undefined,
        };
    }

    handleInputChange = (e) => {
        const { value, name } = e.target;
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();

        AuthService.globalLogin(this.state.globalPassword).catch(err => {
            this.setState({ error: getErrorMessage(err) })
        });
    }

    render() {
        return (
            <>
                <div className="d-none"><ThemeController onThemeChange={() => { }} /></div>
                <Card.Title>Global Site Password</Card.Title>
                {!!this.state.error &&
                    <Alert variant="danger">{this.state.error}</Alert>
                }
                <Form onSubmit={this.onSubmit}>
                    <Form.Group className="mb-3" controlId="globalPassword">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            name="globalPassword"
                            placeholder="Enter password"
                            value={this.state.globalPassword}
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
