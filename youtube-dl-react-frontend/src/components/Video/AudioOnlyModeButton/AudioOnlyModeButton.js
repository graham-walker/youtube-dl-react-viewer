import videojs from 'video.js';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faHeadphones } from '@fortawesome/free-solid-svg-icons';

const VjsButton = videojs.getComponent('Button');

class AudioOnlyModeButton extends VjsButton {
    constructor(player, options) {
        super(player, options);

        this.controlText('Audio Only Mode');

        this.el().classList.add('custom-player-audio-only-mode-button');
        this.el().innerHTML = icon(faHeadphones, { classes: ['custom-player-button-icon'] }).html[0];
    }

    handleClick() {
        if (this.options_.onClick) {
            this.options_.onClick();
        }
    }

    updateText(AudioOnly) {
        this.controlText(AudioOnly ? 'Disable Audio Only Mode' : 'Audio Only Mode');
    }
}

// Register the button component
videojs.registerComponent('AudioOnlyModeButton', AudioOnlyModeButton);

export default AudioOnlyModeButton;
