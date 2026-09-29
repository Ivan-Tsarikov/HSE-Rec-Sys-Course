"use strict";

// MovieLens 100K has movies as matrix rows and users as columns. A missing
// user/movie pair remains absent; it is never parsed as a zero rating.
let movies = [];
let ratings = [];
let userIds = [];
let numUsers = 0;
let numMovies = 0;

function parseItemData(text) {
    const parsed = [];
    const seen = new Set();
    for (const [lineNumber, raw] of text.split('\n').entries()) {
        const line = raw.replace(/\r$/, '');
        if (!line.trim()) continue;
        const fields = line.split('|');
        if (fields.length !== 24) {
            throw new Error(`u.item line ${lineNumber + 1}: expected 24 fields, found ${fields.length}`);
        }
        const id = Number(fields[0]);
        if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id) || !fields[1].trim()) {
            throw new Error(`u.item line ${lineNumber + 1}: invalid or duplicate movie`);
        }
        seen.add(id);
        const match = fields[1].match(/^(.+)\s+\((\d{4})\)$/);
        parsed.push({
            id,
            title: match ? match[1].trim() : fields[1].trim(),
            year: match ? Number(match[2]) : null
        });
    }
    if (!parsed.length) throw new Error('u.item contains no movies');
    return parsed;
}

function parseRatingData(text) {
    const parsed = [];
    const seen = new Set();
    for (const [lineNumber, raw] of text.split('\n').entries()) {
        const line = raw.replace(/\r$/, '');
        if (!line.trim()) continue;
        const fields = line.split('\t');
        if (fields.length !== 4) {
            throw new Error(`u.data line ${lineNumber + 1}: expected four fields`);
        }
        const [userId, movieId, rating, timestamp] = fields.map(Number);
        const pair = `${userId}:${movieId}`;
        if (!Number.isSafeInteger(userId) || userId <= 0 ||
            !Number.isSafeInteger(movieId) || movieId <= 0 ||
            !Number.isInteger(rating) || rating < 1 || rating > 5 ||
            !Number.isSafeInteger(timestamp) || timestamp <= 0 || seen.has(pair)) {
            throw new Error(`u.data line ${lineNumber + 1}: invalid or duplicate rating`);
        }
        seen.add(pair);
        parsed.push({ userId, movieId, rating, timestamp });
    }
    if (!parsed.length) throw new Error('u.data contains no ratings');
    return parsed;
}

async function fetchUtf8(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
}

async function loadData() {
    // Parse into local variables first. A failed second request cannot leave a
    // half-loaded global data set behind.
    const [itemText, ratingText] = await Promise.all([fetchUtf8('u.item'), fetchUtf8('u.data')]);
    const parsedMovies = parseItemData(itemText);
    const parsedRatings = parseRatingData(ratingText);
    const movieIdSet = new Set(parsedMovies.map(movie => movie.id));
    for (const row of parsedRatings) {
        if (!movieIdSet.has(row.movieId)) {
            throw new Error(`u.data references unknown movie ${row.movieId}`);
        }
    }
    const parsedUsers = [...new Set(parsedRatings.map(row => row.userId))].sort((a, b) => a - b);
    movies = parsedMovies;
    ratings = parsedRatings;
    userIds = parsedUsers;
    numUsers = parsedUsers.length;
    numMovies = parsedMovies.length;
    return { movies, ratings, userIds, numUsers, numMovies };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseItemData, parseRatingData, loadData };
}
