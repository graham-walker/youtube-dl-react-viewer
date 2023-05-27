const expected = {
    'MONGOOSE_URL': {
        type: String,
        default: 'mongodb://localhost:27017/youtubeDlDB',
    },
    'BACKEND_PORT': {
        type: Number,
        rangeMin: 0,
        rangeMax: 65535,
        default: 5000,
    },
    'GLOBAL_PASSWORD': {
        type: String,
        default: '',
    },
    'SECURE_COOKIES': {
        type: Boolean,
        default: false,
    },
    'YOUTUBE_DL_PATH': {
        type: String,
        default: 'yt-dlp',
    },
    'FFMPEG_PATH': {
        type: String,
        default: 'ffmpeg',
    },
    'FFPROBE_PATH': {
        type: String,
        default: 'ffprobe',
    },
    'THUMBNAIL_QUALITY': {
        type: Number,
        rangeMin: 1,
        rangeMax: 100,
        default: 80,
    },
    'THUMBNAIL_CHROMA_SUBSAMPLING': {
        type: String,
        allowed: ['4:2:0', '4:4:4'],
        default: '4:4:4',
    },
    'OUTPUT_DIRECTORY': {
        type: String,
        required: true,
    },
    'SUPERUSER_USERNAME': {
        type: String,
        default: 'admin',
    },
    'SUPERUSER_PASSWORD': {
        type: String,
        denied: ['password'],
        required: true,
    },
    'JWT_TOKEN_SECRET': {
        type: String,
        denied: ['secret'],
        required: true,
    },
    'PAGE_SIZE': {
        type: Number,
        rangeMin: 1,
        default: 50,
    },
    'SKIP_HASHING': {
        type: Boolean,
        default: false,
    },
    'VERBOSE': {
        type: Boolean,
        default: false,
    },
    'ENABLE_USER_REGISTRATION': {
        type: Boolean,
        default: true,
    },
    'DISPLAY_SIMILAR_VIDEOS': {
        type: String,
        allowed: ['complex', 'simple', 'disabled'],
        default: 'complex',
    },
    'NODE_ENV': {
        type: String,
        default: 'production',
    }
}

const parse = () => {
    let env = {};
    try {
        for (let key in expected) {
            if (!process.env.hasOwnProperty(key)) {
                if (expected[key].required) {
                    throw new Error(`Required environment variable "${key}" not specified.`);
                } else {
                    env[key] = expected[key].default;
                }
            } else {
                // Parse environment variable values
                switch (expected[key].type) {
                    case String:
                        if (expected[key].denied) {
                            for (let i = 0; i < expected[key].denied.length; i++) {
                                if (process.env[key] === expected[key].denied[i])
                                    throw new Error(`String environment variable "${key}" cannot be "${expected[key].denied[i]}".`)
                            }
                        }
                        if (expected[key].allowed && !expected[key].allowed.includes(process.env[key]))
                            throw new Error(`String environment variable "${key}" must be one of ${expected[key].allowed.map(a => `"${a}"`).join(', ')}.`);
                        env[key] = process.env[key];
                        break;
                    case Number:
                        if (isNaN(process.env[key])) {
                            throw new Error(`Non Number value "${process.env[key]}" provided for Number environment variable "${key}".`);
                        }

                        env[key] = parseInt(process.env[key]);

                        if (expected[key].rangeMin && env[key] < expected[key].rangeMin)
                            throw new Error(`Number environment variable "${key}" out of range (min: ${expected[key].rangeMin}).`);
                        if (expected[key].rangeMax && env[key] > expected[key].rangeMax)
                            throw new Error(`Number environment variable "${key}" out of range (max: ${expected[key].rangeMax}).`);
                        break;
                    case Boolean:
                        if (process.env[key].toLowerCase() === 'true') {
                            env[key] = true;
                        } else if (process.env[key].toLowerCase() === 'false') {
                            env[key] = false;
                        } else {
                            throw new Error(`Non Boolean value provided for Boolean environment variable "${key}".`);
                        }
                        break;
                }
            }
        }

        // Additional validation
        if (env.OUTPUT_DIRECTORY.endsWith('/')
            || env.OUTPUT_DIRECTORY.endsWith('\\')
        ) {
            env.OUTPUT_DIRECTORY = env.OUTPUT_DIRECTORY.slice(0, -1);
        }

        return { env };
    } catch (err) {
        return { err };
    }
}

export default parse();
