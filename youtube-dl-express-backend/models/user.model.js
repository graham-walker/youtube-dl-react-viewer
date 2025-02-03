import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const saltRounds = 10;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        minlength: 1,
        maxlength: 50
    },
    password: { type: String, required: true, minlength: 8 },
    isSuperuser: { type: Boolean, default: false },
    resumeVideos: { type: Boolean, default: true },
    enableSponsorblock: { type: Boolean, default: true },
    enableReturnYouTubeDislike: { type: Boolean, default: false },
    reportBytesUsingIec: { type: Boolean, default: true },
    useCircularAvatars: { type: Boolean, default: true },
    avatar: { type: String, default: null },
    recordWatchHistory: { type: Boolean, default: true },
    onlySkipLocked: { type: Boolean, default: false },
    skipSponsor: { type: Boolean, default: true },
    skipSelfpromo: { type: Boolean, default: true },
    skipInteraction: { type: Boolean, default: true },
    skipIntro: { type: Boolean, default: true },
    skipOutro: { type: Boolean, default: true },
    skipPreview: { type: Boolean, default: true },
    skipFiller: { type: Boolean, default: false },
    skipMusicOfftopic: { type: Boolean, default: true },
    useLargeLayout: { type: Boolean, default: true },
    fitThumbnails: { type: Boolean, default: true },
    hideShorts: { type: Boolean, default: false },
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
