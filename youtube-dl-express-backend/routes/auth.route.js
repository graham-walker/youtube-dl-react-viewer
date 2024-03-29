import express from 'express';
import jwt from 'jsonwebtoken';

import { parsedEnv } from '../parse-env.js';
import { logError } from '../utilities/logger.utility.js';

import { settingsFields } from './user.route.js';

import User from '../models/user.model.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    if (!parsedEnv.ENABLE_USER_REGISTRATION) return res.status(500).json({ error: 'Registration is disabled' });
    const { username, password } = req.body;
    const user = new User({ username, password });
    try {
        await user.save();
    } catch (err) {
        logError(err);
        if (err.code === 11000 && err.keyPattern.username === 1) {
            return res.status(500).json({ error: 'Username is taken' });
        } else {
            return res.sendStatus(500);
        }
    }
    res.sendStatus(200);
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    let user;
    try {
        user = await User.findOne({ username }, 'username password isSuperuser ' + settingsFields);
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!user) return res.status(401).json({ noRedirect: true, error: 'Incorrect username or password' });

    let same;
    try {
        same = await user.isCorrectPassword(password);
    } catch (err) {
        return res.sendStatus(500);
    }
    if (!same) return res.status(401).json({ noRedirect: true, error: 'Incorrect username or password' });

    const token = jwt.sign({ userId: user._id, globalPassword: parsedEnv.GLOBAL_PASSWORD }, parsedEnv.JWT_TOKEN_SECRET, {
        expiresIn: '30d'
    });

    user = user.toJSON();
    delete user._id;
    delete user.password;

    res
        .cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: parsedEnv.SECURE_COOKIES,
            maxAge: 2 * 365 * 24 * 60 * 60 * 1000,
        })
        .json({ user });
});

router.post('/global', async (req, res) => {
    const { password } = req.body;

    if (password !== parsedEnv.GLOBAL_PASSWORD) return res.status(401).json({ noRedirect: true, error: 'Incorrect password' });

    const token = jwt.sign({ globalPassword: password }, parsedEnv.JWT_TOKEN_SECRET, {
        expiresIn: '30d'
    });

    res
        .cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: parsedEnv.SECURE_COOKIES,
            maxAge: 2 * 365 * 24 * 60 * 60 * 1000,
        })
        .send();
});

router.post('/logout', async (req, res) => {
    res.clearCookie('token').json({ hasGlobalPassword: !!parsedEnv.GLOBAL_PASSWORD });
});

export default router;
