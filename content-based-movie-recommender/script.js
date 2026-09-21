(function initializeMovieRecommender(global, document) {
    "use strict";

    const PROFILE_MOVIE_COUNT = 3;
    const RECOMMENDATION_COUNT = 5;
    const titleCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    const state = {
        movies: Object.freeze([]),
        movieById: new Map(),
        ratingSummary: null,
        loading: false
    };

    function cosineSimilarity(leftVector, rightVector) {
        if (!Array.isArray(leftVector) || !Array.isArray(rightVector)) {
            throw new TypeError("Cosine similarity requires two numeric arrays.");
        }
        if (leftVector.length !== rightVector.length) {
            throw new RangeError("Cosine vectors must have the same length.");
        }

        let dotProduct = 0;
        let leftSquaredMagnitude = 0;
        let rightSquaredMagnitude = 0;

        for (let index = 0; index < leftVector.length; index += 1) {
            const leftValue = Number(leftVector[index]);
            const rightValue = Number(rightVector[index]);
            if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
                throw new TypeError("Cosine vectors may contain only finite numbers.");
            }

            dotProduct += leftValue * rightValue;
            leftSquaredMagnitude += leftValue * leftValue;
            rightSquaredMagnitude += rightValue * rightValue;
        }

        if (leftSquaredMagnitude === 0 || rightSquaredMagnitude === 0) {
            return 0;
        }

        return dotProduct / Math.sqrt(leftSquaredMagnitude * rightSquaredMagnitude);
    }

    function buildUserProfile(movies, watchedMovieIds) {
        if (!Array.isArray(watchedMovieIds) || watchedMovieIds.length < 2) {
            throw new Error("A user profile requires at least two watched movies.");
        }

        const normalizedIds = watchedMovieIds.map((movieId) => Number(movieId));
        if (normalizedIds.some((movieId) => !Number.isInteger(movieId))) {
            throw new Error("Every watched movie ID must be an integer.");
        }
        if (new Set(normalizedIds).size !== normalizedIds.length) {
            throw new Error("Watched movies must be distinct.");
        }

        const movieById = new Map(movies.map((movie) => [movie.id, movie]));
        const watchedMovies = normalizedIds.map((movieId) => {
            const movie = movieById.get(movieId);
            if (!movie) {
                throw new Error(`Movie ID ${movieId} was not found.`);
            }
            if (!Array.isArray(movie.genreVector) || movie.genreVector.length === 0) {
                throw new Error(`Movie ID ${movieId} has no genre vector.`);
            }
            return movie;
        });

        const vectorLength = watchedMovies[0].genreVector.length;
        const profileVector = Array(vectorLength).fill(0);
        watchedMovies.forEach((movie) => {
            if (movie.genreVector.length !== vectorLength) {
                throw new Error("Movie genre vectors must have the same length.");
            }
            movie.genreVector.forEach((value, index) => {
                if (!Number.isFinite(value)) {
                    throw new Error(`Movie ID ${movie.id} has an invalid genre vector.`);
                }
                profileVector[index] += value;
            });
        });

        for (let index = 0; index < profileVector.length; index += 1) {
            profileVector[index] /= watchedMovies.length;
        }

        return Object.freeze({
            vector: Object.freeze(profileVector),
            watchedMovieIds: Object.freeze(normalizedIds),
            watchedMovies: Object.freeze(watchedMovies)
        });
    }

    function ratingFor(summary, movieId) {
        if (!summary || typeof summary.get !== "function") {
            return null;
        }
        return summary.get(movieId);
    }

    function compareCandidates(left, right) {
        if (left.similarity !== right.similarity) {
            return right.similarity - left.similarity;
        }

        const leftQuality = left.rating ? left.rating.qualityScore : Number.NEGATIVE_INFINITY;
        const rightQuality = right.rating ? right.rating.qualityScore : Number.NEGATIVE_INFINITY;
        if (leftQuality !== rightQuality) {
            return rightQuality - leftQuality;
        }

        const leftCount = left.rating ? left.rating.count : 0;
        const rightCount = right.rating ? right.rating.count : 0;
        if (leftCount !== rightCount) {
            return rightCount - leftCount;
        }

        const titleOrder = titleCollator.compare(left.movie.title, right.movie.title);
        return titleOrder !== 0 ? titleOrder : left.movie.id - right.movie.id;
    }

    function addToTopCandidates(topCandidates, candidate, limit) {
        const insertionIndex = topCandidates.findIndex(
            (existingCandidate) => compareCandidates(candidate, existingCandidate) < 0
        );

        if (insertionIndex === -1) {
            if (topCandidates.length < limit) {
                topCandidates.push(candidate);
            }
            return;
        }

        topCandidates.splice(insertionIndex, 0, candidate);
        if (topCandidates.length > limit) {
            topCandidates.pop();
        }
    }

    function rankRecommendations(movies, ratingSummary, profile, requestedLimit) {
        if (!profile || !Array.isArray(profile.vector) || !Array.isArray(profile.watchedMovieIds)) {
            throw new Error("A valid user profile is required.");
        }

        const parsedLimit = Number(requestedLimit);
        const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
            ? Math.min(parsedLimit, 20)
            : RECOMMENDATION_COUNT;
        const topCandidates = [];
        const watchedMovieIds = new Set(profile.watchedMovieIds);

        movies.forEach((candidateMovie) => {
            if (watchedMovieIds.has(candidateMovie.id)) {
                return;
            }

            const similarity = cosineSimilarity(profile.vector, candidateMovie.genreVector);
            if (similarity <= 0) {
                return;
            }

            const candidate = {
                movie: candidateMovie,
                similarity,
                sharedGenres: Object.freeze(
                    candidateMovie.genres.filter((genre) => (
                        profile.watchedMovies.some((movie) => movie.genres.includes(genre))
                    ))
                ),
                rating: ratingFor(ratingSummary, candidateMovie.id)
            };
            addToTopCandidates(topCandidates, candidate, limit);
        });

        return Object.freeze(topCandidates);
    }

    function elements() {
        return {
            panel: document.getElementById("recommender-panel"),
            form: document.getElementById("recommender-form"),
            movieSelects: Array.from(document.querySelectorAll("[data-profile-movie]")),
            recommendButton: document.getElementById("recommend-button"),
            retryButton: document.getElementById("retry-button"),
            status: document.getElementById("result"),
            profileSummary: document.getElementById("profile-summary"),
            profileGenres: document.getElementById("profile-genres"),
            resultsHeading: document.getElementById("results-heading"),
            recommendationList: document.getElementById("recommendation-list")
        };
    }

    function setStatus(statusElement, message, kind) {
        statusElement.textContent = message;
        statusElement.className = `status status--${kind}`;
    }

    function clearRecommendations(ui) {
        ui.recommendationList.replaceChildren();
        ui.resultsHeading.hidden = true;
        ui.profileGenres.replaceChildren();
        ui.profileSummary.hidden = true;
    }

    function setControlsEnabled(ui, enabled) {
        ui.movieSelects.forEach((selectElement) => {
            selectElement.disabled = !enabled;
        });
        ui.recommendButton.disabled = !enabled;
    }

    function populateMovieSelects(selectElements, movies) {
        const sortedMovies = [...movies].sort((left, right) => {
            const titleOrder = titleCollator.compare(left.title, right.title);
            return titleOrder !== 0 ? titleOrder : left.id - right.id;
        });

        selectElements.forEach((selectElement, selectIndex) => {
            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = `Select watched movie ${selectIndex + 1}`;
            selectElement.replaceChildren(placeholder);

            const fragment = document.createDocumentFragment();
            sortedMovies.forEach((movie) => {
                const option = document.createElement("option");
                option.value = String(movie.id);
                option.textContent = movie.title;
                fragment.appendChild(option);
            });
            selectElement.appendChild(fragment);
        });
    }

    function synchronizeMovieOptions(selectElements) {
        const selectedValues = new Set(
            selectElements.map((selectElement) => selectElement.value).filter(Boolean)
        );

        selectElements.forEach((selectElement) => {
            Array.from(selectElement.options).forEach((option) => {
                option.disabled = (
                    option.value !== ""
                    && option.value !== selectElement.value
                    && selectedValues.has(option.value)
                );
            });
        });
    }

    function createRecommendationCard(recommendation, index) {
        const item = document.createElement("li");
        item.className = "recommendation-card";

        const rank = document.createElement("span");
        rank.className = "rank";
        rank.setAttribute("aria-label", `Rank ${index + 1}`);
        rank.textContent = String(index + 1);

        const details = document.createElement("div");
        const title = document.createElement("h3");
        title.className = "movie-title";
        title.textContent = recommendation.movie.title;

        const reason = document.createElement("p");
        reason.className = "movie-reason";
        reason.textContent = `Profile overlap: ${recommendation.sharedGenres.join(", ")}`;

        const rating = document.createElement("p");
        rating.className = "movie-rating";
        if (recommendation.rating) {
            const ratingWord = recommendation.rating.count === 1 ? "rating" : "ratings";
            rating.textContent = `${recommendation.rating.average.toFixed(1)}/5 from ${recommendation.rating.count} ${ratingWord}`;
        } else {
            rating.textContent = "Rating data unavailable";
        }

        const score = document.createElement("span");
        score.className = "score";
        score.textContent = `${Math.round(recommendation.similarity * 100)}% match`;

        details.append(title, reason, rating);
        item.append(rank, details, score);
        return item;
    }

    function renderProfile(ui, profile) {
        const genreWeights = profile.vector
            .map((weight, index) => ({
                name: global.MovieData.GENRE_NAMES[index],
                weight
            }))
            .filter(({ weight }) => weight > 0)
            .sort((left, right) => (
                right.weight - left.weight || titleCollator.compare(left.name, right.name)
            ));

        const fragment = document.createDocumentFragment();
        genreWeights.forEach(({ name, weight }) => {
            const item = document.createElement("li");
            item.className = "profile-genre";
            item.textContent = `${name} ${Math.round(weight * 100)}%`;
            fragment.appendChild(item);
        });
        ui.profileGenres.appendChild(fragment);
        ui.profileSummary.hidden = false;
    }

    function renderRecommendations(ui, profile, recommendations) {
        clearRecommendations(ui);
        renderProfile(ui, profile);

        if (recommendations.length === 0) {
            setStatus(
                ui.status,
                "No unseen movies overlap with this profile. Try a different combination.",
                "warning"
            );
            return;
        }

        const fragment = document.createDocumentFragment();
        recommendations.forEach((recommendation, index) => {
            fragment.appendChild(createRecommendationCard(recommendation, index));
        });

        ui.recommendationList.appendChild(fragment);
        ui.resultsHeading.hidden = false;
        const movieWord = recommendations.length === 1 ? "movie" : "movies";
        setStatus(
            ui.status,
            `Built a profile from ${profile.watchedMovies.length} watched movies and found ${recommendations.length} similar ${movieWord}.`,
            "success"
        );
    }

    function recommend(event) {
        event.preventDefault();
        const ui = elements();
        const selectedMovieIds = ui.movieSelects.map((selectElement) => Number(selectElement.value));

        const invalidIndex = selectedMovieIds.findIndex((movieId) => (
            !Number.isInteger(movieId) || !state.movieById.has(movieId)
        ));
        if (invalidIndex !== -1) {
            clearRecommendations(ui);
            setStatus(ui.status, "Select three watched movies before requesting recommendations.", "error");
            ui.movieSelects[invalidIndex].focus();
            return;
        }

        if (new Set(selectedMovieIds).size !== PROFILE_MOVIE_COUNT) {
            clearRecommendations(ui);
            setStatus(ui.status, "Choose three different watched movies.", "error");
            ui.movieSelects[0].focus();
            return;
        }

        ui.recommendButton.disabled = true;
        try {
            const profile = buildUserProfile(state.movies, selectedMovieIds);
            const recommendations = rankRecommendations(
                state.movies,
                state.ratingSummary,
                profile,
                RECOMMENDATION_COUNT
            );
            renderRecommendations(ui, profile, recommendations);
        } catch (error) {
            clearRecommendations(ui);
            setStatus(ui.status, `Recommendations could not be calculated: ${error.message}`, "error");
        } finally {
            ui.recommendButton.disabled = false;
        }
    }

    async function initialize() {
        if (state.loading) {
            return;
        }

        const ui = elements();
        state.loading = true;
        ui.panel.setAttribute("aria-busy", "true");
        ui.retryButton.hidden = true;
        clearRecommendations(ui);
        setControlsEnabled(ui, false);
        setStatus(ui.status, "Loading movie data…", "loading");

        try {
            if (!global.MovieData) {
                throw new Error("The data module did not load.");
            }

            const dataset = await global.MovieData.loadData();
            state.movies = dataset.movies;
            state.movieById = new Map(dataset.movies.map((movie) => [movie.id, movie]));
            state.ratingSummary = dataset.ratingSummary;

            populateMovieSelects(ui.movieSelects, dataset.movies);
            synchronizeMovieOptions(ui.movieSelects);
            setControlsEnabled(ui, true);

            if (dataset.warnings.length > 0) {
                setStatus(
                    ui.status,
                    `Loaded ${dataset.movies.length.toLocaleString()} movies. ${dataset.warnings.join(" ")}`,
                    "warning"
                );
            } else {
                setStatus(
                    ui.status,
                    `Loaded ${dataset.movies.length.toLocaleString()} movies and ${dataset.ratingSummary.totalRatings.toLocaleString()} ratings. Choose three watched movies to begin.`,
                    "success"
                );
            }
        } catch (error) {
            setStatus(
                ui.status,
                `Movie data could not be loaded: ${error.message} Run this app through a local web server and try again.`,
                "error"
            );
            ui.retryButton.hidden = false;
        } finally {
            state.loading = false;
            ui.panel.setAttribute("aria-busy", "false");
        }
    }

    global.MovieRecommenderCore = Object.freeze({
        buildUserProfile,
        cosineSimilarity,
        rankRecommendations
    });

    document.addEventListener("DOMContentLoaded", () => {
        const ui = elements();
        ui.form.addEventListener("submit", recommend);
        ui.retryButton.addEventListener("click", initialize);
        ui.movieSelects.forEach((selectElement) => {
            selectElement.addEventListener("change", () => synchronizeMovieOptions(ui.movieSelects));
        });
        initialize();
    });
}(window, document));
