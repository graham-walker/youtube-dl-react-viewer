import React, { createContext, Component } from 'react';
import axios from '../utilities/axios.utility';
import history from '../utilities/history.utility';

const initialQuery = {
    search: '',
    uploader: '',
    playlist: '',
    job: '',
    extractor: '',
    uploadStart: '',
    uploadEnd: '',
    sort: 'relevance',
};

export const AdvancedSearchContext = createContext();

class AdvancedSearchProvider extends Component {
    state = {
        show: false,
        query: { ...initialQuery },
        jobs: [],
        extractors: [],
        setShow: (show) => {
            this.setState({ show });
        },
        setNewQuery: (query) => {
            this.setState({ query: Object.assign({ ...initialQuery }, query) });
        },
        setQueryParam: (name, value) => {
            this.setState((prevState) => ({ query: { ...prevState.query, [name]: value } }));
        },
    };

    componentDidMount() {
        this.getSearchOptions();
        this.getStateFromSearch();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.show !== this.state.show && this.state.show) {
            this.getSearchOptions();
            this.getStateFromSearch();
        }
    }

    getStateFromSearch() {
        if (history.location.pathname === '/' || history.location.pathname === '/videos') {
            this.setState({ query: Object.assign({ ...initialQuery }, Object.fromEntries(new URLSearchParams(window.location.search))) });
        }
    }

    getSearchOptions() {
        axios
            .get(`/api/videos/advanced_search_options`)
            .then(res => {
                if (res.status === 200) {
                    this.setState({
                        jobs: res.data.jobs,
                        extractors: res.data.extractors,
                    });
                }
            }).catch(err => {
                console.error(err);
            });
    }

    render() {
        return (
            <AdvancedSearchContext.Provider value={this.state}>
                {this.props.children}
            </AdvancedSearchContext.Provider>
        );
    }
}

export default AdvancedSearchProvider;
