# Audit of the Week 2 content-based movie recommender

Last reviewed: 2026-09-21

## Scope

This document records the mistakes, robustness problems, UX issues, and design limitations found in the original implementation at:

`Rec-Sys/RecSys-LLMs-official-course-repo/week2`

The reviewed files are `readme.md`, `index.html`, `style.css`, `data.js`, `script.js`, `u.item`, and `u.data`. This is an audit of the original source; the source files were not modified as part of the review.

## Verified dataset facts

- `u.item` contains 1,682 rows, 24 pipe-separated fields per row, unique IDs from 1 through 1,682, and no movie with all 19 genre flags unset.
- `u.data` contains 100,000 rows and four tab-separated fields per row.
- The ratings cover 943 users and all 1,682 movies. Rating values range from 1 through 5.
- Rating distribution: 6,110 ones, 11,370 twos, 27,145 threes, 34,174 fours, and 21,201 fives.

## Remediation status

All findings below are addressed in the corrected implementation beside this document. The original course source at `Rec-Sys/RecSys-LLMs-official-course-repo/week2` remains unchanged for comparison.

| Finding | Status in corrected implementation |
| --- | --- |
| W2-001 | Fixed with the complete 19-name schema and tested `Unknown`/`Western` cases. |
| W2-002 | Fixed by excluding every candidate whose cosine-similarity score is zero. |
| W2-003 | Fixed with rating-quality, rating-count, title, and ID tie-breakers. |
| W2-004 | Fixed with local parsing and atomic dataset replacement; repeated parsing is tested. |
| W2-005 | Fixed by aggregating ratings instead of storing 100,000 objects, using the aggregates for ties, and allowing a genre-only fallback. |
| W2-006 | Fixed with exact field counts, numeric/range checks, duplicate detection, movie-reference checks, and line-numbered errors. |
| W2-007 | Fixed with equal-specificity `#result.*` state selectors. |
| W2-008 | Fixed with pure parsers and a small frozen data API; the data layer no longer writes to the DOM. |
| W2-009 | Fixed with `DOMContentLoaded` and `addEventListener`. |
| W2-010 | Fixed by removing the artificial timeout and redundant queued calculations. |
| W2-011 | Fixed with disabled loading states, non-fatal rating fallback, and clear failure feedback. |
| W2-012 | Fixed with accessible names, live status semantics, event listeners, and visible keyboard focus. |
| W2-013 | Addressed with a three-movie averaged genre profile, cosine similarity, clear baseline labeling, and a quality-aware secondary signal. |
| W2-014 | Fixed with precomputed genre vectors and bounded top-k insertion instead of a full candidate sort. |
| W2-015 | Fixed by listing the Top-5 titles and cosine-match percentages in the original result box. |
| W2-016 | Fixed with executable JavaScript and static/data-integrity test suites. |
| W2-017 | Fixed with a project README containing setup, architecture, testing, behavior, and limitations. |
| W2-018 | Fixed with `docs/dataset-notice.md`, official source links, terms summary, and citation. |
| W2-019 | Fixed by converting the working `u.item` copy from legacy ISO-8859-1 bytes to UTF-8. |

The findings below describe the original Week 2 Jaccard implementation. The corrected application initially retained Jaccard as a transparent single-item baseline, then switched to cosine similarity over the same 19 binary genre features on 2026-09-22. It was subsequently extended on the same date to average three watched-movie vectors into a user profile, exclude those movies, and return Top 5 unseen items. Historical references to Jaccard below are intentionally preserved because they document the audited source.

## Severity guide

- **High:** produces materially incorrect recommendations or makes otherwise usable functionality fail.
- **Medium:** causes misleading behavior, poor robustness, or a significant maintenance/accessibility problem.
- **Low:** a quality, scalability, or documentation weakness that does not normally break this dataset-sized demo.

## Findings

### W2-001 — Genre flags are mapped to the wrong names

**Severity:** High  
**Location:** `data.js`, lines 5–10 and 55–57  
**Root cause also present in:** `readme.md`, which asks for 18 names but also asks the implementation to process 19 genre fields.

The MovieLens item format has 19 genre flags in this order:

`unknown, Action, Adventure, Animation, Children's, Comedy, Crime, Documentary, Drama, Fantasy, Film-Noir, Horror, Musical, Mystery, Romance, Sci-Fi, Thriller, War, Western`

