import React, { Component } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';

class ChannelIconDownloader extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
        };
        this.post = this.post.bind(this);
    }

    post(force = false) {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    '/api/admin/download_uploader_icons?force=' + force
                ).then(res => {
                    if (res.status === 200) this.setState({
                        success: res.data.success,
                        error: res.data.error
                    });
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#uploader-icons-anchor');
                });
        });
    }

    render() {
        return (
            <>
                <h5 id="uploader-icons-anchor" className="mb-4">Uploader icons</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <Button
                            name="update"
                            type="submit"
                            onClick={() => this.post()}
                            className="me-2"
                        >
                            Download
                        </Button>
                        <Button
                            name="update"
                            type="submit"
                            onClick={() => this.post(true)}
                        >
                            Download (overwrite)
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

export default ChannelIconDownloader;
