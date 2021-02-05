import queryString from 'query-string';

export const createSearchLink = (str) => {
    return `/videos?${queryString.stringify({ search: `"${str}"` })}`;
}
