import jwt from 'jsonwebtoken';
import { parsedEnv } from '../parse-env.js';

export default async (req, res, next) => {
    if (
        req.path === '/api/auth/global'
        || req.path === '/api/auth/logout'
        || req.path === '/global'
        || req.path === '/logout'
        || parsedEnv.GLOBAL_PASSWORD === ''
    ) return next();

    const token = req.cookies.token;
    if (!token) return res.sendStatus(401);

    let decoded;
    try {
        decoded = await jwt.verify(token, parsedEnv.JWT_TOKEN_SECRET);
    } catch (err) {
        return res.sendStatus(401);
    }
    if (!decoded.hasOwnProperty('globalPassword')
        || decoded.globalPassword !== parsedEnv.GLOBAL_PASSWORD
    ) return res.sendStatus(401);

    next();
}
