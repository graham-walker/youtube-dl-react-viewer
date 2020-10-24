import express from 'express';
import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const user = new User({ username, password });
    try {
        await user.save();
    } catch (err) {
        return res.sendStatus(500);
    }
    res.sendStatus(200);
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    let user;
    try {
        user = await User.findOne(
            { username },
            'username password isSuperuser resumeVideos enableSponsorblock enableAutoplay reportBytesUsingIec useCircularAvatars'
        );
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

    const token = jwt.sign({ userId: user._id, globalPassword: process.env.GLOBAL_PASSWORD }, process.env.JWT_TOKEN_SECRET, {
        expiresIn: '30d'
    });

    user = user.toJSON();
    delete user._id;
    delete user.password;

    res
        .cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.SECURE_COOKIES.toLowerCase() === 'true',
        })
        .json({ user });
});

router.post('/global', async (req, res) => {
    const { password } = req.body;

    if (password !== process.env.GLOBAL_PASSWORD) return res.status(401).json({ noRedirect: true, error: 'Incorrect password' });

    const token = jwt.sign({ globalPassword: password }, process.env.JWT_TOKEN_SECRET, {
        expiresIn: '30d'
    });

    res
        .cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.SECURE_COOKIES.toLowerCase() === 'true',
        })
        .send();
});

router.post('/logout', async (req, res) => {
    res.clearCookie('token').json({ hasGlobalPassword: !!process.env.GLOBAL_PASSWORD });
});

export default router;
