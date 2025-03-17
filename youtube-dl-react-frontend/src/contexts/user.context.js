import React, { createContext, Component } from 'react';
import AuthService from '../services/auth.service';
import axios from '../utilities/axios.utility';
import { getDefaultUserSettings } from '../utilities/user.utility';

const defaultUserSettings = getDefaultUserSettings();

export const UserContext = createContext();

class Context extends Component {
    state = {
        user: AuthService.getCurrentUser(),
        updateUser: (user) => {
            this.setState({ user });
        },
        getSetting: (settingKey) => {
            const user = this.state?.user;
            if (user && user.hasOwnProperty(settingKey)) {
                return user[settingKey];
            } else {
                return defaultUserSettings?.[settingKey] ?? undefined;
            }
        },
        getAvatar: () => {
            return this.state.getSetting('avatar') ? ('/static/users/avatars/' + this.state.getSetting('avatar')) : '/default-avatar.svg';
        },
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
