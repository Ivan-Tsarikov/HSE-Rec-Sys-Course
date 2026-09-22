# Content-Based Movie Recommender

A dependency-free browser application that builds a taste profile from three watched MovieLens films and recommends five unseen titles by genre similarity. It is a corrected and extended version of the Week 2 starter from the HSE LLM4Rec course.

👉 **[LIVE DEMO](https://ivan-tsarikov.github.io/HSE-Rec-Sys-Course/content-based-movie-recommender/)** 👈
## Features

- Correct parsing of all 19 MovieLens genre flags, including `Unknown` and `Western`.
- A user profile formed by averaging three watched movies' 19-dimensional binary genre vectors.
- Cosine similarity between the averaged profile and each unseen movie produces a fixed Top-5 ranking.
- All three watched movies and every zero-similarity candidate are excluded.
- Quality-aware, deterministic tie-breaking using Bayesian-smoothed MovieLens ratings.
- The original Week 2 interface is preserved; its result box lists five titles and their cosine-match percentages.
- Graceful genre-only fallback when ratings cannot be loaded.
- Strict input validation, atomic data loading, and accessible status updates.
- Responsive controls, visible keyboard focus, and reduced-motion support.

## Visual fidelity

The starter application's centered 600-pixel card, typography, colors, spacing, stacked controls, blue action button, and bordered result box are intentionally preserved. The only visible structural extension is the addition of two movie selectors needed to build the three-title profile.

## How ranking works

Each movie is represented by a 19-dimensional binary vector: a genre position is `1` when the movie has that genre and `0` otherwise. Given three watched vectors `v₁`, `v₂`, and `v₃`, the user profile is their component-wise mean:

```text
profile = (v₁ + v₂ + v₃) / 3
```

A profile weight of `0.67`, for example, means that two of the three watched movies have that genre. For profile vector `P` and candidate vector `C`, ranking uses:

```text
cosine(P, C) = (P · C) / (||P|| × ||C||)
```

The three watched movies are removed from the candidate set. Zero-length vectors return zero instead of dividing by zero, and candidates with zero similarity are removed. The five highest cosine scores are returned. Equal-similarity candidates are ordered by:

1. Bayesian-smoothed average rating, using 50 ratings at the global mean as the prior;
2. rating count;
3. title and movie ID for a stable final order.

Ratings therefore improve ordering without replacing the content profile with collaborative filtering.

## Run locally

Browser security normally prevents `fetch()` from reading `u.item` and `u.data` when `index.html` is opened through `file://`. Start a local HTTP server instead:

```bash
cd content-based-movie-recommender
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

No installation or build step is required.

## Tests

On macOS, run the complete zero-dependency test suite from the project directory:

```bash
sh tests/run-tests.sh
```

The suite executes the real JavaScript parsing, profile averaging, cosine-similarity, and Top-5 ranking functions through JavaScriptCore, checks the HTML/CSS accessibility contract, and validates both MovieLens files. It specifically covers watched-item exclusion, duplicate selections, the original genre offset, Western, zero similarity, tie-breaking, malformed data, and repeat parsing.

## Project structure

```text
content-based-movie-recommender/
├── index.html                  # Accessible application structure
├── style.css                  # Responsive presentation and state styles
├── data.js                    # Validated, atomic MovieLens data loading
├── script.js                  # UI and recommendation ranking
├── u.item                     # MovieLens movie metadata
├── u.data                     # MovieLens ratings
├── docs/
│   ├── business-and-algorithmic-analysis.md
│   ├── dataset-notice.md      # Dataset provenance and usage notice
│   └── week2-source-audit.md  # Original implementation audit
└── tests/
    ├── app-tests.jxa          # JavaScript behavior tests
    ├── test_static.py         # Structure and data-integrity tests
    └── run-tests.sh           # Test entry point
```

## Failure behavior

- If movie metadata fails to load or validate, controls remain disabled and the original result box displays the error. Reloading the page retries initialization.
- If ratings fail to load or validate, the application remains usable and falls back to deterministic genre-only ordering.
- Repeated loads parse into new local state and do not append duplicate records.

## Dataset

This project uses the MovieLens 100K dataset collected by the GroupLens Research Project at the University of Minnesota. See [the local dataset notice](docs/dataset-notice.md) before redistributing or using the data outside coursework or research.

## Known scope

This remains a transparent teaching baseline. Its user profile is the simple mean of three selected titles over broad genre features; it does not learn preference strength, dislike signals, sequence, or a long-term profile from a complete watch history.
