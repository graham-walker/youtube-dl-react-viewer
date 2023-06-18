import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import '../node_modules/videojs-hotkeys/videojs.hotkeys.min.js';
import '../node_modules/video.js/dist/video-js.min.css'
import App from './App';
import parsedEnv from './parse-env';

document.title = parsedEnv.REACT_APP_BRAND;
window.gitHubLink = 'https://github.com/graham-walker/youtube-dl-react-viewer';
window.githubApiLink = 'https://api.github.com/repos/graham-walker/youtube-dl-react-viewer/releases/latest';
window.gitHubLatestReleaseLink = 'https://github.com/graham-walker/youtube-dl-react-viewer/releases/latest';
window.scriptVersion = '1.3.0';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
