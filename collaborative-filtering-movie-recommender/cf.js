"use strict";

// One missing-value policy for both methods: compare only jointly observed
// ratings, require enough shared evidence, then shrink by overlap count.
// No unobserved matrix cell is filled during similarity calculation.
const CF_DEFAULTS = Object.freeze({
    minOverlap: 3, shrinkage: 10, neighbors: 20, biasSmoothing: 10,
    minContributors: 2, adjustmentShrinkage: 0.5
});

function clampRating(value) {
    return Math.max(1, Math.min(5, value));
}

function compareNeighbors(a, b) {
    return b.score - a.score || b.overlap - a.overlap || a.id - b.id;
}

function insertTopK(bucket, entry, limit) {
    let index = 0;
    while (index < bucket.length && compareNeighbors(bucket[index], entry) <= 0) index++;
    if (index >= limit) return;
    bucket.splice(index, 0, entry);
    if (bucket.length > limit) bucket.pop();
}

class CollaborativeFilteringModel {
    constructor(movieList, ratingList, options = {}) {
        this.config = { ...CF_DEFAULTS, ...options };
        for (const key of ['minOverlap', 'neighbors', 'biasSmoothing', 'minContributors']) {
            if (!Number.isInteger(this.config[key]) || this.config[key] < 1) {
                throw new Error(`${key} must be a positive integer`);
            }
        }
        if (!Number.isFinite(this.config.shrinkage) || this.config.shrinkage < 0) {
            throw new Error('shrinkage must be nonnegative');
        }
        if (!Number.isFinite(this.config.adjustmentShrinkage) ||
            this.config.adjustmentShrinkage < 0) {
            throw new Error('adjustmentShrinkage must be nonnegative');
        }
        this.movies = [...movieList].sort((a, b) => a.id - b.id);
        this.movieIndex = new Map(this.movies.map((movie, index) => [movie.id, index]));
        this.byUser = new Map();
        this.byMovie = new Map(this.movies.map(movie => [movie.id, new Map()]));
        this.userMeans = new Map();
        this.movieMeans = new Map();
        this.userCounts = new Map();
        this.movieCounts = new Map();
        this.itemPairs = null;
        this.userPredictionCache = null;

        const userSums = new Map();
        const movieSums = new Map();
        let total = 0;
        for (const { userId, movieId, rating } of ratingList) {
            if (!this.movieIndex.has(movieId) || !Number.isInteger(userId) || userId <= 0 ||
                !Number.isInteger(rating) || rating < 1 || rating > 5) {
                throw new Error('Invalid rating supplied to CF model');
            }
            if (!this.byUser.has(userId)) this.byUser.set(userId, new Map());
            if (this.byUser.get(userId).has(movieId)) throw new Error('Duplicate user/movie rating');
            this.byUser.get(userId).set(movieId, rating);
            this.byMovie.get(movieId).set(userId, rating);
            userSums.set(userId, (userSums.get(userId) || 0) + rating);
            movieSums.set(movieId, (movieSums.get(movieId) || 0) + rating);
            total += rating;
        }
        if (!ratingList.length) throw new Error('CF model requires training ratings');
        this.globalMean = total / ratingList.length;
        for (const [id, sum] of userSums) {
            const count = this.byUser.get(id).size;
            this.userCounts.set(id, count);
            this.userMeans.set(id, sum / count);
        }
        for (const [id, sum] of movieSums) {
            const count = this.byMovie.get(id).size;
            this.movieCounts.set(id, count);
            this.movieMeans.set(id, sum / count);
        }
    }

    baseline(userId, movieId) {
        const alpha = this.config.biasSmoothing;
        const userCount = this.userCounts.get(userId) || 0;
        const movieCount = this.movieCounts.get(movieId) || 0;
        const userBias = userCount ? userCount / (userCount + alpha) *
            (this.userMeans.get(userId) - this.globalMean) : 0;
        const movieBias = movieCount ? movieCount / (movieCount + alpha) *
            (this.movieMeans.get(movieId) - this.globalMean) : 0;
        return clampRating(this.globalMean + userBias + movieBias);
    }

    userSimilarity(firstId, secondId) {
        const first = this.byUser.get(firstId);
        const second = this.byUser.get(secondId);
        if (!first || !second || firstId === secondId) return { score: 0, overlap: 0 };
        const [smaller, larger] = first.size <= second.size ? [first, second] : [second, first];
        const meanFirst = this.userMeans.get(firstId);
        const meanSecond = this.userMeans.get(secondId);
        let overlap = 0, dot = 0, normFirst = 0, normSecond = 0;
        for (const movieId of smaller.keys()) {
            if (!larger.has(movieId)) continue;
            const a = first.get(movieId) - meanFirst;
            const b = second.get(movieId) - meanSecond;
            overlap++;
            dot += a * b;
            normFirst += a * a;
            normSecond += b * b;
        }
        return this._finishSimilarity(dot, normFirst, normSecond, overlap);
    }

    _finishSimilarity(dot, normFirst, normSecond, overlap) {
        if (overlap < this.config.minOverlap || normFirst === 0 || normSecond === 0) {
            return { score: 0, overlap };
        }
        const cosine = dot / Math.sqrt(normFirst * normSecond);
        const score = Math.max(-1, Math.min(1, cosine)) *
            overlap / (overlap + this.config.shrinkage);
        return { score, overlap };
    }

    // Unique pair (a < b) at a*(2*N-a-1)/2 + (b-a-1).
    _pairOffset(a, b) {
        const n = this.movies.length;
        return a * (2 * n - a - 1) / 2 + b - a - 1;
    }

