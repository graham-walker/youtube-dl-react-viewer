import videojs from 'video.js';
import { icon } from '@fortawesome/fontawesome-svg-core';
import { faCamera } from '@fortawesome/free-solid-svg-icons';
import { Tooltip } from 'bootstrap';

const VjsButton = videojs.getComponent('Button');

class ScreenshotButton extends VjsButton {
    constructor(player, options) {
        super(player, options);

        this.controlText('Screenshot');
        
        this.el().classList.add('custom-player-screenshot-button');
        this.el().innerHTML = icon(faCamera, { classes: ['custom-player-button-icon'] }).html[0];

        const tooltipInstance = new Tooltip(this.el(), { trigger: 'manual', title: 'Copied to clipboard!' });

        this.on('click', () => {
            captureScreenshot(player, options.behavior, tooltipInstance);
        });
    }
}

const captureScreenshot = (player, behavior, tooltipInstance) => {
    const video = player.el().querySelector('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageUrl = canvas.toDataURL('image/png');

    if (behavior === 'save') {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = `${window.location.pathname.split('/')[2]}${window.location.pathname.split('/')[3]}_${Math.round(player.currentTime())}s.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else if (behavior === 'copy') {
        canvas.toBlob(blob => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                tooltipInstance.show();
                setTimeout(() => {
                    tooltipInstance.hide();
                }, 1000);
            }).catch(err => {
                console.error(err);
            });
        }, 'image/png');
    }
};

videojs.registerComponent('ScreenshotButton', ScreenshotButton);

export default ScreenshotButton;
