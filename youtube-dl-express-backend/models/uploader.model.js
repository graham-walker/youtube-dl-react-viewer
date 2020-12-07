import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.ObjectId;

const tagSchema = new mongoose.Schema({
    name: { type: String, required: true },
    count: { type: Number, default: 1 },
}, { _id: false });

const uploaderSchema = new mongoose.Schema({
    extractor: { type: String, required: true },
    name: { type: String, required: true, index: true },
    totalVideoCount: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    totalFilesize: { type: Number, default: 0 },
    totalOriginalFilesize: { type: Number, default: 0 },
    totalVideoFilesize: { type: Number, default: 0 },
    totalInfoFilesize: { type: Number, default: 0 },
    totalDescriptionFilesize: { type: Number, default: 0 },
    totalAnnotationsFilesize: { type: Number, default: 0 },
    totalThumbnailFilesize: { type: Number, default: 0 },
    totalResizedThumbnailFilesize: { type: Number, default: 0 },
    totalSubtitleFilesize: { type: Number, default: 0 },
    totalViewCount: { type: Number, default: 0 },
    recordViewCount: { type: Number, default: 0 },
    recordViewCountVideo: { type: ObjectId, ref: 'Video', default: null },
    totalLikeCount: { type: Number, default: 0 },
    recordLikeCount: { type: Number, default: 0 },
    recordLikeCountVideo: { type: ObjectId, ref: 'Video', default: null },
    totalDislikeCount: { type: Number, default: 0 },
    recordDislikeCount: { type: Number, default: 0 },
    recordDislikeCountVideo: { type: ObjectId, ref: 'Video', default: null },
    lastDateUploaded: { type: Date, default: null },
    tags: [tagSchema],
    categories: [tagSchema],
    hashtags: [tagSchema],
}, {
    timestamps: true,
});

uploaderSchema.index({ extractor: 1, name: 1 }, { unique: true });

export default mongoose.model('Uploader', uploaderSchema);
