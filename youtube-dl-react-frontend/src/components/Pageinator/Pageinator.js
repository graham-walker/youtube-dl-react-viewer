import React, { Component } from 'react';
import { LinkContainer } from 'react-router-bootstrap';
import { Pagination } from 'react-bootstrap';

export default class Paginator extends Component {
    componentDidUpdate() {
        window.scrollTo(0, 0);
    }

    render() {
        const page = parseInt(this.props.page) || 1;
        let items = [];
        const range = 2;
        let start = page - range;
        let end = page + range;

        if (start <= 0) {
            end = end - start + 1;
            start = 1;
        }
        if (end > this.props.maxPages) {
            end = this.props.maxPages;
            start = Math.max(end - (range * 2), 1);
        }

        items.push(
            <LinkContainer to={`/${this.props.baseUrl}/1`}>
                <Pagination.First disabled={page === 1} className="pagination-text" />
            </LinkContainer>
        );
        items.push(
            <LinkContainer to={`/${this.props.baseUrl}/${page - 1}`}>
                <Pagination.Prev disabled={page === 1} className="pagination-text" />
            </LinkContainer>
        );
        for (let i = start; i <= end; i++) {
            items.push(
                <LinkContainer to={`/${this.props.baseUrl}/${i}`}>
                    <Pagination.Item active={i === page} style={{ width: '36px !important' }} key={i}>
                        {i}
                    </Pagination.Item>
                </LinkContainer>
            );
        }
        items.push(
            <LinkContainer to={`/${this.props.baseUrl}/${page + 1}`}>
                <Pagination.Next disabled={page === this.props.maxPages} className="pagination-text" />
            </LinkContainer>
        );
        items.push(
            <LinkContainer to={`/${this.props.baseUrl}/${this.props.maxPages}`}>
                <Pagination.Last disabled={page === this.props.maxPages} className="pagination-text" />
            </LinkContainer>
        );

        if (this.props.bottom) {
            return (
                <>
                    <Pagination className="justify-content-center my-2">{items}</Pagination>
                    <p className="text-center">
                        Page <strong>{page}</strong> of <strong>{this.props.maxPages}</strong>
                    </p>
                </>
            );
        } else {
            return (
                <>
                    <p className="text-center mb-2">
                        Page <strong>{page}</strong> of <strong>{this.props.maxPages}</strong>
                    </p>
                    <Pagination className="justify-content-center mb-4">{items}</Pagination>
                </>
            );
        }

    }
}