    async prepareItemSimilarities(onProgress = () => {}) {
        if (this.itemPairs) return;
        const n = this.movies.length;
        const pairs = n * (n - 1) / 2;
        const stats = {
            dot: new Float64Array(pairs),
            normA: new Float64Array(pairs),
            normB: new Float64Array(pairs),
            count: new Uint16Array(pairs)
        };
        const histories = [...this.byUser.entries()];
        for (let userIndex = 0; userIndex < histories.length; userIndex++) {
            const [userId, history] = histories[userIndex];
            const mean = this.userMeans.get(userId);
            const rated = [...history].map(([movieId, rating]) => ({
                index: this.movieIndex.get(movieId), residual: rating - mean
            })).sort((a, b) => a.index - b.index);
            for (let a = 0; a < rated.length; a++) {
                const first = rated[a];
                const start = first.index * (2 * n - first.index - 1) / 2 - first.index - 1;
                for (let b = a + 1; b < rated.length; b++) {
                    const second = rated[b];
                    const offset = start + second.index;
                    stats.dot[offset] += first.residual * second.residual;
                    stats.normA[offset] += first.residual * first.residual;
                    stats.normB[offset] += second.residual * second.residual;
                    stats.count[offset]++;
                }
            }
            if (userIndex % 25 === 24) {
                onProgress(Math.round((userIndex + 1) / histories.length * 100));
                if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                    await new Promise(resolve => window.requestAnimationFrame(resolve));
                }
            }
        }
        this.itemPairs = stats;
        onProgress(100);
    }

    itemSimilarity(firstId, secondId) {
        if (!this.itemPairs) throw new Error('Item similarities have not been prepared');
        let a = this.movieIndex.get(firstId);
        let b = this.movieIndex.get(secondId);
        if (a === undefined || b === undefined || a === b) return { score: 0, overlap: 0 };
        if (a > b) [a, b] = [b, a];
        const offset = this._pairOffset(a, b);
        return this._finishSimilarity(this.itemPairs.dot[offset], this.itemPairs.normA[offset],
            this.itemPairs.normB[offset], this.itemPairs.count[offset]);
    }

    _userPredictions(userId) {
        if (this.userPredictionCache?.userId === userId) return this.userPredictionCache.predictions;
        const known = this.byUser.get(userId) || new Map();
        const buckets = new Map();
        for (const [neighborId, history] of this.byUser) {
            if (neighborId === userId) continue;
            const { score, overlap } = this.userSimilarity(userId, neighborId);
            if (score <= 0) continue;
            for (const [movieId, rating] of history) {
                if (known.has(movieId)) continue;
                if (!buckets.has(movieId)) buckets.set(movieId, []);
                insertTopK(buckets.get(movieId), { id: neighborId, rating, score, overlap },
                    this.config.neighbors);
            }
        }
        const predictions = new Map();
        for (const movie of this.movies) {
            if (known.has(movie.id)) continue;
            predictions.set(movie.id, this._combine(userId, movie.id, buckets.get(movie.id) || [],
                entry => entry.rating - this.baseline(entry.id, movie.id)));
        }
        this.userPredictionCache = { userId, predictions };
        return predictions;
    }

    _combine(userId, movieId, neighbors, residual) {
        const base = this.baseline(userId, movieId);
        if (neighbors.length < this.config.minContributors) {
            return { rating: base, support: neighbors.length, fallback: true, baseline: base };
        }
        let numerator = 0, denominator = 0;
        for (const neighbor of neighbors) {
            numerator += neighbor.score * residual(neighbor);
            denominator += Math.abs(neighbor.score);
        }
        if (!denominator) return { rating: base, support: 0, fallback: true, baseline: base };
        // Shrink the aggregate correction toward the baseline when total
        // positive similarity weight is weak, even if two neighbours exist.
        const adjustment = numerator / (denominator + this.config.adjustmentShrinkage);
        return { rating: clampRating(base + adjustment),
            support: neighbors.length, fallback: false, baseline: base };
    }

    predictUser(userId, movieId) {
        if (!this.movieIndex.has(movieId)) return this._combine(userId, movieId, [], () => 0);
        const known = this.byUser.get(userId);
        if (known?.has(movieId)) throw new Error('Target movie is already rated by this user');
        return this._userPredictions(userId).get(movieId);
    }

    predictItem(userId, movieId) {
        if (!this.movieIndex.has(movieId)) return this._combine(userId, movieId, [], () => 0);
        const history = this.byUser.get(userId) || new Map();
        if (history.has(movieId)) throw new Error('Target movie is already rated by this user');
        const neighbors = [];
        for (const [ratedMovieId, rating] of history) {
            const { score, overlap } = this.itemSimilarity(movieId, ratedMovieId);
            if (score <= 0) continue;
            insertTopK(neighbors, { id: ratedMovieId, rating, score, overlap }, this.config.neighbors);
        }
        return this._combine(userId, movieId, neighbors,
            entry => entry.rating - this.baseline(userId, entry.id));
    }

    recommendations(userId, method, limit = 5) {
        if (method !== 'user' && method !== 'item') throw new Error('Unknown CF method');
        const known = this.byUser.get(userId) || new Map();
        const userPredictions = method === 'user' ? this._userPredictions(userId) : null;
        const candidates = [];
        for (const movie of this.movies) {
            if (known.has(movie.id)) continue;
            const prediction = method === 'user' ? userPredictions.get(movie.id) :
                this.predictItem(userId, movie.id);
            candidates.push({ movie, ...prediction });
        }
        candidates.sort((a, b) => Number(a.fallback) - Number(b.fallback) ||
            b.rating - a.rating || b.support - a.support || a.movie.id - b.movie.id);
        return candidates.slice(0, limit);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CollaborativeFilteringModel, CF_DEFAULTS };
}
