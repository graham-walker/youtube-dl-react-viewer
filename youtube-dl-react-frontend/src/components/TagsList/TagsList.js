import React, { Component } from 'react';
import { Form, Badge, Row, Col, Spinner, InputGroup } from 'react-bootstrap';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import axios from '../../utilities/axios.utility';
import { Link } from 'react-router-dom';
import { createSearchLink } from '../../utilities/search.utility';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import queryString from 'query-string';
import history from '../../utilities/history.utility';
import InfiniteScroll from 'react-infinite-scroll-component';
import parsedEnv from '../../parse-env';

export default class TagsList extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            success: undefined,
            error: undefined,
            tags: [],
            categories: [],
            hashtags: [],
            sort: 'count',
            show: 'tags',
            hasMore: true,
            display: [],
            page: 0,
        };
    }

    componentDidMount() {
        document.title = `${this.state.show.charAt(0).toUpperCase() + this.state.show.slice(1)} - ${parsedEnv.REACT_APP_BRAND}`;

        let parsed = queryString.parse(this.props.location.search);
        parsed = this.queryStringDefaults(parsed);
        this.setState({ sort: parsed['sort'], show: parsed.show }, () => {
            axios.get('/api/statistics/tags').then(res => {
                if (res.status === 200) {
                    this.setState({
                        loading: false,
                        tags: res.data.tags,
                        categories: res.data.categories,
                        hashtags: res.data.hashtags,
                    }, () => { this.getTags(); });
                }
            }).catch(err => {
                this.setState({ error: err });
            });
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.location.search !== this.props.location.search) {
            let parsed = queryString.parse(this.props.location.search);
            parsed = this.queryStringDefaults(parsed);
            this.setState({ sort: parsed['sort'], show: parsed.show, page: 0, display: [], hasMore: true }, () => { this.getTags(); });
        }
    }

    queryStringDefaults(parsed) {
        if (!['alphabetical', 'count'].includes(parsed['sort'])) parsed['sort'] = 'count';
        if (!['tags', 'categories', 'hashtags'].includes(parsed.show)) parsed.show = 'tags';
        return parsed;
    }

    handleInputChange = (e) => {
        e.preventDefault();
        this.setState({ [e.target.name]: e.target.value }, () => {
            const parsed = queryString.parse(this.props.location.search);
            const stringified = queryString.stringify({
                search: parsed?.search,
                sort: this.state['sort'],
                show: this.state.show,
            });
            history.push(`${this.props.location.pathname}${stringified ? '?' + stringified : ''}`);
        });
    }

    sortTags = (tags) => {
        if (this.state['sort'] === 'alphabetical') {
            return tags.sort((a, b) => a.name.localeCompare(b.name, 'en'));
        } else if (this.state.sort === 'count') {
            return tags.sort((a, b) => b.count - a.count);
        }
    }

    getTags = () => {
        let tags = this.state.page === 0 ? this.sortTags(this.state[this.state.show]) : this.state[this.state.show];
        this.setState({ [this.state.show]: tags }, () => {
            this.setState({
                display: [...this.state.display, ...this.state[this.state.show].slice(this.state.page * 1000, (this.state.page * 1000) + 1000)],
                page: this.state.page + 1,
                hasMore: (this.state.page + 1) * 1000 < this.state[this.state.show].length,
            });
        });

    }

    render() {
        const display = this.state.display.map((tag, i) =>
            <div className="w-auto p-0" key={i}>
                <h5>
                    <Link
                        to={createSearchLink(tag.name)}
                    >
                        <Badge
                            bg="secondary"
                            className="ms-1"
                        >
                            {tag.name} ({tag.count.toLocaleString()})
                        </Badge>
                    </Link>
                </h5>
            </div>
        );

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
                        <h1 className="mb-4">
                            {this.state[this.state.show].length.toLocaleString()} {this.state.show.charAt(0).toUpperCase() + this.state.show.slice(1)}
                        </h1>
                        <Row className="mb-4">
                            <Col xs="12" sm="auto">
                                <InputGroup className="mb-3">
                                    <InputGroup.Text><FontAwesomeIcon className='me-1' icon="sort" />Sort by</InputGroup.Text>
                                    <Form.Select
                                        name="sort"
                                        onChange={this.handleInputChange}
                                        value={this.state['sort']}
                                    >
                                        <option value="count">Count</option>
                                        <option value="alphabetical">Alphabetical</option>
                                    </Form.Select>
                                </InputGroup>
                            </Col>
                            <Col xs="12" sm="auto">
                                <InputGroup className="mb-3">
                                    <InputGroup.Text><FontAwesomeIcon className='me-1' icon="eye" />Show</InputGroup.Text>
                                    <Form.Select
                                        name="show"
                                        onChange={this.handleInputChange}
                                        value={this.state.show}
                                    >
                                        <option value="tags">Tags</option>
                                        <option value="categories">Categories</option>
                                        <option value="hashtags">Hashtags</option>
                                    </Form.Select>
                                </InputGroup>
                            </Col>
                        </Row>
                        <InfiniteScroll
                            dataLength={this.state.display.length}
                            next={this.getTags}
                            hasMore={this.state.hasMore}
                            loader={
                                <div className="text-center">
                                    <Spinner animation="border" />
                                </div>
                            }
                            endMessage={
                                <p className="text-center fw-bold">
                                    {this.state[this.state.show].length === 0 ? 'No results found' : 'No more results'}
                                </p>
                            }
                            style={{ overflow: 'hidden' }}>
                            <Row
                                style={{
                                    marginLeft: '-0.25rem',
                                    marginRight: '-0.25rem'
                                }}
                            >
                                {display}
                            </Row>
                        </InfiniteScroll>
                    </div>
                }
            </PageLoadWrapper>
        );
    }
}
