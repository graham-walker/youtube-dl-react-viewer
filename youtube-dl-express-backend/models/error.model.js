import mongoose from 'mongoose';

const errorSchema = new mongoose.Schema({
    videoPath: { type: String, required: true, unique: true },
    errorObject: { type: String, required: true },
    dateDownloaded: { type: String, required: true },
    errorOccurred: { type: String, required: true },
    youtubeDlVersion: { type: String, default: null },
    youtubeDlPath: { type: String, default: null },
    jobDocument: { type: mongoose.Schema.ObjectId, ref: 'Job', required: true },
    formatCode: { type: String, default: null },
    isAudioOnly: { type: Boolean, default: null },
    urls: { type: String, default: null },
    arguments: { type: String, default: null },
    overrideUploader: { type: String, default: null },
    imported: { type: Boolean, default: false },
    scriptVersion: { type: String, required: true },
}, {
    timestamps: true,
});

export default mongoose.model('Error', errorSchema);
