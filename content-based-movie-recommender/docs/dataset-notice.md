# MovieLens 100K dataset notice

The files `u.item` and `u.data` are course-provided copies of the MovieLens 100K dataset collected by the GroupLens Research Project at the University of Minnesota.

The course copy of `u.item` contained legacy ISO-8859-1 bytes. This project's copy has been losslessly converted to UTF-8 so it agrees with `<meta charset="UTF-8">` and movie titles decode correctly in browsers. Delimiters, rows, IDs, and field values are otherwise unchanged.

## Contents used by this project

- 1,682 movie records in `u.item`.
- 100,000 ratings from 943 users in `u.data`.
- Ratings use the integer scale 1–5.
- The original data was collected through MovieLens from September 1997 through April 1998.

## Source and terms

- Dataset page: <https://grouplens.org/datasets/movielens/100k/>
- Official README and usage terms: <https://files.grouplens.org/datasets/movielens/ml-100k-README.txt>

The official terms require acknowledgment in resulting publications, prohibit implying endorsement by the University of Minnesota or GroupLens, restrict commercial use, and state that redistribution requires separate permission. Consult the official README rather than relying on this summary before publishing or redistributing the files.

## Citation requested by GroupLens

F. Maxwell Harper and Joseph A. Konstan. 2015. “The MovieLens Datasets: History and Context.” *ACM Transactions on Interactive Intelligent Systems*, 5(4), Article 19. <https://doi.org/10.1145/2827872>

## Local integrity expectations

The application and tests expect:

- exactly 24 pipe-separated fields per non-empty `u.item` row;
- 19 genre flags ordered as `Unknown`, `Action`, `Adventure`, `Animation`, `Children's`, `Comedy`, `Crime`, `Documentary`, `Drama`, `Fantasy`, `Film-Noir`, `Horror`, `Musical`, `Mystery`, `Romance`, `Sci-Fi`, `Thriller`, `War`, and `Western`;
- exactly four tab-separated fields per non-empty `u.data` row;
- positive integer user, movie, and timestamp values; and
- ratings from 1 through 5.
- valid UTF-8 text for both data files.
