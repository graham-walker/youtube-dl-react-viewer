import React, { Component } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { withRouter, NavLink } from 'react-router-dom';
import { Navbar, Nav, NavDropdown, Form, FormControl, Button, Container, Badge, Image } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import LoginForm from '../LoginForm/LoginForm';
import { UserContext } from '../../contexts/user.context';
import history from '../../utilities/history.utility';
import queryString from 'query-string';
import { defaultImage } from '../../utilities/image.utility';
import ThemeController from '../ThemeController/ThemeController';
import parsedEnv from '../../parse-env';
import AdvancedSearchModal from './AdvancedSearchModal/AdvancedSearchModal';

class AppNavbar extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = { search: '', theme: 'auto', showAdvancedSearch: false };
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
            const avatar = this.context.getAvatar();
            return (
                <Navbar
                    sticky="top"
                    bg="light"
                    expand="xl"
                    className="justify-content-center"
                >
                    <Container>
                        <LinkContainer to="/">
                            <Navbar.Brand className="d-xl-none me-auto">
                                <NavbarBrandContent theme={this.state.theme} />
                            </Navbar.Brand>
                        </LinkContainer>

                        <Navbar.Toggle aria-controls="basic-navbar-nav" />
                        <Navbar.Collapse
                            id="basic-navbar-nav"
                            className="w-100"
                        >
                            <Nav className="w-100 justify-content-left">
                                <LinkContainer to="/">
                                    <Navbar.Brand className="d-none d-xl-block">
                                        <NavbarBrandContent theme={this.state.theme} />
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
                                        to="/uploaders"
                                    >
                                        Uploaders
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/tags"
                                    >
                                        Tags
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
                                    className="form-inline"
                                    onSubmit={this.onSubmit}
                                >
                                    <FormControl
                                        type="text"
                                        placeholder="Search"
                                        className="me-md-2 w-100 w-md-auto mb-2 mb-xl-0"
                                        name="search"
                                        value={this.state.search}
                                        onChange={this.handleInputChange}
                                    />
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 w-md-auto mb-2 mb-xl-0"
                                    >
                                        <FontAwesomeIcon icon="search" />
                                    </Button>
                                </Form>
                                <Button
                                    variant="secondary"
                                    className="w-100 w-md-auto ms-2 mb-2 mb-xl-0"
                                    onClick={() => this.setState({ showAdvancedSearch: true })}
                                >
                                    <FontAwesomeIcon icon="filter" />
                                </Button>
                                <AdvancedSearchModal show={this.state.showAdvancedSearch} onHide={() => this.setState({ showAdvancedSearch: false })} />
                            </Nav>
                            <Nav className="ms-auto w-100 justify-content-end">
                                {this.context.user ?
                                    <>
                                        <NavDropdown
                                            title={
                                                <>
                                                    <span title={this.context.getSetting('username')}>{this.context.getSetting('username')}</span>
                                                    <Image
                                                        width={36}
                                                        height={36}
                                                        src={avatar}
                                                        onError={(e) => { defaultImage(e, 'avatar') }}
                                                        roundedCircle={this.context.getSetting('useCircularAvatars')}
                                                        style={{ marginLeft: '0.5em' }}
                                                    />
                                                </>

                                            }
                                            align="end"
                                            className="user-dropdown"
                                        >
                                            <NavDropdown.Item
                                                as={NavLink}
                                                to="/activity"
                                            >
                                                Activity
                                            </NavDropdown.Item>
                                            <NavDropdown.Item
                                                as={NavLink}
                                                to="/settings"
                                            >
                                                Settings
                                            </NavDropdown.Item>
                                            {this.context.getSetting('isSuperuser') &&
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
                                            align="end"
                                        >
                                            <NavDropdown.ItemText
                                                style={{ width: '100vw', maxWidth: '350px' }}
                                            >
                                                <LoginForm inDropdown={true} />
                                            </NavDropdown.ItemText>
                                        </NavDropdown>
                                        <LinkContainer to="/register">
                                            <Nav.Link>Register</Nav.Link>
                                        </LinkContainer>
                                    </>
                                }
                                <ThemeController onThemeChange={(theme) => { this.setState({ theme }) }} />
                                {parsedEnv.REACT_APP_SHOW_VERSION_TAG && <small className="d-flex ms-xl-3 align-items-center"><Badge bg="secondary">v{window.appVersion}</Badge></small>}
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

const NavbarBrandContent = props => {
    return (
        <>
            {
                ((props.theme === 'light' && parsedEnv.REACT_APP_LIGHT_THEME_LOGO) || (props.theme === 'dark' && parsedEnv.REACT_APP_DARK_THEME_LOGO)) &&
                <Image
                    width={36}
                    height={36}
                    className="brand-image"
                    src={
                        props.theme === 'light'
                            ? parsedEnv.REACT_APP_LIGHT_THEME_LOGO
                            : parsedEnv.REACT_APP_DARK_THEME_LOGO
                    }
                    onError={(e) => { e.target.src = '/logo.svg'; }}
                />
            }
            {parsedEnv.REACT_APP_BRAND}
        </>
    );
}

export default withRouter(AppNavbar);
