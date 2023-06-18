const parsedEnv = {
    REACT_APP_BRAND: process.env.REACT_APP_BRAND || 'youtube-dl Viewer',
    REACT_APP_CHECK_FOR_UPDATES: process.env.REACT_APP_CHECK_FOR_UPDATES === undefined ? true : process.env.REACT_APP_CHECK_FOR_UPDATES.toLowerCase() === 'true',
    REACT_APP_SHOW_VERSION_TAG: process.env.REACT_APP_SHOW_VERSION_TAG === undefined ? true : process.env.REACT_APP_SHOW_VERSION_TAG.toLowerCase() === 'true',
    REACT_APP_LIGHT_THEME_LOGO: process.env.REACT_APP_LIGHT_THEME_LOGO ?? '/logo.svg',
    REACT_APP_DARK_THEME_LOGO: process.env.REACT_APP_DARK_THEME_LOGO ?? '/logo.svg',
    REACT_APP_LOAD_EXTERNAL_THUMBNAILS: process.env.REACT_APP_LOAD_EXTERNAL_THUMBNAILS === undefined ? false : process.env.REACT_APP_LOAD_EXTERNAL_THUMBNAILS.toLowerCase() === 'true',
    REACT_APP_OUT_OF_DATE_COLOR_DAYS: process.env.REACT_APP_OUT_OF_DATE_COLOR_DAYS === undefined ? 30 : parseInt(process.env.REACT_APP_OUT_OF_DATE_COLOR_DAYS),
};

export default parsedEnv;
