import mongoose from 'mongoose';

import statisticSchema from '../schemas/statistic.schema.js';

const playlistSchema = new mongoose.Schema({
    extractor: { type: String, required: true },
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    statistics: { type: statisticSchema, default: () => ({}) },
    uploaderName: { type: String, default: null },
}, {
    timestamps: true,
});

playlistSchema.index({ extractor: 1, id: 1 }, { unique: true });
playlistSchema.index({ name: 1 });

export default mongoose.model('Playlist', playlistSchema);
