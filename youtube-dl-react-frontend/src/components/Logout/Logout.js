import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import PageLoadWrapper from '../PageLoadWrapper/PageLoadWrapper';
import { UserContext } from '../../contexts/user.context';
import axios from '../../utilities/axios.utility';

export default class Logout extends Component {
    static contextType = UserContext;
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            error: undefined,
            redirectTo: undefined,
        };
    }

    componentDidMount() {
        document.dispatchEvent(new MouseEvent('click'));

        axios.post('/api/auth/logout').then(res => {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('user');

            this.context.updateUser();
            this.setState({
                loading: false,
                redirectTo: res.data.hasGlobalPassword ? '/global' : '/'
            })
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
                {!this.state.loading && <Redirect to={this.state.redirectTo} />}
            </PageLoadWrapper>
        );
    }

}
