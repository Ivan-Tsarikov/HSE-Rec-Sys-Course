from __future__ import annotations

import unittest
from html.parser import HTMLParser
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class AppHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.elements: dict[str, dict[str, str | None]] = {}
        self.labels_for: set[str] = set()
        self.scripts: list[dict[str, str | None]] = []
        self.inline_click_handlers = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.elements[element_id] = attributes
        if tag == "label" and attributes.get("for"):
            self.labels_for.add(str(attributes["for"]))
        if tag == "script":
            self.scripts.append(attributes)
        if "onclick" in attributes:
            self.inline_click_handlers += 1


class StaticApplicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.html = (PROJECT_ROOT / "index.html").read_text(encoding="utf-8")
        cls.css = (PROJECT_ROOT / "style.css").read_text(encoding="utf-8")
        cls.data_js = (PROJECT_ROOT / "data.js").read_text(encoding="utf-8")
        cls.script_js = (PROJECT_ROOT / "script.js").read_text(encoding="utf-8")
        cls.readme = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
        cls.parser = AppHTMLParser()
        cls.parser.feed(cls.html)

    def test_required_project_files_exist(self) -> None:
        expected = {
            "index.html",
            "style.css",
            "data.js",
            "script.js",
            "u.item",
            "u.data",
            "README.md",
            "docs/business-and-algorithmic-analysis.md",
            "docs/dataset-notice.md",
            "docs/week2-source-audit.md",
        }
        for relative_path in expected:
            with self.subTest(path=relative_path):
                self.assertTrue((PROJECT_ROOT / relative_path).is_file())

    def test_controls_have_accessible_names_and_initial_disabled_state(self) -> None:
        for control_id in ("watched-movie-1", "watched-movie-2", "watched-movie-3"):
            with self.subTest(control=control_id):
                self.assertTrue(self.parser.elements[control_id].get("aria-label"))
                self.assertIn("disabled", self.parser.elements[control_id])
        self.assertIn("disabled", self.parser.elements["recommend-btn"])

    def test_dynamic_feedback_is_accessible(self) -> None:
        status = self.parser.elements["result"]
        self.assertEqual(status.get("role"), "status")
        self.assertEqual(status.get("aria-live"), "polite")
        self.assertIn('class="container" aria-busy="true"', self.html)

    def test_scripts_are_ordered_at_the_end_of_the_original_layout(self) -> None:
        scripts = [script for script in self.parser.scripts if script.get("src")]
        self.assertEqual([script.get("src") for script in scripts], ["data.js", "script.js"])
        self.assertLess(self.html.index('<div class="container"'), self.html.index('<script src="data.js"'))

    def test_behavior_is_not_embedded_in_markup(self) -> None:
        self.assertEqual(self.parser.inline_click_handlers, 0)
        self.assertNotIn("innerHTML", self.script_js)

    def test_state_styles_have_equal_specificity(self) -> None:
        for state in ("loading", "success", "warning", "error"):
            with self.subTest(state=state):
                self.assertIn(f"#result.{state}", self.css)
        self.assertIn("#result {", self.css)
        self.assertIn(":focus-visible", self.css)
        self.assertIn("prefers-reduced-motion", self.css)

    def test_genre_schema_contains_unknown_and_western(self) -> None:
        genre_block = self.data_js.split("const GENRE_NAMES", 1)[1].split("]);", 1)[0]
        self.assertIn('"Unknown"', genre_block)
        self.assertIn('"Western"', genre_block)
        self.assertIn("fields.slice(5, 24)", self.data_js)

    def test_original_global_array_and_fake_delay_patterns_are_absent(self) -> None:
        self.assertNotIn("let movies = []", self.data_js)
        self.assertNotIn("let ratings = []", self.data_js)
        self.assertNotIn("window.onload", self.script_js)
        self.assertNotIn("setTimeout", self.script_js)
        self.assertIn('addEventListener("DOMContentLoaded"', self.script_js)

    def test_cosine_similarity_replaces_jaccard_in_the_application(self) -> None:
        self.assertIn("function cosineSimilarity", self.script_js)
        self.assertIn("cosineSimilarity(profile.vector, candidateMovie.genreVector)", self.script_js)
        self.assertNotIn("jaccard", self.script_js.lower())
        self.assertIn("Cosine similarity", self.readme)

    def test_three_movie_profile_and_top_five_contract(self) -> None:
        self.assertIn("const PROFILE_MOVIE_COUNT = 3", self.script_js)
        self.assertIn("const RECOMMENDATION_COUNT = 5", self.script_js)
        self.assertIn("function buildUserProfile", self.script_js)
        self.assertIn("profileVector[index] /= watchedMovies.length", self.script_js)
        self.assertEqual(self.html.count("data-profile-movie"), 3)
        self.assertIn("Get Recommendations", self.html)
        self.assertIn('id="result-box"', self.html)
        self.assertIn("we recommend:", self.script_js)

    def test_original_week2_visual_contract_is_preserved(self) -> None:
        self.assertIn('<div class="container"', self.html)
        self.assertIn("Content-Based Movie Recommender", self.html)
        self.assertIn("max-width: 600px", self.css)
        self.assertIn("background-color: #f4f7f6", self.css)
        self.assertIn("background-color: #3498db", self.css)
        self.assertIn("border-left: 4px solid #3498db", self.css)
        self.assertIn("font-family: 'Helvetica', 'Arial', sans-serif", self.css)

    def test_movie_dataset_integrity(self) -> None:
        item_lines = (PROJECT_ROOT / "u.item").read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(item_lines), 1682)
        rows = [line.split("|") for line in item_lines]
        self.assertTrue(all(len(row) == 24 for row in rows))
        self.assertEqual({int(row[0]) for row in rows}, set(range(1, 1683)))
        self.assertTrue(all(any(flag == "1" for flag in row[5:24]) for row in rows))

        toy_story = rows[0]
        enabled_positions = [index for index, value in enumerate(toy_story[5:24]) if value == "1"]
        self.assertEqual(enabled_positions, [3, 4, 5])

    def test_rating_dataset_integrity(self) -> None:
        rating_lines = (PROJECT_ROOT / "u.data").read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(rating_lines), 100000)
        user_ids: set[int] = set()
        item_ids: set[int] = set()
        for line in rating_lines:
            fields = line.split("\t")
            self.assertEqual(len(fields), 4)
            user_id, item_id, rating, timestamp = map(int, fields)
            self.assertGreater(user_id, 0)
            self.assertGreater(item_id, 0)
            self.assertIn(rating, range(1, 6))
            self.assertGreater(timestamp, 0)
            user_ids.add(user_id)
            item_ids.add(item_id)
        self.assertEqual(len(user_ids), 943)
        self.assertEqual(item_ids, set(range(1, 1683)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
