import React, { createContext, Component } from 'react';
import AuthService from '../services/auth.service';

export const UserContext = createContext();

class Context extends Component {
    state = {
        user: AuthService.getCurrentUser(),
        updateUser: (user) => {
            this.setState({ user });
        }
    };

    render() {
        return (
            <UserContext.Provider value={this.state}>
                {this.props.children}
            </UserContext.Provider>
        );
    }
}

export default Context;
