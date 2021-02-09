import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
    accessKey: { type: String, required: true, unique: true, default: 'version' },
    lastVersionRun: { type: String, default: null },
});

export default mongoose.model('Version', versionSchema);
