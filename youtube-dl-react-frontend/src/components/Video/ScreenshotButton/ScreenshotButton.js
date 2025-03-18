import videojs from 'video.js';
import { Tooltip } from 'bootstrap';

const VjsButton = videojs.getComponent('Button');

class ScreenshotButton extends VjsButton {
    constructor(player, options) {
        super(player, options);

        this.controlText('Screenshot');
        
        this.el().innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="camera" class="svg-inline--fa fa-camera" style="font-size: 1.25em;" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"></path></svg>';

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
