import React, { Component } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import history from '../../../utilities/history.utility';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AdvancedSearchContext } from '../../../contexts/advancedsearch.context';

export default class AdvancedSearchModal extends Component {
    static contextType = AdvancedSearchContext;

    constructor(props) {
        super(props);
        this.onSubmit = this.onSubmit.bind(this);
        this.searchInputRef = React.createRef();
    }

    handleInputChange = (e) => {
        var { value, name, type } = e.target;
        if (type === 'checkbox') value = e.target.checked;
        this.context.setQueryParam(name, value);
    }

    onSubmit(e) {
        e.preventDefault();

        const newParams = new URLSearchParams();
        Object.keys(this.context.query).forEach((key) => {
            const value = this.context.query[key];
            if (value === "") {
                newParams.delete(key);
            } else {
                newParams.set(key, value);
            }
        });

        const newSearch = newParams.toString();
        history.push('/videos' + (newSearch ? `?${newSearch}` : ''));

        this.context.setShow(false);
    }

    handleShow = () => {
        setTimeout(() => {
            if (this.searchInputRef.current) {
                this.searchInputRef.current.focus();
            }
        }, 0);
    };

    render() {
        return (
            <Modal show={this.context.show} onHide={() => this.context.setShow(false)} onShow={this.handleShow} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Advanced search</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form id="advanced-search-form" className="form-inline" onSubmit={this.onSubmit}>
                        <div className='w-100 text-secondary' style={{ marginBottom: '-0.5rem' }}>
                            <small><FontAwesomeIcon icon="circle-info" className='me-1' />Surround text in quotes "like this" to look for an exact match</small>
                        </div>
                        <InputGroup className="w-100">
                            <InputGroup.Text><FontAwesomeIcon icon="search" />Search</InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Any"
                                name="search"
                                value={this.context.query.search}
                                onChange={this.handleInputChange}
                                ref={this.searchInputRef}
                            />
                        </InputGroup>
                        <InputGroup className="half">
                            <InputGroup.Text><FontAwesomeIcon icon="user" />Uploader</InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Any"
                                name="uploader"
                                value={this.context.query.uploader}
                                onChange={this.handleInputChange}
                            />
                        </InputGroup>
                        <InputGroup className="half">
                            <InputGroup.Text><FontAwesomeIcon icon="list" />Playlist</InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Any"
                                name="playlist"
                                value={this.context.query.playlist}
                                onChange={this.handleInputChange}
                            />
                        </InputGroup>
                        <InputGroup className="half">
                            <InputGroup.Text><FontAwesomeIcon icon="briefcase" />Job</InputGroup.Text>
                            <Form.Select
                                name="job"
                                onChange={this.handleInputChange}
                                value={this.context.query.job}
                            >
                                <option value="">Any</option>
                                {this.context.jobs.map((job, i) => <option value={job._id} key={i}>{job.name}</option>)}
                            </Form.Select>
                        </InputGroup>
                        <InputGroup className="half">
                            <InputGroup.Text><FontAwesomeIcon icon="globe" />Website</InputGroup.Text>
                            <Form.Select
                                name="extractor"
                                onChange={this.handleInputChange}
                                value={this.context.query.extractor}
                            >
                                <option value="">Any</option>
                                {this.context.extractors.map((extractor, i) => <option value={extractor} key={i}>{extractor}</option>)}
                            </Form.Select>
                        </InputGroup>
                        <InputGroup className="half">
                            <InputGroup.Text><FontAwesomeIcon icon="calendar-alt" />After</InputGroup.Text>
                            <Form.Control
                                type="datetime-local"
                                name="uploadStart"
                                value={this.context.query.uploadStart}
                                onChange={this.handleInputChange}
                            />
                        </InputGroup>
                        <InputGroup className="half">
                            <InputGroup.Text><FontAwesomeIcon icon="calendar-alt" />Before</InputGroup.Text>
                            <Form.Control
                                type="datetime-local"
                                name="uploadEnd"
                                value={this.context.query.uploadEnd}
                                onChange={this.handleInputChange}
                            />
                        </InputGroup>
                        <InputGroup className="w-100">
                            <InputGroup.Text><FontAwesomeIcon className='me-1' icon="sort" />Sort by</InputGroup.Text>
                            <Form.Select
                                name="sort"
                                onChange={this.handleInputChange}
                                value={this.context.query.sort}
                            >
                                <option value="relevance">Relevance</option>
                                <option value="newest_date">Date Uploaded (Newest)</option>
                                <option value="oldest_date">Date Uploaded (Oldest)</option>
                                <option value="longest_duration">Duration (Longest)</option>
                                <option value="shortest_duration">Duration (Shortest)</option>
                                <option value="largest_size">Filesize (Largest)</option>
                                <option value="smallest_size">Filesize (Smallest)</option>
                                <option value="most_views">Views (Most)</option>
                                <option value="least_views">Views (Least)</option>
                                <option value="most_likes">Likes (Most)</option>
                                <option value="least_likes">Likes (Least)</option>
                                <option value="most_dislikes">Dislikes (Most)</option>
                                <option value="least_dislikes">Dislikes (Least)</option>
                                <option value="ratio_likes">Likes to Dislikes (Ratio)</option>
                                <option value="ratio_dislikes">Dislikes to Likes (Ratio)</option>
                                <option value="newest_download">Date Downloaded (Newest)</option>
                                <option value="oldest_download">Date Downloaded (Oldest)</option>
                            </Form.Select>
                        </InputGroup>
                        <div className="w-100 mb-0 text-end">
                            <Button type="submit">
                                <FontAwesomeIcon icon="search" /> Search
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        );
    }
}
