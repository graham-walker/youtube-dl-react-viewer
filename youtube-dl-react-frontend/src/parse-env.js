const parsedEnv = {
    REACT_APP_BRAND: process.env.REACT_APP_BRAND || 'youtube-dl Viewer',
    REACT_APP_CHECK_FOR_UPDATES: process.env.REACT_APP_CHECK_FOR_UPDATES === undefined ? true : process.env.REACT_APP_CHECK_FOR_UPDATES.toLowerCase() === 'true',
    REACT_APP_SHOW_VERSION_TAG: process.env.REACT_APP_SHOW_VERSION_TAG === undefined ? true : process.env.REACT_APP_SHOW_VERSION_TAG.toLowerCase() === 'true',
    REACT_APP_LIGHT_THEME_LOGO: process.env.REACT_APP_LIGHT_THEME_LOGO ?? '/logo.svg',
    REACT_APP_DARK_THEME_LOGO: process.env.REACT_APP_DARK_THEME_LOGO ?? '/logo.svg',
    REACT_APP_LOAD_EXTERNAL_THUMBNAILS: process.env.REACT_APP_LOAD_EXTERNAL_THUMBNAILS === undefined ? false : process.env.REACT_APP_LOAD_EXTERNAL_THUMBNAILS.toLowerCase() === 'true',
    REACT_APP_OUT_OF_DATE_COLOR_DAYS: process.env.REACT_APP_OUT_OF_DATE_COLOR_DAYS === undefined ? 30 : parseInt(process.env.REACT_APP_OUT_OF_DATE_COLOR_DAYS),
    REACT_APP_REPO_NAME: process.env.REACT_APP_REPO_NAME || 'youtube-dl-react-viewer',
    REACT_APP_REPO_URL: process.env.REACT_APP_REPO_URL || 'https://github.com/graham-walker/youtube-dl-react-viewer',
    REACT_APP_GITHUB_API_URL: process.env.REACT_APP_GITHUB_API_URL || 'https://api.github.com/repos/graham-walker/youtube-dl-react-viewer/releases/latest',
    REACT_APP_LATEST_RELEASE_LINK: process.env.REACT_APP_LATEST_RELEASE_LINK || 'https://github.com/graham-walker/youtube-dl-react-viewer/releases/latest',
    REACT_APP_RUNNING_IN_DOCKER: process.env.REACT_APP_RUNNING_IN_DOCKER === undefined ? false : process.env.REACT_APP_RUNNING_IN_DOCKER.toLowerCase() === 'true',
};

if (parsedEnv.REACT_APP_REPO_URL.endsWith('/')) parsedEnv.REACT_APP_REPO_URL = parsedEnv.REACT_APP_REPO_URL.slice(0, -1);
if (parsedEnv.REACT_APP_GITHUB_API_URL.endsWith('/')) parsedEnv.REACT_APP_GITHUB_API_URL = parsedEnv.REACT_APP_GITHUB_API_URL.slice(0, -1);
if (parsedEnv.REACT_APP_LATEST_RELEASE_LINK.endsWith('/')) parsedEnv.REACT_APP_LATEST_RELEASE_LINK = parsedEnv.REACT_APP_LATEST_RELEASE_LINK.slice(0, -1);

export default parsedEnv;
