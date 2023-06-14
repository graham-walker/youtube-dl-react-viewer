import axios from '../utilities/axios.utility';
import history from '../utilities/history.utility';

class AuthService {
    globalLogin(password) {
        return axios
            .post('api/auth/global', {
                password
            })
            .then(() => {
                localStorage.setItem('authenticated', true);
                document.dispatchEvent(new MouseEvent('click'));
                history.push('/');
            });
    }

    register(username, password) {
        return axios.post('/api/auth/register', {
            username,
            password
        });
    }

    login(username, password) {
        return axios.post('/api/auth/login',
            {
                username,
                password
            }
        )
            .then(res => {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                return res;
            });
    }

    isAuthenticated() {
        return localStorage.getItem('authenticated') === 'true';
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user'));
    }
}

const authService = new AuthService();

export default authService;
