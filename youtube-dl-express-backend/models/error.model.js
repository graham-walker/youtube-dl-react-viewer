import mongoose from 'mongoose';

const errorSchema = new mongoose.Schema({
    videoPath: { type: String, required: true, unique: true },
    errorObject: { type: String, required: true },
    dateDownloaded: { type: String, required: true },
    errorOccurred: { type: String, required: true },
    youtubeDlVersion: { type: String, required: true },
    jobDocument: { type: mongoose.Schema.ObjectId, ref: 'Job', required: true },
    formatCode: { type: String, required: true },
    isAudioOnly: { type: Boolean, required: true },
    urls: { type: String, required: true },
    arguments: { type: String, required: true },
    overrideUploader: { type: String, default: null },
    scriptVersion: { type: String, required: true },
}, {
    timestamps: true,
});

export default mongoose.model('Error', errorSchema);
