import jwt from 'jsonwebtoken';
import { parsedEnv } from '../parse-env.js';

export default async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return res.sendStatus(401);
    
    let decoded;
    try {
        decoded = await jwt.verify(token, parsedEnv.JWT_TOKEN_SECRET);
    } catch (err) {
        return res.sendStatus(401);
    }
    if (!decoded.hasOwnProperty('userId')) return res.sendStatus(401);

    req.userId = decoded.userId;
    next();
}
