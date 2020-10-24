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
    reportBytesUsingIec: { type: Boolean, default: true },
    useCircularAvatars: { type: Boolean, default: true },
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
