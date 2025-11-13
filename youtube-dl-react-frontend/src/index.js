import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import '../node_modules/videojs-hotkeys/videojs.hotkeys.min.js';
import '../node_modules/video.js/dist/video-js.min.css'
import App from './App';
import parsedEnv from './parse-env';

document.title = parsedEnv.REACT_APP_BRAND;
window.appVersion = '1.5.1';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
