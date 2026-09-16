# Random Lunch Generator

A polished, responsive, accessible static GitHub Pages app that randomly picks a lunch option from 12 realistic choices using native Unicode food emojis with no external dependencies.

## Features

- 12 realistic lunch options with native Unicode food emojis
- Mood preference filter: Any / Light / Comfort
- Maximum time filter: Any / 20 minutes
- Accessible: aria-live results, keyboard navigation, focus-visible styling
- Reduced-motion support via `prefers-reduced-motion`
- No external dependencies, no CDN, no framework
- Deterministic selection logic testable with JavaScriptCore

## Local Run

Serve the files with any static HTTP server from the `homework/a01/` directory:

```bash
cd homework/a01
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

Or simply open `index.html` directly in a browser.

## Testing

All commands are run from the **opencode-lesson project root**.

### JavaScriptCore tests (from opencode-lesson project root)

The `load('app.js')` call in `tests/run-tests.js` is cwd-relative. The `save_evidence.py` script handles this by running jsc with `cwd=homework/a01/`. To run directly from the project root:

```bash
cd homework/a01 && /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/run-tests.js
```

### Static analysis tests (from opencode-lesson project root)

```bash
.venv/bin/python homework/a01/tests/check_static.py
```

### HTTP smoke tests (from opencode-lesson project root)

```bash
.venv/bin/python homework/a01/tests/http_smoke.py
```

### Save all test outputs to evidence

```bash
.venv/bin/python homework/a01/tests/save_evidence.py
```

This runs JS tests, static checks, and HTTP smoke tests, saving results to `homework/a01/evidence/test-run.txt`.

## GitHub Pages Deployment

Deployment is pending the student account step. To deploy:

1. Create a new repository on GitHub.
2. Push `homework/a01/` contents (index.html, styles.css, app.js) to the repository's main branch.
3. Go to Settings > Pages in the repository.
4. Set Source to "Deploy from a branch", branch to `main`, folder `/ (root)`.
5. Save. Your app will be available at `https://<username>.github.io/<repo>/`.

## License

MIT
