import mongoose from 'mongoose';

import statisticSchema from '../schemas/statistic.schema.js';

const uploaderSchema = new mongoose.Schema({
    extractor: { type: String, required: true },
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    playlistCreatedCount: { type: Number, default: 0 },
    statistics: { type: statisticSchema, default: () => ({}) },
}, {
    timestamps: true,
});

uploaderSchema.index({ extractor: 1, id: 1 }, { unique: true });

export default mongoose.model('Uploader', uploaderSchema);
