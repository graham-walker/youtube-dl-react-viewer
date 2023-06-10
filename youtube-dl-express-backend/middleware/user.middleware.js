import jwt from 'jsonwebtoken';
import { parsedEnv } from '../parse-env.js';

import User from '../models/user.model.js';

export default async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return next();

    let decoded;
    try {
        decoded = await jwt.verify(token, parsedEnv.JWT_TOKEN_SECRET);
    } catch (err) {
        return next();
    }
    if (!decoded.hasOwnProperty('userId')) return next();

    let user;
    try {
        user = await User.findOne({ _id: decoded.userId });
    } catch (err) {
        return next();
    }

    req.user = user;
    next();
}
