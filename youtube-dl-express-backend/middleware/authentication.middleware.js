import jwt from 'jsonwebtoken';
import { parsedEnv } from '../parse-env.js';
import validateAPIKey from '../utilities/api.utility.js';

export default async (req, res, next) => {
    // Validate with API
    const userId = await validateAPIKey(req);
    if (userId) {
        req.userId = userId;
        return next();
    }

    // Validate with login
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
