import videojs from 'video.js';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faTv } from '@fortawesome/free-solid-svg-icons';

const VjsButton = videojs.getComponent('Button');

class TheaterModeButton extends VjsButton {
    constructor(player, options) {
        super(player, options);

        this.controlText('Theater Mode');

        this.el().classList.add('custom-player-theater-mode-button');
        this.el().innerHTML = icon(faTv, { classes: ['custom-player-button-icon'] }).html[0];
    }

    handleClick() {
        if (this.options_.onClick) {
            this.options_.onClick();
        }
    }

    updateText(theaterMode) {
        this.controlText(theaterMode ? 'Exit Theater Mode' : 'Theater Mode');
    }
}

// Register the button component
videojs.registerComponent('TheaterModeButton', TheaterModeButton);

export default TheaterModeButton;
