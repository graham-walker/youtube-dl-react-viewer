import React from 'react';
import { Spinner } from 'react-bootstrap';
import ErrorPage from '../Error/Error';

const PageLoadWrapper = props => {
    if (props.loading) {
        if (props.error) {
            return <ErrorPage error={props.error}></ErrorPage>;
        } else {
            return (
                <div className="text-center">
                    <Spinner animation="border" />
                </div>
            );
        }
    } else {
        return props.children;
    }
}

export default PageLoadWrapper;
