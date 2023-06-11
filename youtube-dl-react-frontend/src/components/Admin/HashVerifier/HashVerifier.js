import React, { Component } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';

class HashVerifier extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
        };
    }

    post() {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    '/api/admin/verify_hashes'
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                });
        });
    }

    render() {
        return (
            <>
                <h5 className="mb-4">File integrity</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Button
                            name="update"
                            type="submit"
                            onClick={this.post.bind(this)}
                            className="me-2"
                        >
                            Verify file hashes
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

export default HashVerifier;
