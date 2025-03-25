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
import ThemeController from './ThemeController/ThemeController';
import parsedEnv from '../../parse-env';
import AdvancedSearchModal from './AdvancedSearchModal/AdvancedSearchModal';

class AppNavbar extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            search: '',
            theme: localStorage.getItem('theme') || 'auto',
            showAdvancedSearch: false
        };
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
        this.setTheme();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.location.search !== this.props.location.search) {
            let parsed = queryString.parse(this.props.location.search);
            this.setState({ search: parsed.search ?? '' });
        }

        if (prevState.theme !== this.state.theme) this.setTheme();
    }

    setTheme() {
        localStorage.setItem('theme', this.state.theme);
        if (this.state.theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
                document.documentElement.setAttribute('data-bs-theme', 'light');
            }
        } else {
            document.documentElement.setAttribute('data-bs-theme', this.state.theme);
        }
    }

    render() {
        const videoPageActive = history.location.pathname === '/' || history.location.pathname === '/videos';
        const loginPageActive = history.location.pathname === '/login';
        const registerPageActive = history.location.pathname === '/register';

        if (history.location.pathname !== '/global'
            && history.location.pathname !== '/global/') {
            const avatar = this.context.getAvatar();
            return (
                <Navbar
                    sticky="top"
                    bg="light"
                    className={this.context.getSetting('useGradientEffect') ? undefined : 'no-gradient'}
                >
                    <Container className='gap-3'>
                        <Nav id="desktop-nav" className="nav-segment">
                            <LinkContainer to="/">
                                <Navbar.Brand>
                                    <NavbarBrandContent theme={this.state.theme} />
                                </Navbar.Brand>
                            </LinkContainer>
                            {parsedEnv.REACT_APP_SHOW_VERSION_TAG && <small className="version-tag d-flex d-lg-none"><Badge bg="light">v{window.appVersion}</Badge></small>}
                            <div className='d-none d-lg-flex'>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/videos"
                                        title="Videos"
                                        aria-label="Videos"
                                        active={videoPageActive}
                                    >
                                        <FontAwesomeIcon icon="video" /><span className='ms-1 d-none d-xl-inline'>Videos</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/uploaders"
                                        title="Uploaders"
                                        aria-label="Uploaders"
                                    >
                                        <FontAwesomeIcon icon="user" /><span className='ms-1 d-none d-xl-inline'>Uploaders</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/tags"
                                        title="Tags"
                                        aria-label="Tags"
                                    >
                                        <FontAwesomeIcon icon="tag" /><span className='ms-1 d-none d-xl-inline'>Tags</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/statistics"
                                        title="Statistics"
                                        aria-label="Statistics"
                                    >
                                        <FontAwesomeIcon icon="chart-pie" /><span className='ms-1 d-none d-xl-inline'>Stats</span>
                                    </Nav.Link>
                                </Nav.Item>
                            </div>
                        </Nav>
                        <Nav id="search-nav" className="d-none d-lg-flex nav-segment">
                            <Form
                                className="form-inline flex-nowrap"
                                onSubmit={this.onSubmit}
                            >
                                <FormControl
                                    type="text"
                                    placeholder="Search"
                                    className="me-2"
                                    name="search"
                                    value={this.state.search}
                                    onChange={this.handleInputChange}
                                />
                                <Button
                                    variant="primary"
                                    type="submit"
                                    title="Search"
                                    aria-label="Search"
                                >
                                    <FontAwesomeIcon icon="search" />
                                </Button>
                            </Form>
                            <Button
                                variant="link"
                                title="Advanced search"
                                aria-label="Advanced search"
                                onClick={() => this.setState({ showAdvancedSearch: true })}
                            >
                                <FontAwesomeIcon icon="filter" />
                            </Button>
                            <AdvancedSearchModal show={this.state.showAdvancedSearch} onHide={() => this.setState({ showAdvancedSearch: false })} />
                        </Nav>
                        <Nav id="account-nav" className="nav-segment">
                            {this.context.user ?
                                <>
                                    <NavDropdown
                                        id="user-dropdown"
                                        title={
                                            <>
                                                <span className='username' title={this.context.getSetting('username')}>{this.context.getSetting('username')}</span>
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
                                        className='d-none d-sm-block'
                                    >
                                        <NavDropdown.ItemText
                                            style={{ width: '100vw', maxWidth: '350px' }}
                                        >
                                            <LoginForm inDropdown={true} />
                                        </NavDropdown.ItemText>
                                    </NavDropdown>
                                    <LinkContainer
                                        to="/login"
                                        className='d-sm-none'
                                        active={loginPageActive}
                                    >
                                        <Nav.Link>Login</Nav.Link>
                                    </LinkContainer>
                                    <LinkContainer
                                        className='d-none d-sm-block'
                                        to="/register"
                                        active={registerPageActive}
                                    >
                                        <Nav.Link>Register</Nav.Link>
                                    </LinkContainer>
                                </>
                            }
                            <ThemeController
                                className="ms-3 d-none d-lg-flex"
                                theme={this.state.theme}
                                onThemeChange={(theme) => { this.setState({ theme }) }}
                            />
                            {parsedEnv.REACT_APP_SHOW_VERSION_TAG && <small className="version-tag d-none d-lg-flex ms-3"><Badge bg="primary">v{window.appVersion}</Badge></small>}
                        </Nav>
                    </Container>
                    <Nav id="mobile-nav" className="w-100 d-flex d-lg-none">
                        <Nav.Item>
                            <Nav.Link
                                as={NavLink}
                                to="/videos"
                                title="Videos"
                                aria-label="Videos"
                                active={videoPageActive}
                            >
                                <FontAwesomeIcon icon="video" />
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                as={NavLink}
                                to="/uploaders"
                                title="Uploaders"
                                aria-label="Uploaders"
                            >
                                <FontAwesomeIcon icon="user" />
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                as={NavLink}
                                to="/tags"
                                title="Tags"
                                aria-label="Tags"
                            >
                                <FontAwesomeIcon icon="tag" />
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                as={NavLink}
                                to="/statistics"
                                title="Statistics"
                                aria-label="Statistics"
                            >
                                <FontAwesomeIcon icon="chart-pie" />
                            </Nav.Link>
                        </Nav.Item>
                        <Button
                            title="Search"
                            aria-label="Search"
                            onClick={() => this.setState({ showAdvancedSearch: true })}
                        >
                            <FontAwesomeIcon icon="search" />
                        </Button>
                        <ThemeController theme={this.state.theme} onThemeChange={(theme) => { this.setState({ theme }) }} />
                    </Nav>

                </Navbar>
            );
        } else {
            return null;
        }
    }
}

const NavbarBrandContent = props => {
    const theme = props.theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : props.theme;
    return (
        <>
            {
                ((theme === 'light' && parsedEnv.REACT_APP_LIGHT_THEME_LOGO) || (theme === 'dark' && parsedEnv.REACT_APP_DARK_THEME_LOGO)) &&
                <Image
                    width={36}
                    height={36}
                    className="brand-image"
                    src={
                        theme === 'light'
                            ? parsedEnv.REACT_APP_LIGHT_THEME_LOGO
                            : parsedEnv.REACT_APP_DARK_THEME_LOGO
                    }
                    onError={(e) => { e.target.src = '/logo.svg'; }}
                />
            }
            <span className='brand-text'>{parsedEnv.REACT_APP_BRAND}</span>
        </>
    );
}

export default withRouter(AppNavbar);
