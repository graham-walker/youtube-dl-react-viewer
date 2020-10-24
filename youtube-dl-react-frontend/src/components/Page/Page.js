import React from 'react';

const Page = props => {
    return (
        <div
            className="mx-auto"
            style={{ maxWidth: props.clamp }}
        >
            {!!props.title && <h1 className="mb-4">{props.title}</h1>}
            <div className="card">
                <div className="card-body">
                    {props.children}
                </div>
            </div>
        </div>
    );
}

export default Page;
