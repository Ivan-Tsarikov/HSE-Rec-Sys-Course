# Business & Algorithmic Analysis

**Executive conclusion.** Profile-based cosine recommendations better represent persistent, multi-item taste, while item-to-item cosine recommendations preserve the user's immediate context and—on this dataset—surface more long-tail titles. Cosine normalization materially reduces the tendency of broad, multi-genre movies to dominate compared with an unnormalized dot product, but it does not remove popularity pressure from the rating-based tie-breaker. For a product system, the strongest design is therefore hybrid: use the profile for baseline relevance, retain item-to-item candidates for intent and discovery, and apply an explicit novelty or exposure constraint before the final Top 5.

All figures below were calculated from the application's MovieLens 100K files and current ranking rules. The main offline evaluation used 942 of 943 users with at least three positive ratings (`rating >= 4`). For each user, the earliest three positive titles formed the known history; the third title was the active item. Both approaches excluded the same three watched titles, returned five candidates, and used the same Bayesian rating tie-breaker. “Head” means the 337 most-rated movies—the top 20% of the 1,682-item catalog—and “long tail” means the remaining 1,345 movies.

## 1. Item-to-Item vs. Profile-Based

**Main conclusion: the two approaches solve different recommendation jobs. Item-to-item is a precise response to current intent; the averaged profile is a broader representation of enduring taste, but can blur distinct interests into a mainstream centroid.** They should be treated as complementary retrieval sources rather than interchangeable formulas.

The item-to-item approach uses the 19-dimensional binary genre vector of one active movie. The profile approach averages the vectors of three watched movies component by component:

```text
profile = (movie₁ + movie₂ + movie₃) / 3
```

Both approaches then calculate cosine similarity between their query vector and every eligible candidate. The difference is the information represented by the query: one local intent signal versus three pieces of preference evidence.

### Worked Top-5 comparison

The example history contains:

- `Toy Story (1995)` — Animation, Children's, Comedy;
- `GoldenEye (1995)` — Action, Adventure, Thriller;
- `Four Rooms (1995)` — Thriller.

The item-to-item query uses `Toy Story` as the active item. The aggregated profile contains weights of `0.67` for Thriller and `0.33` each for Action, Adventure, Animation, Children's, and Comedy. Both rankings exclude all three watched movies.

| Rank | Single active item: `Toy Story` | Cosine | Ratings | Segment |
| ---: | --- | ---: | ---: | --- |
| 1 | Aladdin and the King of Thieves (1996) | 1.000 | 26 | Long tail |
| 2 | Aladdin (1992) | 0.866 | 219 | Head |
| 3 | A Goofy Movie (1995) | 0.866 | 20 | Long tail |
| 4 | The Wrong Trousers (1993) | 0.816 | 118 | Head |
| 5 | A Grand Day Out (1992) | 0.816 | 66 | Long tail |

| Rank | Aggregated three-movie profile | Cosine | Ratings | Segment |
| ---: | --- | ---: | ---: | --- |
| 1 | A Close Shave (1995) | 0.770 | 112 | Head |
| 2 | The Rock (1996) | 0.770 | 378 | Head |
| 3 | Clear and Present Danger (1994) | 0.770 | 179 | Head |
| 4 | Con Air (1997) | 0.770 | 137 | Head |
| 5 | Firestorm (1998) | 0.770 | 18 | Long tail |

The two lists have no titles in common. That is expected rather than contradictory: the single-item list stays within the Animation/Children's/Comedy neighborhood, while the profile list searches for movies that bridge the accumulated weights, especially Thriller combined with one of the other watched interests. All five profile candidates tie on cosine score, so the rating-quality rule determines their order.

Across the 942-user evaluation, the average overlap between the two Top-5 lists was only **0.88 titles out of 5 (17.6%)**. This confirms that the choice of representation changes retrieval materially; profile averaging is not a minor reranking of item-to-item results.

**Business implication.** Item-to-item fits “More like this,” post-detail-page, and short-session use cases where the active title is a strong expression of current intent. Profile-based retrieval fits a home page or re-entry experience where no current title should dominate. A product can preserve both signals by taking candidates from each source and reranking the union rather than forcing one algorithm to serve every surface.

## 2. Bias Mitigation

**Main conclusion: cosine normalization removes the mechanical advantage that comes from having many genre labels, substantially reducing multi-genre concentration compared with raw overlap. It mitigates feature-count bias, but it does not guarantee popularity neutrality.**

For a profile vector `P` and candidate vector `C`, raw dot product uses only the numerator:

```text
raw overlap = P · C
```

A movie can therefore accumulate score through many active genre fields. Cosine divides by both vector magnitudes:

```text
cosine(P, C) = (P · C) / (||P|| × ||C||)
```

For a one-genre query, an exact one-genre candidate scores `1.0`. A five-genre candidate containing that genre plus four unrelated genres has the same raw overlap of `1`, but its cosine score falls to `1 / √5 = 0.447`. Adding a nonmatching genre increases the denominator without increasing the numerator. A broad movie must therefore match proportionally more of the profile to retain a high score.

