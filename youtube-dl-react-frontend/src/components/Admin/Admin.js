import React, { Component } from 'react';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import axios from '../../utilities/axios.utility';

import VideoDeleter from './VideoDeleter/VideoDeleter';
import UpdateChecker from './UpdateChecker/UpdateChecker';
import YtdlUpdater from './YtdlUpdater/YtdlUpdater';
import ChannelIconDownloader from './ChannelIconDownloader/ChannelIconDownloader';
import HashVerifier from './HashVerifier/HashVerifier';
import JobDownloader from './JobDownloader/JobDownloader';
import LogFileList from './LogFileList/LogFileList';
import RetryImports from './RetryImports/RetryImports';
import JobEditor from './JobEditor/JobEditor';
import VideoImporter from './VideoImporter/VideoImporter';
import RecalcStatistics from './RecalcStatistics/RecalcStatistics';
import parsedEnv from '../../parse-env';

export default class AdminPage extends Component {
    static contextType = UserContext;

    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            success: undefined,
            error: undefined,
            jobs: [],
            errors: [],
            extractors: [],
            adminFiles: [],
            youtubeDlPath: undefined,
            youtubeDlVersion: undefined,
            defaultActivejobId: undefined,
            consoleOutput: [],
            historyUpdated: 0,
        };
    }

    componentDidMount() {
        document.title = `Admin - ${parsedEnv.REACT_APP_BRAND}`;

        axios
            .get('/api/admin').then(res => {
                if (res.status === 200) this.setState({
                    loading: false,
                    jobs: res.data.jobs,
                    errors: res.data.errors,
                    extractors: res.data.extractors,
                    adminFiles: res.data.adminFiles,
                    youtubeDlPath: res.data.youtubeDlPath,
                    youtubeDlVersion: res.data.youtubeDlVersion,
                    defaultActivejobId: res.data.jobs[0]?._id,
                    consoleOutput: res.data.consoleOutput,
                    historyUpdated: res.data.historyUpdated,
                });
            }).catch(err => {
                this.setState({ error: err });
            });
    }

    render() {
        return (
            <PageLoadWrapper
                loading={this.state.loading}
                error={this.state.error}
            >
                {!this.state.loading &&
                    <div
                        className="mx-auto"
                        style={{ maxWidth: '1200px' }}
                    >
                        <h1 className="mb-4">Admin</h1>
                        {parsedEnv.REACT_APP_CHECK_FOR_UPDATES && <UpdateChecker />}
                        <LogFileList adminFiles={this.state.adminFiles} consoleOutput={this.state.consoleOutput} historyUpdated={this.state.historyUpdated} />
                        <YtdlUpdater
                            youtubeDlPath={this.state.youtubeDlPath}
                            youtubeDlVersion={this.state.youtubeDlVersion}
                            onYoutubeDlVersionChange={(version) => this.setState({ youtubeDlVersion: version })}
                        />
                        <JobDownloader
                            jobs={this.state.jobs}
                            onYoutubeDlVersionChange={(version) => this.setState({ youtubeDlVersion: version })}
                        />
                        <JobEditor jobs={this.state.jobs} defaultActivejobId={this.state.defaultActivejobId} onJobsChange={(jobs) => this.setState({ jobs })} />
                        <VideoImporter jobs={this.state.jobs} />
                        <VideoDeleter extractors={this.state.extractors} />
                        <ChannelIconDownloader />
                        <HashVerifier />
                        <RecalcStatistics />
                        <RetryImports errors={this.state.errors} />
                    </div>
                }
            </PageLoadWrapper>
        );
    }
}
