(function initializeMovieData(global) {
    "use strict";

    const GENRE_NAMES = Object.freeze([
        "Unknown",
        "Action",
        "Adventure",
        "Animation",
        "Children's",
        "Comedy",
        "Crime",
        "Documentary",
        "Drama",
        "Fantasy",
        "Film-Noir",
        "Horror",
        "Musical",
        "Mystery",
        "Romance",
        "Sci-Fi",
        "Thriller",
        "War",
        "Western"
    ]);

    const ITEM_FIELD_COUNT = 24;
    const RATING_FIELD_COUNT = 4;
    const RATING_PRIOR_WEIGHT = 50;

    class DataValidationError extends Error {
        constructor(message) {
            super(message);
            this.name = "DataValidationError";
        }
    }

    function dataLines(text, datasetName) {
        if (typeof text !== "string") {
            throw new DataValidationError(`${datasetName} must be text.`);
        }

        return text
            .split(/\r?\n/)
            .map((line, index) => ({ line, lineNumber: index + 1 }))
            .filter(({ line }) => line.trim() !== "");
    }

    function parsePositiveInteger(value, label, lineNumber) {
        if (!/^\d+$/.test(value)) {
            throw new DataValidationError(`${label} on line ${lineNumber} is not an integer.`);
        }

        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed) || parsed <= 0) {
            throw new DataValidationError(`${label} on line ${lineNumber} must be a positive integer.`);
        }
        return parsed;
    }

    function parseReleaseYear(releaseDate) {
        const match = /(\d{4})$/.exec(releaseDate.trim());
        return match ? Number(match[1]) : null;
    }

    function parseItemData(text) {
        const rows = dataLines(text, "u.item");
        const seenIds = new Set();

        const movies = rows.map(({ line, lineNumber }) => {
            const fields = line.split("|");
            if (fields.length !== ITEM_FIELD_COUNT) {
                throw new DataValidationError(
                    `u.item line ${lineNumber} has ${fields.length} fields; expected ${ITEM_FIELD_COUNT}.`
                );
            }

            const id = parsePositiveInteger(fields[0], "Movie ID", lineNumber);
            if (seenIds.has(id)) {
                throw new DataValidationError(`Duplicate movie ID ${id} on line ${lineNumber}.`);
            }
            seenIds.add(id);

            const title = fields[1].trim();
            if (!title) {
                throw new DataValidationError(`Movie title on line ${lineNumber} is empty.`);
            }

            const genreFlags = fields.slice(5, 24).map((value, index) => {
                if (value !== "0" && value !== "1") {
                    throw new DataValidationError(
                        `Genre flag ${GENRE_NAMES[index]} on line ${lineNumber} must be 0 or 1.`
                    );
                }
                return Number(value);
            });

            if (!genreFlags.some(Boolean)) {
                throw new DataValidationError(`Movie ${id} on line ${lineNumber} has no genre flag.`);
            }

            const genres = Object.freeze(
                GENRE_NAMES.filter((_, index) => genreFlags[index] === 1)
            );

            return Object.freeze({
                id,
                title,
                releaseYear: parseReleaseYear(fields[2]),
                genres,
                genreVector: Object.freeze([...genreFlags])
            });
        });

        if (movies.length === 0) {
            throw new DataValidationError("u.item contains no movie records.");
        }

        return Object.freeze(movies);
    }

    function emptyRatingSummary() {
        return Object.freeze({
            totalRatings: 0,
            globalAverage: null,
            priorWeight: RATING_PRIOR_WEIGHT,
            get() {
                return null;
            }
        });
    }

    function parseRatingStats(text, validMovieIds) {
        const rows = dataLines(text, "u.data");
        const aggregates = new Map();
        let totalRatings = 0;
        let ratingSum = 0;

        rows.forEach(({ line, lineNumber }) => {
            const fields = line.split("\t");
            if (fields.length !== RATING_FIELD_COUNT) {
                throw new DataValidationError(
                    `u.data line ${lineNumber} has ${fields.length} fields; expected ${RATING_FIELD_COUNT}.`
                );
            }

            parsePositiveInteger(fields[0], "User ID", lineNumber);
            const itemId = parsePositiveInteger(fields[1], "Movie ID", lineNumber);
            const rating = parsePositiveInteger(fields[2], "Rating", lineNumber);
            const timestamp = parsePositiveInteger(fields[3], "Timestamp", lineNumber);

            if (rating < 1 || rating > 5) {
                throw new DataValidationError(`Rating on line ${lineNumber} must be between 1 and 5.`);
            }
            if (!Number.isSafeInteger(timestamp)) {
                throw new DataValidationError(`Timestamp on line ${lineNumber} is invalid.`);
            }
            if (validMovieIds && !validMovieIds.has(itemId)) {
                throw new DataValidationError(
                    `Rating on line ${lineNumber} references unknown movie ID ${itemId}.`
                );
            }

            const current = aggregates.get(itemId) || { count: 0, sum: 0 };
            current.count += 1;
            current.sum += rating;
            aggregates.set(itemId, current);
            totalRatings += 1;
            ratingSum += rating;
        });

        if (totalRatings === 0) {
            throw new DataValidationError("u.data contains no rating records.");
        }

        const globalAverage = ratingSum / totalRatings;
        const summaries = new Map();

        aggregates.forEach(({ count, sum }, itemId) => {
            const average = sum / count;
            const qualityScore = (
                (count / (count + RATING_PRIOR_WEIGHT)) * average
                + (RATING_PRIOR_WEIGHT / (count + RATING_PRIOR_WEIGHT)) * globalAverage
            );

            summaries.set(itemId, Object.freeze({ count, average, qualityScore }));
        });

        return Object.freeze({
            totalRatings,
            globalAverage,
            priorWeight: RATING_PRIOR_WEIGHT,
            get(movieId) {
                return summaries.get(Number(movieId)) || null;
            }
        });
    }

    function createDataset(itemText, ratingText) {
        const movies = parseItemData(itemText);
        const validMovieIds = new Set(movies.map((movie) => movie.id));
        const warnings = [];
        let ratingSummary = emptyRatingSummary();

        if (typeof ratingText === "string") {
            try {
                ratingSummary = parseRatingStats(ratingText, validMovieIds);
            } catch (error) {
                warnings.push(`Ratings were ignored: ${error.message}`);
            }
        } else {
            warnings.push("Ratings were unavailable. Genre recommendations still work.");
        }

        return Object.freeze({
            movies,
            ratingSummary,
            warnings: Object.freeze(warnings)
        });
    }

    async function fetchText(path, fetchImplementation) {
        const response = await fetchImplementation(path);
        if (!response || !response.ok) {
            const status = response && Number.isFinite(response.status) ? ` (${response.status})` : "";
            throw new Error(`Could not load ${path}${status}.`);
        }
        return response.text();
    }

    async function loadData(options) {
        const settings = options || {};
        const fetchImplementation = settings.fetchImplementation
            || (typeof global.fetch === "function" ? global.fetch.bind(global) : null);

        if (!fetchImplementation) {
            throw new Error("This browser does not provide the Fetch API.");
        }

        const results = await Promise.allSettled([
            fetchText("u.item", fetchImplementation),
            fetchText("u.data", fetchImplementation)
        ]);

        if (results[0].status === "rejected") {
            throw results[0].reason;
        }

        const ratingText = results[1].status === "fulfilled" ? results[1].value : null;
        const dataset = createDataset(results[0].value, ratingText);

        if (results[1].status === "rejected") {
            return Object.freeze({
                movies: dataset.movies,
                ratingSummary: dataset.ratingSummary,
                warnings: Object.freeze([`Ratings were unavailable: ${results[1].reason.message}`])
            });
        }

        return dataset;
    }

    global.MovieData = Object.freeze({
        GENRE_NAMES,
        DataValidationError,
        createDataset,
        emptyRatingSummary,
        loadData,
        parseItemData,
        parseRatingStats
    });
}(window));
