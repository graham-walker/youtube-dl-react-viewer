import parsedEnv from "../parse-env";

/**
 * Converts a date object into a string that represents the time since the date in the largest possible unit.
 * @param  {Date}   date Date object
 * @return {String}      Time since the date
 */
export const dateToTimeSinceString = (date) => {
    var seconds = Math.floor((new Date() - date) / 1000);
    var units = ['century', 'decade', 'year', 'month', 'day', 'hour', 'minute', 'second'];
    var intervals = [3154000000, 315400000, 31540000, 2592000, 86400, 3600, 60, 1];
    for (let i in units) {
        var time = Math.floor(seconds / intervals[i]);
        if (time >= 1) return `${time} ${units[i]}${time === 1 ? '' : 's'} ago`;
    }
    return 'just now';
}

/**
 * Converts a numerical amount of bytes into a easily readable string.
 * @param  {Number}  bytes Amount of bytes
 * @param  {Boolean} iec    
 * @return {String}        Readable bytes string
 */
export const bytesToSizeString = (bytes, iec) => {
    var thresh = iec ? 1024 : 1000;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = iec
        ? ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
        : ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

/**
 * Converts a video's duration from seconds into .............................
 * @param  {Object} video Video object
 * @return {String}       Duration string
 */
export const videoDurationToOverlay = (duration) => {
    var hours = Math.floor(duration / 3600);
    var minutes = Math.floor(duration % 3600 / 60);
    var seconds = Math.floor(duration % 3600 % 60);
    var string = '';
    if (hours > 0) string += hours + ':';
    if (minutes < 10 && hours > 0) string += '0';
    string += minutes + ':';
    if (seconds < 10) string += '0';
    string += seconds;
    return string;
}

/**
 * Converts an amount of seconds into a string that represents the time units...........................................
 * @param  {Number} seconds Amount of seconds
 * @return {String}         Text
 */
export const secondsToDetailedString = (seconds, round = false) => {
    var units = ['Century', 'Decade', 'Year', 'Month', 'Day', 'Hour', 'Minute', 'Second'];
    var intervals = [3154000000, 315400000, 31540000, 2592000, 86400, 3600, 60, 1];
    var string = '';
    for (let i in units) {
        var time = Math.floor(seconds / intervals[i]);
        if (time >= 1) {
            if (round) {
                time = seconds / intervals[i];
                string = `${+time.toFixed(2)} ${units[i]}${time === 1 ? '' : 's'}`;
                break;
            } else {
                string += `${time} ${units[i]}${time === 1 ? '' : 's'}, `;
                seconds -= time * intervals[i];
            }
        }
    }
    if (string.endsWith(', ')) string = string.slice(0, -2);
    return string ? string : '0 Seconds';
}

export const abbreviateNumber = (value) => {
    let newValue = value;
    const suffixes = ['', 'K', 'M', 'B', 'T'];
    let suffixNum = 0;
    while (newValue >= 1000) {
        newValue /= 1000;
        suffixNum++;
    }
    newValue = +newValue.toFixed(1);
    if (newValue.toString().split('.')[0].length > 1) newValue = Math.floor(newValue);
    newValue += suffixes[suffixNum];
    return newValue;
}

export const resolutionToBadge = (width, height, ignoreSmall = true) => {
    try {
        let size = Math.min(width, height);
        if (size < 1080) {
            if (ignoreSmall) {
                return undefined;
            } else {
                return size + 'p';
            }
        } else if (size < 1440) {
            return 'HD';
        } else if (size < 2160) {
            return 'QHD';
        } else if (size < 4320) {
            return '4K';
        } else if (size === 4320) {
            return '8K';
        } else {
            return size + 'p';
        }
    } catch (err) {
        console.error(err);
        return '0p';
    }
}

export const getErrorMessage = (err, defaultMessage = 'Unknown error') => {
    if (err.response && err.response.data.hasOwnProperty('error')) {
        return err.response.data.error;
    } else {
        if (err.message) {
            return err.message;
        }
        return defaultMessage;
    }
}

export const getWarningColor = (job, prefix = '') => {
    if (!job.lastCompleted) return '';
    const depth = parsedEnv.REACT_APP_OUT_OF_DATE_COLOR_DAYS;
    const daysSince = depth - Math.min(Math.round(Math.abs((new Date(job.lastCompleted) - new Date()) / 145440000)), depth);
    const percent = daysSince / depth;
    if (percent === 0) return prefix + 'text-danger';
    if (percent <= 0.5) return prefix + 'text-warning';
    return prefix + 'text-success';
}
