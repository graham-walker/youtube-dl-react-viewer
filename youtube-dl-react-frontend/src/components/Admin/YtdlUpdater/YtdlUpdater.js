import React, { Component } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { getErrorMessage } from '../../../utilities/format.utility';
import { UserContext } from '../../../contexts/user.context';
import axios from '../../../utilities/axios.utility';
import { scrollToElement } from '../../../utilities/scroll.utility';

class YtdlUpdater extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props);
        this.state = {
            success: undefined,
            error: undefined,
        };
    }

    componentDidMount() {
        if (!this.props.youtubeDlPath) {
            this.setState({ error: 'Environment variable YOUTUBE_DL_PATH is not set' });
        }
    }

    post() {
        this.setState({ success: undefined, error: undefined }, () => {
            axios
                .post(
                    `/api/admin/youtube-dl/update`
                ).then(res => {
                    if (res.status === 200) {
                        this.setState({
                            success: res.data.success,
                            error: res.data.error
                        });
                        if (res.data.youtubeDlVersion) this.props.onYoutubeDlVersionChange(res.data.youtubeDlVersion);
                    }
                }).catch(err => {
                    this.setState({ error: getErrorMessage(err) });
                }).finally(() => {
                    scrollToElement('#youtube-dl-anchor');
                });
        });
    }

    render() {
        return (
            <>
                <h5 className="mb-4" id="youtube-dl-anchor">yt-dlp</h5>
                <Card className="mb-4">
                    <Card.Body>
                        {!!this.state.success && <Alert variant="success">{this.state.success}</Alert>}
                        {!!this.state.error && <Alert variant="danger">{this.state.error}</Alert>}
                        <p>Using: {this.props.youtubeDlPath.replaceAll('\\', '/').split('/').pop()} {this.props.youtubeDlVersion}</p>
                        <Button
                            name="update"
                            type="submit"
                            onClick={this.post.bind(this)}
                            disabled={!this.props.youtubeDlPath}
                        >
                            Update
                        </Button>
                    </Card.Body>
                </Card>
            </>
        );
    }
}

export default YtdlUpdater;