The implementation slices all 19 flags with `fields.slice(5, 24)`, but `genreNames` contains only the 18 names from `Action` through `Western`. `Array.prototype.filter` consequently compares only indices 0–17.

This creates the following offset:

- `unknown` is interpreted as `Action`.
- `Action` is interpreted as `Adventure`.
- Every other known genre through `War` is shifted to the next name.
- The real `Western` flag at index 18 is never examined.

Examples:

- `Toy Story (1995)` should be `Animation, Children's, Comedy`, but is parsed as `Children's, Comedy, Crime`.
- `GoldenEye (1995)` should be `Action, Adventure, Thriller`, but is parsed as `Adventure, Animation, War`.
- Thirteen movies whose only genre is `Western`, including `Unforgiven (1992)`, `High Noon (1952)`, and `Once Upon a Time in the West (1969)`, are parsed with an empty genre list.
- The two rows with the `unknown` flag (`unknown` and `Good Morning (1971)`) are incorrectly treated as action movies.

**Recommended fix:** define all 19 genre names, including `Unknown`, and map all 19 flags. If the product deliberately excludes the unknown category, slice only `fields[6]` through `fields[23]` and document what should happen to unknown-only movies.

### W2-002 — Movies with zero similarity are still presented as recommendations

**Severity:** High  
**Location:** `script.js`, lines 77–107

Every candidate is sorted and the first two are returned, even when its Jaccard score is `0`. The UI can therefore claim that two unrelated movies are recommendations. The `No recommendations found` branch is effectively unreachable whenever the dataset contains at least three movies, because `topRecommendations.length` will still be two.

The genre parsing bug makes this especially visible for Western-only movies: they receive an empty genre set, every comparison scores zero, and the first two candidates in dataset order are returned.

**Recommended fix:** filter candidates to `score > 0` before selecting the top results. If none remain, display the existing no-recommendations state. A configurable minimum similarity would be better for a production version.

### W2-003 — Equal scores are resolved by dataset order rather than recommendation quality

**Severity:** Medium  
**Location:** `script.js`, lines 98–102

Genre vectors are very small, so many films receive the same Jaccard score. The comparator only considers `score`. In modern browsers the stable sort preserves the original `u.item` order for ties, which is effectively movie-ID order. The two returned films are thus often the earliest IDs among a large group of equally similar films, not necessarily the most relevant or best-supported choices.

**Recommended fix:** add an explicit deterministic secondary ranking signal. Candidate options include rating count, average rating with Bayesian shrinkage, release-year proximity, title as a final deterministic key, or a documented combination of these signals.

### W2-004 — Loading is not idempotent and can duplicate data

**Severity:** High  
**Location:** `data.js`, lines 1–3, 14–30, 59, and 78

`movies` and `ratings` are mutable global arrays, and both parsers append to them. `loadData()` never clears or replaces the arrays. Calling it a second time duplicates all successfully parsed rows.

There is also a partial-failure case: movies are parsed before ratings are fetched. If `u.data` fails, `movies` remains populated. A retry appends all movies again before retrying the ratings request, causing duplicate dropdown entries and duplicate recommendation candidates.

**Recommended fix:** parse both responses into local arrays, validate them, and assign the global/application state only after both operations succeed. Returning `{ movies, ratings }` from `loadData()` is preferable to mutating globals.

### W2-005 — Unused ratings are a hard dependency and a large runtime cost

**Severity:** High  
**Location:** `data.js`, lines 24–30 and 63–80

The application fetches and materializes all 100,000 ratings as JavaScript objects, but `script.js` never reads `ratings`. This has three effects:

1. Roughly 2 MB of source data plus the much larger in-memory object representation are loaded for no recommendation benefit.
2. Startup waits for rating parsing even though the dropdown and genre recommender need only `u.item`.
3. A missing or failed `u.data` request prevents the entire application from initializing even though genre-only recommendations could still work.

**Recommended fix:** either remove ratings from this implementation or use them as a documented secondary ranking/quality signal. If ratings are optional, their failure must not block the genre-only application.

### W2-006 — Parsers accept malformed records and `NaN` values

**Severity:** Medium  
**Location:** `data.js`, lines 43–59 and 64–78

