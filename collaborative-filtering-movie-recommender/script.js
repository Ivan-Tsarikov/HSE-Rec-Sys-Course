"use strict";

let model = null;

function updateStatus(message, isError = false) {
    const element = document.getElementById('status');
    element.textContent = message;
    element.classList.toggle('error', isError);
}

function showMessage(message) {
    const element = document.getElementById('result');
    element.classList.remove('has-results');
    element.replaceChildren();
    element.textContent = message;
}

function movieLabel(movie) {
    return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function populateUserDropdown() {
    const select = document.getElementById('user-select');
    select.replaceChildren();
    for (const id of userIds) {
        const option = document.createElement('option');
        option.value = String(id);
        option.textContent = `User ${id}`;
        select.appendChild(option);
    }
}

function populateMovieDropdown() {
    const userId = Number(document.getElementById('user-select').value);
    const known = model?.byUser.get(userId) || new Map();
    const select = document.getElementById('movie-select');
    select.replaceChildren();
    for (const movie of movies) {
        if (known.has(movie.id)) continue;
        const option = document.createElement('option');
        option.value = String(movie.id);
        option.textContent = movieLabel(movie);
        select.appendChild(option);
    }
    showMessage('Select an unrated movie and compare the two methods.');
}

function appendPrediction(container, title, prediction, recommendations) {
    const section = document.createElement('section');
    section.className = 'prediction-method';
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.appendChild(heading);

    const rating = document.createElement('p');
    rating.className = 'predicted-rating';
    rating.textContent = `${prediction.rating.toFixed(2)} / 5`;
    section.appendChild(rating);

    const evidence = document.createElement('p');
    evidence.className = 'prediction-evidence';
    evidence.textContent = prediction.fallback ?
        `Baseline estimate: ${prediction.support} supporting neighbours; at least 2 required.` :
        `Based on ${prediction.support} supported neighbour${prediction.support === 1 ? '' : 's'}.`;
    section.appendChild(evidence);

    const listHeading = document.createElement('h4');
    listHeading.textContent = 'Top 5 unseen movies';
    section.appendChild(listHeading);
    const list = document.createElement('ol');
    for (const candidate of recommendations) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = movieLabel(candidate.movie);
        const score = document.createElement('span');
        score.className = 'recommendation-score';
        score.textContent = `${candidate.rating.toFixed(2)} / 5${candidate.fallback ? ' · baseline' : ''}`;
        item.append(name, score);
        list.appendChild(item);
    }
    section.appendChild(list);
    container.appendChild(section);
}

function renderResults(userId, movie, userPrediction, itemPrediction, userTop, itemTop) {
    const result = document.getElementById('result');
    result.replaceChildren();
    result.classList.add('has-results');
    const heading = document.createElement('h2');
    heading.className = 'result-heading';
    heading.textContent = `User ${userId} · ${movieLabel(movie)}`;
    result.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'prediction-grid';
    appendPrediction(grid, 'User-Based CF', userPrediction, userTop);
    appendPrediction(grid, 'Item-Based CF', itemPrediction, itemTop);
    result.appendChild(grid);
}

async function predictRating() {
    const button = document.getElementById('predict-btn');
    const userSelect = document.getElementById('user-select');
    const movieSelect = document.getElementById('movie-select');
    const userId = Number(userSelect.value);
    const movieId = Number(movieSelect.value);
    const movie = movies.find(entry => entry.id === movieId);
    if (!model || !model.itemPairs || !model.byUser.has(userId) || !movie ||
        model.byUser.get(userId).has(movieId)) {
        showMessage('Select a user and a movie that user has not rated.');
        return;
    }
    button.disabled = true;
    userSelect.disabled = true;
    movieSelect.disabled = true;
    updateStatus('Calculating both predictions and Top-5 lists...');
    try {
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        const userPrediction = model.predictUser(userId, movieId);
        const itemPrediction = model.predictItem(userId, movieId);
        const userTop = model.recommendations(userId, 'user');
        const itemTop = model.recommendations(userId, 'item');
        renderResults(userId, movie, userPrediction, itemPrediction, userTop, itemTop);
        updateStatus('Predictions ready. Unrated movies are ranked separately by each method.');
    } catch (error) {
        console.error('Prediction error:', error);
        showMessage(`Unable to calculate predictions: ${error.message}`);
        updateStatus('Prediction failed.', true);
    } finally {
        button.disabled = false;
        userSelect.disabled = false;
        movieSelect.disabled = false;
    }
}

window.onload = async function initialize() {
    const button = document.getElementById('predict-btn');
    button.disabled = true;
    try {
        updateStatus('Loading MovieLens data...');
        await loadData();
        model = new CollaborativeFilteringModel(movies, ratings);
        populateUserDropdown();
        populateMovieDropdown();
        updateStatus('Preparing item similarities from observed ratings...');
        await model.prepareItemSimilarities(percent => {
            if (percent < 100) updateStatus(`Preparing item similarities... ${percent}%`);
        });
        document.getElementById('user-select').addEventListener('change', populateMovieDropdown);
        document.getElementById('movie-select').addEventListener('change', () => {
            showMessage('Select Predict Rating to compare the methods.');
        });
        button.disabled = false;
        updateStatus(`Ready: ${numUsers} users, ${numMovies} movies, ${ratings.length.toLocaleString()} ratings.`);
    } catch (error) {
        console.error('Initialization error:', error);
        showMessage(`Unable to start recommender: ${error.message}`);
        updateStatus('Data loading or initialization failed.', true);
    }
};
