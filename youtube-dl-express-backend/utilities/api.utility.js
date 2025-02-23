import ApiKey from '../models/apikey.model.js';

export default async function validateAPIKey(req) {
    const key = req.cookies.key || req.headers['x-api-key'];

    let apiKey;
    try {
        apiKey = await ApiKey.findOne({
            key,
            enabled: true,
        }, 'userDocument pattern').lean().exec();
        if (!apiKey) throw new Error('Invalid API key');
    } catch (err) {
        return null;
    }

    if (new RegExp(apiKey.pattern).test(req.baseUrl + req.path)) return apiKey.userDocument.toString();
    return null;
}
