import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const saltRounds = 10;

const playerSettingsSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    defaultPlaybackRate: { type: Number, default: 1 },
    autoplayVideo: { type: Boolean, default: true },
    keepPlayerControlsVisible: {
        type: String,
        enum: ['never', 'windowed', 'fullscreen', 'always'],
        default: 'never',
    },
    playerControlsPosition: {
        type: String,
        enum: ['on_video', 'under_video'],
        default: 'on_video',
    },
    playerControlsScale: { type: Number, default: 1 },
    defaultVolume: { type: Number, default: 1 },
    volumeControlPosition: {
        type: String,
        enum: ['vertical', 'inline'],
        default: 'vertical',
    },
    largePlayButtonEnabled: { type: Boolean, default: true },
    seekButtonsEnabled: { type: Boolean, default: true },
    forwardSeekButtonSeconds: { type: Number, default: 10 },
    backSeekButtonSeconds: { type: Number, default: 10 },
});

const userSchema = new mongoose.Schema({
    isSuperuser: { type: Boolean, default: false },
    avatar: { type: String, default: null },
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 1,
        maxlength: 50,
    },
    password: { type: String, required: true, minlength: 8 },
    desktopPlayerSettings: {
        type: playerSettingsSchema,
        default: () => ({ enabled: true }), // Desktop player settings should always be enabled
    },
    tabletPlayerSettings: playerSettingsSchema,
    mobilePlayerSettings: playerSettingsSchema,
    hideShorts: { type: Boolean, default: false },
    useLargeLayout: { type: Boolean, default: true },
    fitThumbnails: { type: Boolean, default: true },
    useCircularAvatars: { type: Boolean, default: true },
    reportBytesUsingIec: { type: Boolean, default: true },
    recordWatchHistory: { type: Boolean, default: true },
    resumeVideos: { type: Boolean, default: true },
    enableSponsorblock: { type: Boolean, default: true },
    onlySkipLocked: { type: Boolean, default: false },
    skipSponsor: { type: Boolean, default: true },
    skipSelfpromo: { type: Boolean, default: true },
    skipInteraction: { type: Boolean, default: true },
    skipIntro: { type: Boolean, default: true },
    skipOutro: { type: Boolean, default: true },
    skipPreview: { type: Boolean, default: true },
    skipFiller: { type: Boolean, default: false },
    skipMusicOfftopic: { type: Boolean, default: true },
    enableReturnYouTubeDislike: { type: Boolean, default: false },
}, {
    timestamps: true,
});

userSchema.pre('save', async function (next) {
    if (this.isNew || this.isModified('password')) {
        try {
            this.password = await bcrypt.hash(this.password, saltRounds);
        } catch (err) {
            return next(err);
        }
    }
    next();
});

userSchema.methods.isCorrectPassword = function (password) {
    return bcrypt.compare(password, this.password);
}

export default mongoose.model('User', userSchema);
