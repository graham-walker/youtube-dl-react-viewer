import React, { Component } from 'react';
import { Alert } from 'react-bootstrap';
import axios from '../../../utilities/axios.utility';
import parsedEnv from '../../../parse-env';

class UpdateChecker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            message: undefined,
            variant: undefined,
        }
    }

    componentDidMount() {
        axios.get(parsedEnv.REACT_APP_GITHUB_API_URL, {
            headers: {
                Accept: 'application/vnd.github.v3+json',
            }
        }).then(res => {
            if (res.status === 200) {
                if (res?.data?.tag_name) {
                    if (this.getVersionScore(res.data.tag_name) > this.getVersionScore(window.appVersion)) {
                        this.setState({
                            message: <>A new version of <a
                                href={parsedEnv.REACT_APP_LATEST_RELEASE_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                            >{parsedEnv.REACT_APP_REPO_NAME}</a> is available
                                ({res.data.tag_name.slice(1)} &gt; {window.appVersion})</>,
                            variant: 'info',
                        });
                    } else if (this.getVersionScore(res.data.tag_name) === this.getVersionScore(window.appVersion)) {
                        this.setState({ message: `You are using the latest version of ${parsedEnv.REACT_APP_REPO_NAME} (${window.appVersion})`, variant: 'success' });
                    } else {
                        this.setState({
                            message: `You are using a development version of ${parsedEnv.REACT_APP_REPO_NAME} (${window.appVersion})`, variant: 'warning'
                        });
                    }
                } else {
                    this.setState({ message: `Failed to check for updates to ${parsedEnv.REACT_APP_REPO_NAME}`, variant: 'danger' });
                }
            }
        }).catch(err => {
            console.error(err);
            this.setState({ message: `Failed to check for updates to ${parsedEnv.REACT_APP_REPO_NAME}`, variant: 'danger' });
        });
    }

    getVersionScore = (tagName) => {
        if (tagName.startsWith('v')) tagName = tagName.slice(1);
        let versionNumbers = tagName.split('.').reverse();
        let score = 0;
        let scale = 1;
        for (let i = 0; i < versionNumbers.length; i++) {
            score += parseInt(versionNumbers[i]) * scale;
            scale *= 100;
        }
        return score;
    }

    render() {
        return (
            this.state.message ? <Alert variant={this.state.variant}>{this.state.message}</Alert> : <></>
        );
    }
}

export default UpdateChecker;
