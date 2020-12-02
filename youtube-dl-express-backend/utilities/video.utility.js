import Video from '../models/video.model.js';

export const sortBy = (option, hasSearch = false) => {
    switch (option) {
        case 'relevance':
            if (hasSearch) {
                return { score: { $meta: 'textScore' } };
            } else {
                return { uploadDate: -1 };
            }
        case 'newest_date':
            return { uploadDate: -1 };
        case 'oldest_date':
            return { uploadDate: 1 };
        case 'longest_duration':
            return { duration: -1 };
        case 'shortest_duration':
            return { duration: 1 };
        case 'largest_size':
            return { 'videoFile.filesize': -1 };
        case 'smallest_size':
            return { 'videoFile.filesize': 1 };
        case 'most_views':
            return { viewCount: -1 };
        case 'least_views':
            return { viewCount: 1 };
        case 'most_likes':
            return { likeCount: -1 };
        case 'least_likes':
            return { likeCount: 1 };
        case 'most_dislikes':
            return { dislikeCount: -1 };
        case 'least_dislikes':
            return { dislikeCount: 1 };
        default:
            return { uploadDate: -1 };
    }
}

export const getTotals = async (pattern) => {
    let totals = (await Video.aggregate([
        { $match: pattern },
        {
            $group: {
                _id: null,
                duration: {
                    $sum: "$duration"
                },
                filesize: {
                    $sum: "$videoFile.filesize"
                },
                count: { $sum: 1 }
            }
        }]))[0];
    if (!totals) totals = {
        duration: 0,
        filesize: 0,
        count: 0,
    }
    return totals;
}

export const getRandomVideo = async (count, pattern, options = {}) => {
    return (await Video.findOne(pattern, options)
        .select('extractor id')
        .skip(Math.random() * count)
    )?.toJSON();
}

const weightedFields = {
    extractor: { weight: 3, type: 'exact' },
    title: { weight: 5, type: 'includes' },
    altTitle: { weight: 5, type: 'includes' },
    description: { weight: 5, type: 'includes' },
    uploader: { weight: 5, type: 'exact' },
    creator: { weight: 5, type: 'exact' },
    channel: { weight: 5, type: 'exact' },
    location: { weight: 5, type: 'exact' },
    categories: { weight: 5, type: 'dot' },
    tags: { weight: 5, type: 'dot' },
    'chapters.title': { weight: 5, type: 'includes' },
    chapter: { weight: 5, type: 'includes' },
    series: { weight: 5, type: 'exact' },
    season: { weight: 5, type: 'exact' },
    episode: { weight: 5, type: 'exact' },
    track: { weight: 5, type: 'exact' },
    artist: { weight: 5, type: 'exact' },
    genre: { weight: 5, type: 'exact' },
    album: { weight: 5, type: 'exact' },
    albumType: { weight: 5, type: 'exact' },
    albumArtist: { weight: 5, type: 'exact' },
    playlist: { weight: 5, type: 'includes' },
    playlistTitle: { weight: 5, type: 'includes' },
    hashtags: { weight: 5, type: 'dot' },
}

export const fields = Object.keys(weightedFields).join(' ');

export const getSimilarVideos = async (video) => {
    let $group = { _id: null };
    let $project = {};
    for (let field in weightedFields) {
        if (weightedFields[field].type === 'dot') {
            $group[field] = { $push: '$' + field };
            $project[field] = {
                $reduce: {
                    input: '$' + field,
                    initialValue: [],
                    in: { $setUnion: ['$$value', '$$this'] }
                }
            };
        }
    }

    let aggregatedFields = (await Video.aggregate([{ $group }, { $project }]))[0];
    delete aggregatedFields._id;

    let keywords = [];
    for (let field in weightedFields) {
        if (weightedFields[field].type === 'exact') {
            if (video[field] != undefined) keywords.push(video[field]);
        } else if (weightedFields[field].type === 'dot') {
            keywords.push(...video[field]);
        }
    }
    keywords = keywords.map(keyword => keyword.toLowerCase());

    let videos = await Video
        .find(
            {},
            'id extractor duration directory smallResizedThumbnailFile uploadDate videoFile width height viewCount '
            + fields
        )
        .sort({ uploadDate: -1 })
        .lean()
        .exec();
    for (let i = 0; i < videos.length; i++) videos[i].score = 0;

    for (let field in weightedFields) {
        switch (weightedFields[field].type) {
            case 'dot':
                let vector = createVector(aggregatedFields[field], video[field]);
                let maxScore = vector.length > 0 ? vector.reduce((a, b) => a + b) : 0;
                if (maxScore > 0) {
                    for (let i = 0; i < videos.length; i++) {
                        let score = dot(vector, createVector(aggregatedFields[field], videos[i][field]));
                        videos[i].score += (score / maxScore) * weightedFields[field].weight;
                    }
                }
                break;
            case 'exact':
                for (let i = 0; i < videos.length; i++) {
                    if (video[field] === videos[i][field]) {
                        videos[i].score += weightedFields[field].weight;
                    }
                }
                break;
            case 'includes':
                for (let i = 0; i < videos.length; i++) {
                    for (let j = 0; j < keywords.length; j++) {
                        let score = 0;
                        if (!!videos[i][field] && videos[i][field].toLowerCase().includes(keywords[j])) {
                            score++;
                        }
                        videos[i].score += score * weightedFields[field].weight;
                    }
                }
                break;
        }
    }

    videos = videos
        .filter(a => a.score !== 0 && a.extractor + a.id !== video.extractor + video.id)
        .sort((a, b) => b.score - a.score);
    videos.length = Math.min(videos.length, 50);
    if (videos.length === 0) videos = undefined;

    return videos;
}

export const limitVideoList = (videosList, video, limit = 100) => {
    try {
        let index = -1;
        videosList.find((videoInList, i) => {
            if (videoInList.id === video.id && videoInList.extractor === video.extractor) {
                index = i;
                return;
            }
        });
    
        let least = index - Math.floor(limit / 2);
        let len = videosList.length;
        if (least + limit > len) least = len - limit;
        least = (least < 0) ? 0 : least;
        console.log('Index:', index)
        console.log('Least:', least)
        return [videosList.slice(least, least + limit), least];
    } catch (err) {
        console.error(err)
    }
};

const createVector = (allTags, tags) => {
    let vector = [];
    for (let i = 0; i < allTags.length; i++) vector.push(+tags.includes(allTags[i]));
    return vector;
}

const dot = (vector1, vector2) => {
    return vector1.reduce((sum, element, index) => sum += element * vector2[index], 0);
}