`parseItemData()` checks only `fields.length < 5`, although it later assumes 24 fields. `parseRatingData()` checks for fewer than four fields but accepts extra fields. Neither parser verifies that IDs and timestamps are valid integers, that ratings are in the expected range, or that genre values are binary.

A malformed row can therefore silently produce an object with `NaN`, missing genres, or invalid values. Silent skipping also gives the caller no indication that data was lost.

**Recommended fix:** validate the exact schema and numeric ranges, collect row-level errors with line numbers, and either reject the dataset atomically or report how many invalid records were skipped.

### W2-007 — Status colors do not work because of CSS specificity

**Severity:** Medium  
**Location:** `style.css`, lines 83–101

`#result { color: #2c3e50; }` has higher specificity than `.loading`, `.error`, and `.success`. Assigning one of those classes changes the loading font style, but none of their `color` declarations can override the ID selector. Error and success states therefore use the same dark color despite the code attempting to distinguish them visually.

**Recommended fix:** use selectors such as `#result.error`, remove the color from `#result`, or use a component class with consistent specificity. Do not use `!important` as the primary fix.

### W2-008 — The data module is tightly coupled to both global state and the DOM

**Severity:** Medium  
**Location:** `data.js`, lines 1–3 and 31–38; `script.js`, throughout

Although `data.js` is described as the data-handling module, it directly mutates shared globals and writes an error into `#result`. `script.js` relies on those implicit globals and on script load order. This makes the parser difficult to test outside a browser and prevents reuse in another UI.

**Recommended fix:** make parsing functions pure, return data or throw typed errors, and let the UI layer decide how to render those errors. ES modules can make dependencies explicit.

### W2-009 — Initialization replaces the global `window.onload` handler

**Severity:** Low  
**Location:** `script.js`, lines 1–20

Assigning `window.onload = ...` can overwrite another load handler, or be overwritten by code loaded later. It also delays initialization until every page asset has loaded even though the application only needs the DOM.

**Recommended fix:** use `document.addEventListener('DOMContentLoaded', initialize)` or a deferred module script.

### W2-010 — `setTimeout` adds latency without providing real asynchronous computation

**Severity:** Low  
**Location:** `script.js`, lines 66–118

The 100 ms timeout makes the loading message paint, but the recommendation calculation still runs synchronously on the main thread. It adds a fixed delay to every click and permits multiple redundant pending calculations when the button is clicked repeatedly.

The current dataset is small enough that the calculation does not need this delay. If computation later becomes expensive, `setTimeout` will not prevent UI blocking.

**Recommended fix:** calculate immediately for this dataset. For genuinely expensive work, debounce/cancel previous requests and move computation to a Web Worker or precomputed index.

### W2-011 — Controls do not reflect loading and failure states

**Severity:** Medium  
**Location:** `index.html`, lines 14–18; `script.js`, lines 1–20

The select and button remain enabled while data is loading and after a fatal loading error. The user can invoke recommendation logic before initialization, and the UI does not clearly communicate that the controls are unavailable.

**Recommended fix:** disable both controls initially, enable them only after successful movie loading, disable the button during an active calculation, and preserve a recoverable retry state when loading fails.

### W2-012 — Form controls and dynamic results have incomplete accessibility

**Severity:** Medium  
**Location:** `index.html`, lines 12–22; `style.css`, lines 47–59

- The movie select has instructions nearby but no programmatically associated `<label>`.
- The dynamically changing result does not use `aria-live` or a status role, so screen readers may not announce loading, errors, or recommendations.
- Inline `onclick` mixes behavior with markup and is less compatible with strict Content Security Policy.
- The select removes the browser outline and relies on a subtle border-color change; the button has no explicit `:focus-visible` style.

**Recommended fix:** add a real label, use `role="status"`/`aria-live="polite"` as appropriate, register the click handler from JavaScript, and provide strong keyboard focus styles.

### W2-013 — The recommender is content-based in name but extremely weak in signal

**Severity:** Medium (model-quality limitation, not a violation of the assignment formula)  
**Location:** `script.js`, lines 73–102

The model represents a movie only as an unweighted set of broad genres. It ignores rating quality, popularity, release year, title metadata, and all other content. Movies with a single shared genre can rank highly even when they are otherwise unrelated. It also cannot learn a user's preferences from rating history; the interaction is item-to-item similarity from one selected film.

