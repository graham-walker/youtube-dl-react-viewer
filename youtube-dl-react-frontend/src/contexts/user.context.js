import React, { createContext, Component } from 'react';
import AuthService from '../services/auth.service';
import axios from '../utilities/axios.utility';

export const UserContext = createContext();

class Context extends Component {
    state = {
        user: AuthService.getCurrentUser(),
        updateUser: (user) => {
            this.setState({ user });
        }
    };

    componentDidMount() {
        if (AuthService.getCurrentUser()) axios.get('/api/users/settings')
            .then(res => {
                this.setState(res.data);
            })
            .catch(err => {
                console.error(err);
            });
    }

    render() {
        return (
            <UserContext.Provider value={this.state}>
                {this.props.children}
            </UserContext.Provider>
        );
    }
}

export default Context;
