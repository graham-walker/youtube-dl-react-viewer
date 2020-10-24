import React, { Component } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { withRouter, NavLink } from 'react-router-dom';
import { Navbar, Nav, NavDropdown, Form, FormControl, Button, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import LoginForm from '../LoginForm/LoginForm';
import { UserContext } from '../../contexts/user.context';
import history from '../../utilities/history.utility';
import queryString from 'query-string';

class AppNavbar extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = { search: '' };
    }

    handleInputChange = (e) => {
        const { value, name } = e.target;
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();
        let parsed = queryString.parse(this.props.location.search);
        parsed.search = this.state.search || undefined;
        let stringified = queryString.stringify(parsed);
        history.push(`/videos${stringified ? '?' + stringified : ''}`);
    }

    componentDidMount() {
        let parsed = queryString.parse(this.props.location.search);
        if (parsed.search) this.setState({ search: parsed.search });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.location.search !== this.props.location.search) {
            let parsed = queryString.parse(this.props.location.search);
            this.setState({ search: parsed.search ?? '' });
        }
    }

    render() {
        if (history.location.pathname !== '/global'
            && history.location.pathname !== '/global/') {
            return (
                <Navbar
                    sticky="top"
                    bg="light"
                    expand="lg"
                    className="justify-content-center"
                >
                    <Container>
                        <LinkContainer to="/">
                            <Navbar.Brand className="d-flex d-lg-none mr-auto">
                                {process.env.REACT_APP_BRAND}
                            </Navbar.Brand>
                        </LinkContainer>
                        <Navbar.Toggle aria-controls="basic-navbar-nav" />
                        <Navbar.Collapse
                            id="basic-navbar-nav"
                            className="w-100"
                        >
                            <Nav className="w-100 justify-content-left">
                                <LinkContainer to="/">
                                    <Navbar.Brand className="d-none d-lg-block">
                                        {process.env.REACT_APP_BRAND}
                                    </Navbar.Brand>
                                </LinkContainer>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/videos"
                                    >
                                        Videos
                                </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/statistics"
                                    >
                                        Statistics
                                </Nav.Link>
                                </Nav.Item>
                            </Nav>
                            <Nav className="w-100 justify-content-center">
                                <Form
                                    inline
                                    onSubmit={this.onSubmit}
                                >
                                    <FormControl
                                        type="text"
                                        placeholder="Search"
                                        className="mr-md-2 w-100 w-md-auto mb-2 mb-md-0"
                                        name="search"
                                        value={this.state.search}
                                        onChange={this.handleInputChange}
                                    />
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 w-md-auto"
                                    >
                                        <FontAwesomeIcon icon="search" />
                                    </Button>
                                </Form>
                            </Nav>
                            <Nav className="ml-auto w-100 justify-content-end">
                                {this.context.user ?
                                    <>
                                        <NavDropdown
                                            title={this.context.user.username}
                                            alignRight
                                        >
                                            <NavDropdown.Item
                                                as={NavLink}
                                                to="/settings"
                                            >
                                                Settings
                                        </NavDropdown.Item>
                                            {this.context.user.isSuperuser &&
                                                <NavDropdown.Item
                                                    as={NavLink}
                                                    to="/admin"
                                                >
                                                    Admin
                                            </NavDropdown.Item>
                                            }
                                            <NavDropdown.Divider />
                                            <NavDropdown.Item onClick={() => history.push('/logout')}>
                                                Log Out
                                        </NavDropdown.Item>
                                        </NavDropdown>
                                    </>
                                    :
                                    <>
                                        <NavDropdown
                                            title="Login"
                                            alignRight
                                        >
                                            <NavDropdown.ItemText
                                                style={{ width: '100vw', maxWidth: '350px' }}
                                            >
                                                <LoginForm />
                                            </NavDropdown.ItemText>
                                        </NavDropdown>
                                        <LinkContainer to="/register">
                                            <Nav.Link>Register</Nav.Link>
                                        </LinkContainer>
                                    </>
                                }
                            </Nav>
                        </Navbar.Collapse>
                    </Container>
                </Navbar>
            );
        } else {
            return null;
        }
    }
}

export default withRouter(AppNavbar);
