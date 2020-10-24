import axios from 'axios';
import history from './history.utility';

axios.interceptors.response.use(res => {
    return res;
}, err => {
    if (err.response.status === 401 && !err.response.data?.noRedirect) {
        history.push('/logout');
    } else {
        return Promise.reject(err);
    }
});

export default axios;
