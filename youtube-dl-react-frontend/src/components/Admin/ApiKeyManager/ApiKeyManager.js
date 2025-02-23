import axios from '../../../utilities/axios.utility';
import { Tab, Form, Button, Card, Nav, Alert, OverlayTrigger, Tooltip, InputGroup } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { Component, useState } from 'react';
import { UserContext } from '../../../contexts/user.context';

const ApiKeyManager = (props) => {
    const [activeKey, setActiveKey] = useState('new');

    const addApiKey = (apiKey) => {
        setActiveKey(apiKey._id);
        apiKey.isNew = true;
        props.onApiKeysChange([...props.apiKeys, apiKey]);
    }

    const setApiKey = (apiKey) => {
        let apiKeys = [...props.apiKeys];
        for (let i = 0; i < apiKeys.length; i++) {
            if (apiKeys[i]._id === apiKey._id) {
                apiKeys[i].name = apiKey.name;
                break;
            }
        }
        props.onApiKeysChange(apiKeys);
    }

    return (
        <>
            <h5 id="api-keys-anchor" className="mb-4">API keys</h5>
            <Card className="mb-4">
                <Tab.Container activeKey={activeKey} onSelect={activeKey => setActiveKey(activeKey)}>
                    <Card.Header>
                        <Nav
                            className="nav-tabs card-header-tabs"
                            style={{ transform: 'translateY(1px)' }}
                        >
                            {props.apiKeys.map(apiKey =>
                                <Nav.Link
                                    eventKey={apiKey._id}
                                    className="tab-constrained"
                                    title={apiKey.name}
                                    key={apiKey._id}
                                >
                                    {apiKey.name}
                                </Nav.Link>
                            )}
                            <Nav.Link
                                eventKey="new"
                                className="tab-constrained"
                                title="New API Key"
                            >
                                <FontAwesomeIcon
                                    className="text-primary"
                                    icon="plus"
                                />
                            </Nav.Link>
                        </Nav>
                    </Card.Header>
                    <Card.Body>
                        <Tab.Content>
                            {props.apiKeys.map(apiKey =>
                                <Tab.Pane
                                    eventKey={apiKey._id}
                                    key={apiKey._id}
                                >
                                    <ApiKeyForm
                                        apiKey={apiKey}
                                        setApiKey={setApiKey}
                                        active={activeKey === apiKey._id}
                                    />
                                </Tab.Pane>
                            )}
                            <Tab.Pane eventKey="new">
                                <ApiKeyForm
                                    addApiKey={addApiKey}
                                    new
                                    active={activeKey === 'new'}
                                    currentUserId={props.currentUserId}
                                />
                            </Tab.Pane>
                        </Tab.Content>
                    </Card.Body>
                </Tab.Container>
            </Card>
        </>
    );
}

class ApiKeyForm extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            error: undefined,
            success: undefined,
            name: '',
            userDocument: this.props.currentUserId,
            pattern: '^.*$',
            enabled: true,
        }
        this.initialState = { ...this.state };
    }

    componentDidMount() {
        if (this.props.apiKey) {
            let apiKey = { ...this.props.apiKey };
            delete apiKey._id;
            if (apiKey.isNew) {
                delete apiKey.isNew;
                this.setState({ ...apiKey, success: 'New API key saved' });
            } else {
                this.setState(apiKey);
            }
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.active && !this.props.active) {
            this.setState({ ...this.state, error: undefined, success: undefined });
        }
    }

    handleInputChange = (e) => {
        let { value, name, type } = e.target;
        if (type === 'checkbox') value = e.target.checked;
        this.setState({ [name]: value });
    }

    onSubmit = (e) => {
        e.preventDefault();

        let form = { ...this.state };
        delete form.error;
        this.setState({ error: undefined, success: undefined }, () => {
            axios
                .post('/api/admin/api-keys/save/' + (this.props.new
                    ? 'new'
                    : this.props.apiKey._id
                ), form).then(res => {
                    if (res.status === 200) {
                        if (this.props.new) {
                            let state = { ...this.initialState };
                            this.setState(state);
                            this.props.addApiKey(res.data);
                        } else {
                            this.setState({ success: 'API key saved' });
                            this.props.setApiKey(res.data);
                        }
                    }
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#api-keys-anchor');
                });
        })
    }
    render() {
        return (
            <>
                {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                <Form onSubmit={this.onSubmit}>
                    {this.state.key && this.props.apiKey?._id &&
                        <Form.Group className="mb-3" controlId={'key' + this.props.apiKey._id}>
                            <OverlayTrigger overlay={<Tooltip>Pass this value as a cookie named "key" with your request to access protected routes</Tooltip>}>
                                <Form.Label>API key <FontAwesomeIcon icon="circle-info" /></Form.Label>
                            </OverlayTrigger>
                            <Form.Control
                                type="text"
                                placeholder="API key"
                                name="key"
                                value={this.state.key}
                                required
                                disabled={true}
                            />
                        </Form.Group>
                    }
                    <Form.Group className="mb-3" controlId={'name' + (this.props.apiKey?._id || 'new')}>
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Name"
                            name="name"
                            value={this.state.name}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'userDocument' + (this.props.apiKey?._id || 'new')}>
                        <OverlayTrigger overlay={<Tooltip>The ID of the user this API key authenticates</Tooltip>}>
                            <Form.Label>User ID <FontAwesomeIcon icon="circle-info" /></Form.Label>
                        </OverlayTrigger>
                        <Form.Control
                            type="text"
                            placeholder="User ID"
                            name="userDocument"
                            value={this.state.userDocument}
                            onChange={this.handleInputChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'pattern' + (this.props.apiKey?._id || 'new')}>
                        <OverlayTrigger overlay={<Tooltip>Regex pattern matching the protected routes this API key is allowed to access</Tooltip>}>
                            <Form.Label>Pattern <FontAwesomeIcon icon="circle-info" /></Form.Label>
                        </OverlayTrigger>
                        <InputGroup className="mb-3">
                            <InputGroup.Text>/</InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="^.*$"
                                name="pattern"
                                value={this.state.pattern}
                                onChange={this.handleInputChange}
                                required
                            />
                            <InputGroup.Text>/</InputGroup.Text>
                        </InputGroup>
                    </Form.Group>
                    <Form.Group className="mb-3" controlId={'enabled' + (this.props.apiKey?._id || 'new')}>
                        <Form.Check
                            checked={this.state.enabled}
                            type="checkbox"
                            name="enabled"
                            label="Enabled"
                            onChange={this.handleInputChange}
                        />
                    </Form.Group>
                    <Button type="submit">Save</Button>
                </Form>
            </>
        );
    }
}

export default ApiKeyManager;
