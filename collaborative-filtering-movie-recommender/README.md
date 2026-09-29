# Collaborative Filtering Movie Recommender

This Week 3 MovieLens 100K application predicts one unseen user–movie rating with **user-based** and **item-based** collaborative filtering, then shows a separate Top 5 from each method. It preserves the original Week 3 page layout and adds only the result content required by HW3.

## 🚀 Web App

👉 **[OPEN THE WEB APP](https://ivan-tsarikov.github.io/HSE-Rec-Sys-Course/collaborative-filtering-movie-recommender/)** 👈

The GitHub Pages link becomes available after this HW3 directory is published to the repository.

## Run locally

From this directory:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/>. Choose a user and an unrated movie, then select **Predict Rating**. Both estimators run locally in the browser; the page has no TensorFlow.js or build dependency. Opening `index.html` as a `file://` URL may prevent `fetch()` from loading the data.

The working `u.item` is the course file transcoded from ISO-8859-1 to UTF-8 so accented titles render correctly. `u.data` is byte-identical to the course file. The MovieLens 100K data originates with GroupLens; review its [usage terms](https://files.grouplens.org/datasets/movielens/ml-100k/README) before redistributing the data files.

## Method

The input matrix has **movie rows** and **user columns**. Only observed 1–5 ratings are stored. Missing cells are never replaced with zero or a mean for similarity.

- **User-based CF:** compare users on co-rated movies, centering each user's ratings by their observed mean. Similar users who rated the target movie supply the estimate.
- **Item-based CF:** compare movies on users who rated both, centering each co-rater by that user's mean (adjusted cosine). Movies the active user rated supply the estimate.
- Both similarities require at least three common ratings and are multiplied by `overlap / (overlap + 10)`. Only positive similarities are used, with at most 20 neighbours per target.
- The shared baseline is the global mean plus smoothed user and movie deviations (`α = β = 10`). Neighbour residuals are weighted by similarity, with an additional `0.5` weight in the denominator to temper weak evidence. At least two contributing neighbours are required; otherwise the result is labelled as a baseline fallback.
- Estimates are clipped to `[1, 5]`. Both Top-5 lists exclude every movie already rated by the active user. Supported candidates rank before labelled fallback candidates; ties are deterministic.

The parameters were checked on validation ratings before a separate frozen-parameter confirmation run. The original TensorFlow.js matrix-factorization starter remains available in the official course repository for comparison; the primary screen implements the two methods requested by the HW3 slide.

## Verification

The applied tests cover parser validation, hand-calculated similarities, sparse and cold-start fallbacks, exclusion of known ratings, bounded predictions, the page flow, and full MovieLens Top-5 generation. An independent Python evaluation used the same held-out pairs for both methods. On its 10,000-rating frozen-parameter confirmation test, user CF achieved MAE **0.7299** and item CF **0.7233**, with neighbour support above 99% for both. The included A03 report explains the protocol, business trade-offs, limitations, and AI-assisted checks.

## Files

```text
index.html, style.css        Original Week 3 visual shell with a two-method result
data.js                      Strict, atomic MovieLens loading and parsing
cf.js                        Sparse CF model and pairwise similarity calculations
script.js                    User/movie controls and safe DOM rendering
u.item, u.data               Local MovieLens files (see dataset notice)
ivan_tsarikov_a03_report.pdf  Homework report and measured analysis
ivan_tsarikov_a03_session.json  Tool-native AI work record
```

## Scope

MovieLens 100K has no interaction history for a genuinely new user or new movie. The model returns a labelled rating baseline for synthetic empty-history cases in tests; the page selectors contain only users and movies present in the supplied files. Offline rating accuracy and Top-5 held-out hits do not establish watch-time, retention, or revenue effects.
