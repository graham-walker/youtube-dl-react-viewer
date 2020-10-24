import User from '../models/user.model.js';

export default async (req, res, next) => {
    const userId = req.userId;
    if (!userId) return res.sendStatus(401);
    
    let user;
    try {
        user = await User.findOne({ _id: userId }, 'isSuperuser');
    } catch (err) {
        res.sendStatus(500);
    }
    if (!user) return res.sendStatus(401);
    if (!user.isSuperuser) return res.sendStatus(403);

    next();
}
