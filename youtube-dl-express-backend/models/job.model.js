import mongoose from 'mongoose';

import statisticSchema from '../schemas/statistic.schema.js';

const jobSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    formatCode: { type: String, required: true },
    isAudioOnly: { type: Boolean, default: false },
    urls: { type: String, default: null },
    arguments: { type: String, required: true },
    overrideUploader: { type: String, default: null },
    lastCompleted: { type: Date, default: null },
    statistics: { type: statisticSchema, default: () => ({}) },
    downloadComments: { type: Boolean, default: false },
}, {
    timestamps: true,
});

export default mongoose.model('Job', jobSchema);