**Recommended fix:** keep genre Jaccard as a transparent baseline, but label it as such. For a stronger system, combine it with quality-aware ranking and richer content features, or build a hybrid with collaborative signals from `u.data`.

### W2-014 — Recommendation ranking is recomputed and fully sorted on every click

**Severity:** Low

For each request, the code creates genre sets for every movie, calculates all scores, allocates new objects, and sorts the full candidate array merely to retrieve two entries. This is acceptable for 1,682 films but scales poorly.

**Recommended fix:** precompute genre sets or bitmasks once, cache item-to-item similarities, and use a top-k selection strategy instead of a full sort if the catalog becomes large.

### W2-015 — Output lacks evidence and makes strong claims

**Severity:** Low  
**Location:** `script.js`, lines 104–110

The result shows only two titles and says “we recommend” without showing genres, similarity scores, or whether the score was zero. This makes incorrect or weak recommendations difficult for the user to understand.

**Recommended fix:** display the shared genres and a suitably formatted similarity score, and use more cautious wording when confidence is low.

### W2-016 — The project has no automated tests

**Severity:** Medium

There are no unit or integration tests for parsing, Jaccard calculation, ranking, error handling, or UI initialization. A minimal parser fixture containing `unknown`, `Action`, and `Western` flags would have caught W2-001 immediately.

**Recommended minimum coverage:**

- exact mapping of all 19 genre positions;
- parsing of blank lines and rejection of malformed rows;
- idempotent/atomic loading behavior;
- Jaccard scores for empty, disjoint, identical, and partially overlapping sets;
- exclusion of the selected movie and zero-score candidates;
- deterministic tie handling;
- load-failure and retry behavior;
- status-class rendering and basic accessibility checks.

### W2-017 — The README is a generation prompt, not project documentation

**Severity:** Medium  
**Location:** `readme.md`

The README contains the prompt used to generate the four application files. It does not explain how to run, test, troubleshoot, or extend the resulting application. In particular, opening `index.html` directly through `file://` will commonly fail because browser security rules restrict `fetch()` of local files.

**Recommended fix:** replace or supplement it with project documentation that includes a local HTTP-server command, architecture overview, data format, known limitations, test command, and expected browser support. Preserve the generation prompt separately if it is useful course material.

### W2-018 — Dataset provenance and usage terms are not documented locally

**Severity:** Low

The directory contains bare MovieLens data files without the dataset's original README, citation, or usage/license notes. This weakens reproducibility and makes it easy to redistribute or reuse the data without knowing its terms.

**Recommended fix:** document the exact MovieLens 100K source/version, link or include its required attribution and usage terms, and record whether the files are original or transformed.

### W2-019 — The item file encoding disagrees with the HTML encoding

**Severity:** Medium  
**Location:** `u.item`; `index.html`, line 4

The original course copy of `u.item` contains legacy ISO-8859-1 bytes, while the page declares UTF-8 and `Response.text()` decodes fetched content as UTF-8. Titles containing non-ASCII bytes can therefore contain Unicode replacement characters in the browser. This was not visible from the initial `file` classification but was confirmed by strict UTF-8 decoding during executable test setup.

**Recommended fix:** convert the application copy of `u.item` from ISO-8859-1 to UTF-8 without changing delimiters or field values, keep the UTF-8 HTML declaration, document the transformation, and test strict UTF-8 decoding.

## Suggested repair order

1. Fix genre mapping and add parser tests (W2-001, W2-006, W2-016).
2. Reject zero-score candidates and define deterministic tie-breaking (W2-002, W2-003).
3. Make loading atomic and decide whether ratings are required (W2-004, W2-005).
4. Fix status CSS and loading/control states (W2-007, W2-011).
5. Separate data, model, and UI concerns (W2-008, W2-009, W2-010).
6. Improve accessibility, explanations, and project documentation (W2-012, W2-015, W2-017, W2-018).
7. Improve model quality and scalability only after the correctness baseline is covered (W2-013, W2-014).
8. Normalize and verify data encoding before browser delivery (W2-019).

## Important non-issues observed

- Script order in `index.html` is correct: `data.js` is loaded before `script.js`.
- Movie titles and result strings are assigned through `textContent`, not `innerHTML`, so dataset titles are not directly interpreted as HTML.
- The supplied datasets have consistent row counts and field counts; the main parsing defect is the semantic genre offset, not malformed source data.
