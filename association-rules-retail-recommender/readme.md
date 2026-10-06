# Association Rules Retail Recommender

A browser application that mines product associations from **UCI Online Retail** invoices and shows their support, confidence and lift. It uses Apriori to discover frequent itemsets and lets users explore rules with adjustable thresholds and direction reversal.

**Author:** Ivan Tsarikov · **Course:** LLM4Rec, HSE University · **Assignment:** A04, individual

**Repository:** [Ivan-Tsarikov/HSE-Rec-Sys-Course](https://github.com/Ivan-Tsarikov/HSE-Rec-Sys-Course)  
**Project directory:** [association-rules-retail-recommender](https://github.com/Ivan-Tsarikov/HSE-Rec-Sys-Course/tree/main/association-rules-retail-recommender)

## 🚀 Web App

👉 **[OPEN THE WEB APP](https://ivan-tsarikov.github.io/HSE-Rec-Sys-Course/association-rules-retail-recommender/)** 👈

## Run locally

Open `association-rules-retail-recommender/index.html` in a modern browser. Keep `transactions.js`, `script.js` and `style.css` beside it. No installation, build step or HTTP server is required.

To obtain the project from its repository:

```bash
git clone https://github.com/Ivan-Tsarikov/HSE-Rec-Sys-Course.git
cd HSE-Rec-Sys-Course/association-rules-retail-recommender
```

Then open `index.html` and:

1. Press **Run tests**: the completed self-checks report **11 passed / 0 failed / 0 pending**.
2. Press **Run rules**: the default **1% support / 30% confidence** returns **950 rules**.
3. Set confidence to **60%**, keeping support at **1%**, and run again to reproduce the final analysis setting: **238 rules**.
4. Click a rule to inspect its counts and metrics. Select **Reverse direction (B → A)** to compare the conditional probabilities.

## Features and method

- One invoice forms one basket; `StockCode` identifies a product and `Description` labels it. Repeated products or multiple units contribute one presence per invoice.
- Complete **Apriori** discovers frequent itemsets of every qualifying size using candidate joins, downward-closure pruning and indexed basket intersections.
- Every frequent itemset is split into **all nonempty directed antecedent/consequent partitions**. A k-itemset has `2^k − 2` candidate directions before confidence filtering; mining is not limited to pairs.
- Support and confidence thresholds are inclusive. The miner uses the number of input baskets, including for small fixtures.
- Metric helpers return `{value, defined}`; zero denominators produce explicit undefined notices instead of `Infinity` or `NaN`.
- The supplied interface includes threshold sliders, a rule table, selection, reversal, dataset summary and the five-basket worked example.

For basket count `N`, antecedent count `nA`, consequent count `nB` and joint count `nAB`:

```text
support(A → B)    = nAB / N
confidence(A → B) = nAB / nA
lift(A → B)       = (nAB / nA) / (nB / N)
                 = N × nAB / (nA × nB)
```

Reversal preserves support and lift; confidence becomes `nAB / nB`. The table contains candidates meeting support and confidence. **Lift > 1** is the additional requirement for downstream action analysis, rather than an automatic filter inside the rule generator.

## Dataset provenance

The source is [UCI Online Retail, dataset 352](https://archive.ics.uci.edu/dataset/352/online%2Bretail), credited to D. Chen (2015), DOI [10.24432/C5BW33](https://doi.org/10.24432/C5BW33). The source contains **541,909 invoice-line records** from 2010-12-01 through 2011-12-09.

The course [dataset generator](https://github.com/dryjins/RecSys-LLMs/blob/main/tools/build_week4_data.py) removes cancellations/adjustments, nonpositive quantities and prices, missing descriptions/customer IDs and non-product codes. It normalizes stock codes and labels, groups by invoice, deduplicates products and retains baskets with at least two distinct products.

The unchanged dictionary-encoded export contains:

| Property | Value |
| --- | ---: |
| Invoice baskets | 17,080 |
| Distinct products | 3,653 |
| Binary invoice-product presences | 384,911 |
| Duplicate products within exported baskets | 0 |

The **384,911** presences are the sum of deduplicated basket sizes. Basket sets and inverted postings represent the logical **17,080 × 3,653** invoice–item matrix without allocating a dense matrix.

The verified `transactions.js` SHA-256 is:

```text
c14ed6f8c83124c37d06f752e386a3e389a1fb285ed1184e952fc8810d05c1b3
```

Associated paper: Daqing Chen, Sai Laing Sain and Kun Guo, “Data mining for the online retail industry: A case study of RFM model-based customer segmentation using data mining,” *Journal of Database Marketing & Customer Strategy Management*, vol. 19, pp. 197–208, 2012, DOI [10.1057/dbm.2012.17](https://doi.org/10.1057/dbm.2012.17).

## Results

All counts below are from the supplied 17,080-basket export. Confidence changes the rule count without changing the frequent itemsets at a fixed support threshold.

| Minimum support / confidence | Frequent itemsets | Rules before lift filtering | Rules with lift > 1 |
| --- | ---: | ---: | ---: |
| 1% / 30% — page default | 1,219 | 950 | 950 |
| **1% / 60% — final analysis** | **1,219** | **238** | **238** |
| 3% / 30% | 115 | 12 | 12 |
| 3% / 60% | 115 | 5 | 5 |
| 0.5% / 10% — diagnostic | 5,255 | 19,058 | 19,056 |

At the final support threshold, a pattern needs at least **171 joint invoices**. Complete mining finds itemsets up to size four at 1% support and size six at 0.5%.

The useful **21086 — SET/6 RED SPOTTY PAPER CUPS → 21094 — SET/6 RED SPOTTY PAPER PLATES** rule has **283 antecedent**, **325 consequent** and **236 joint** baskets. Its support is **1.3817%**, forward confidence **83.3922%**, reverse confidence **72.6154%** and lift **43.8258**. It suggests a matching-plate cross-sell worth testing.

A five-herb-marker antecedent (**22916/22917/22919/22920/22921**) predicts **22918 — HERB MARKER PARSLEY** with **99.2481% confidence** and **90.6502 lift**, but only **132 joint** baskets and one completed antecedent basket without parsley. It is a true positive association rejected for narrow reach and saturation; its **0.7728% support** falls below the final threshold. It is a diagnostic example, not one of the final passing rules.

## Verification

The supplied self-check harness passes **11/11 checks**. An independent suite passes **11/11 tests**, covering complete itemset and rule outputs, higher-order partitions, duplicates, stock identity, undefined metrics, inclusive thresholds and input immutability.

Exhaustive comparisons across 48 small fixtures and direct scans of the selected retail rules confirm the calculations. Browser checks cover file loading, threshold controls, rule selection, reversal and empty/undefined states.

## Files

```text
association-rules-retail-recommender/
├── index.html       Provided page structure
├── style.css        Provided styling
├── transactions.js  Unchanged dictionary-encoded retail baskets
├── script.js        Seven completed functions and preserved starter helpers/UI/tests
└── readme.md        Project overview and instructions
```

The five files above are sufficient to run the application.

## Scope and acknowledgments

These rules describe completed multi-product invoices in the cleaned population. The export has no usable per-basket timestamps, customer IDs, prices, quantities or non-purchasing visits. Matching cups and plates may share party intent; the observed lift does not establish that an offer increases sales. Later dated invoices and a randomized cross-sell experiment are proposed validation steps, not executed outcomes.

The interface, dataset export and homework contracts originate from the [LLM4Rec Week 4 Association Rules starter](https://github.com/dryjins/RecSys-LLMs/tree/main/week4) by the course instructor, Seungmin Jin. This project supplies the required implementation and analysis in [Ivan Tsarikov's course repository](https://github.com/Ivan-Tsarikov/HSE-Rec-Sys-Course).
