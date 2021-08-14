import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
    eventType: { type: String, required: true },
    stopTime: { type: Number, default: null },
    userDocument: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    videoDocument: { type: mongoose.Schema.ObjectId, ref: 'Video', default: null },
}, {
    timestamps: true,
});

export default mongoose.model('Activity', activitySchema);
