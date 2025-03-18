import videojs from 'video.js';

const VjsButton = videojs.getComponent('Button');

class TheaterModeButton extends VjsButton {
    constructor(player, options) {
        super(player, options);

        this.controlText('Theater Mode');

        this.el().classList.add('vjs-custom-theater-mode-button');
        this.el().innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="tv" class="svg-inline--fa fa-tv " style="font-size: 1.25em;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path fill="currentColor" d="M64 64V352H576V64H64zM0 64C0 28.7 28.7 0 64 0H576c35.3 0 64 28.7 64 64V352c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zM128 448H512c17.7 0 32 14.3 32 32s-14.3 32-32 32H128c-17.7 0-32-14.3-32-32s14.3-32 32-32z"></path></svg>';
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
