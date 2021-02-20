import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
    accessKey: { type: String, required: true, unique: true, default: 'version' },
    lastUpdateCompleted: { type: Number, default: null },
});

export default mongoose.model('Version', versionSchema);
