import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    parentDocument: { type: mongoose.Schema.ObjectId, required: true },
    count: { type: Number, default: 1 },
}, {
    timestamps: false,
});

tagSchema.index({ name: 1, type: 1, parentDocument: 1 }, { unique: true });

export default mongoose.model('Tag', tagSchema);
