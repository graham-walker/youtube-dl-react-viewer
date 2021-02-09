import mongoose from 'mongoose';

import statisticSchema from '../schemas/statistic.schema.js';

const globalStatisticSchema = new mongoose.Schema({
    accessKey: { type: String, required: true, unique: true, default: 'videos' },
    statistics: { type: statisticSchema, default: () => ({}) },
}, {
    timestamps: true,
});

export default mongoose.model('Statistic', globalStatisticSchema);
