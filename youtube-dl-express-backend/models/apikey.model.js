import mongoose from 'mongoose';
import crypto from 'crypto';

function generateApiKey() {
    return `ytdlrv-api-${new Date().getTime()}-${crypto.randomBytes(32).toString('hex')}`;
}

const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: generateApiKey },
    name: { type: String, required: true },
    userDocument: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    pattern: {
        type: String,
        required: true,
        default: '^.*$',
        validate: {
            validator: function (value) {
                try {
                    new RegExp(value);
                    return true;
                } catch (e) {
                    return false;
                }
            },
            message: props => `${props.value} is not a valid regular expression`
        },
    },
    enabled: { type: Boolean, default: true },
}, {
    timestamps: true,
});

export default mongoose.model('ApiKey', apiKeySchema);