The MovieLens cohort supports this mechanism. The comparison below holds the three-movie profiles, candidate exclusions, Top-5 size, and rating tie-breaker constant; only raw dot product versus cosine changes.

| Exposure metric across 4,710 recommendation slots | Raw dot product | Cosine | Cosine change |
| --- | ---: | ---: | ---: |
| Mean genres per recommended movie | 3.89 | 2.90 | −25.3% |
| Share of slots taken by the 10 most-exposed titles | 43.4% | 22.5% | −21.0 pp |
| Mean candidate popularity, rating count | 187.4 | 161.7 | −13.7% |
| Long-tail share | 32.1% | 35.3% | +3.2 pp |
| Unique catalog items exposed | 184 | 316 | +132 items |
| Catalog coverage | 10.9% | 18.8% | +7.8 pp |

Cosine nearly halves the exposure concentration of the top 10 recommended titles and expands unique coverage by **71.7% relative to raw overlap**. This is consistent with normalization preventing feature-rich movies from winning simply because they carry more genre flags.

The protection is not absolute. First, a multi-genre movie can still rank first when its genre mix genuinely aligns with the profile. Second, equal cosine scores are resolved by Bayesian-smoothed rating quality and rating count; that secondary rule can reintroduce exposure toward established movies. Cosine should therefore be described as mitigation of genre-cardinality bias, not as a complete popularity-debiasing solution.

**Business implication.** Keeping cosine protects relevance while reducing repetitive blockbuster exposure, which can create more inventory for discovery. If catalog fairness is a product goal, add an explicit exposure or novelty term after cosine rather than expecting normalization alone to control popularity.

## 3. Catalog Discovery

**Main conclusion: item-to-item performed better on long-tail discovery in this offline evaluation, while profile averaging produced slightly more popular and more concentrated recommendations. Profile-based relevance should therefore be paired with item-level exploration or a novelty-aware reranker to reduce fatigue and create a credible retention benefit.**

| Discovery metric across 942 users | Item-to-item cosine | Averaged-profile cosine | Profile minus item |
| --- | ---: | ---: | ---: |
| Long-tail recommendation share | 38.0% | 35.3% | −2.7 pp |
| Unique items recommended | 355 | 316 | −39 items |
| Catalog coverage | 21.1% | 18.8% | −2.3 pp |
| Median popularity, rating count | 137 | 147 | +10 ratings |
| Mean popularity, rating count | 151.7 | 161.7 | +9.9 ratings |
| Share of slots taken by the 10 most-exposed titles | 21.1% | 22.5% | +1.4 pp |
| Mean novelty proxy, bits | 10.14 | 9.97 | −0.17 bits |

At the user level, the profile method produced more long-tail items for 309 users (32.8%), the item method did so for 371 users (39.4%), and both were equal for 262 users (27.8%). The result is not driven by a single example: item-to-item has the advantage on every aggregate discovery measure used here.

The likely mechanism is **centroid bias**. Averaging several different interests creates a vector near the center of the user's observed genre space. Movies that bridge multiple common interests can then outrank niche titles that strongly match only one mode. Because those broad bridge movies also tend to have stronger rating evidence, the quality tie-breaker reinforces the effect. Item-to-item remains anchored in one narrower neighborhood and can retrieve niche catalog items that would be diluted in the mean profile.

This does not mean item-to-item is the universally better recommender. Long-tail exposure is a discovery proxy, not a direct measure of relevance or retention. A narrow item neighborhood can itself become repetitive, and an averaged profile can be more stable when the active title is accidental or atypical. The observed result supports a controlled blend:

1. Retrieve a relevance pool from the averaged profile.
2. Add item-to-item candidates from the active or most recent liked title.
3. Exclude watched items and near-duplicates.
4. Rerank with a bounded novelty term or a rule such as at least two long-tail titles in the Top 5, subject to a minimum cosine threshold.
5. Monitor concentration and relevance together rather than maximizing catalog coverage alone.

**Retention recommendation.** Test the blended Top 5 against pure profile ranking in an online experiment. Use watch-start or qualified-play rate as the primary relevance outcome; track completion, explicit negative feedback, and short-term retention as guardrails; and measure long-tail share, unique catalog coverage, repeat-title exposure, and top-10 concentration as discovery diagnostics. The offline data supports testing this direction, but cannot establish that additional long-tail exposure causes higher retention.

**Limitations.** MovieLens 100K is a historical explicit-rating dataset, and rating count is only a proxy for catalog popularity. The evaluation uses each eligible user's earliest three positive ratings, not the exact three titles a live user would select. The 20/80 head-tail boundary is a declared analytical convention rather than a universal definition. Results also include the application's Bayesian rating tie-breaker, so they measure the complete ranking policy rather than pure cosine in isolation. No online behavior, fatigue, watch completion, or causal retention effect is available in these files.

