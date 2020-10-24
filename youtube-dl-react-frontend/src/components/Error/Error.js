import React from 'react';

const ErrorPage = props => {
    let err = props.error;
    if (err.response) {
        if (err.response.data.hasOwnProperty('error')) {
            err = `${err.response.status} - ${err.response.statusText}: ${err.response.data.error}`;
        } else {
            err = `${err.response.status} - ${err.response.statusText}`;
        }
    } else {
        if (err.message) err = err.message;
    }

    return <h1>{err ? err : 'Unknown Error'}</h1>;
}

export default ErrorPage;
