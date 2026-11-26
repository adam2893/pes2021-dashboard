# PES 2021 research dashboard

This is a **static** GitHub Pages site. The visual interface is intentionally framework-free and loads the generated `summary.json` and `data.json`.

## Development

```sh
python3 -m http.server 8000
node scripts/validate.mjs
```

Open `http://localhost:8000/` in a browser. No build step is required.

## Data contract

- `summary.json`: headline estimates, descriptions, checks, timeline and reported counts.
- `data.json`: published function, port, data-seed and research-finding records.
- `index.html`: retains the generator-managed `<!--SUMMARY-->` / `<!--/SUMMARY-->` embedded JSON block for the existing snapshot-publishing workflow. Its JSON must be identical to `summary.json`.
- `dashboard.js`: summaries, segmented estimate bars and reference checks.
- `research.js`: maps published function records to a clickable status matrix; searches, filters and paginates the wider research database.
- `dashboard.css`: shared design tokens and responsive layout.

**Interpretation:** a named address is not a reconstructed implementation. `ports[].fidelity === "exact"` is a classification in the published inventory and does not, by itself, prove independent differential verification. The research function map is a **published subset**, not percentage coverage of the executable. Subsystem categories are heuristic and inferred from names or implementation paths. Progress percentages in `summary.json` are explicitly estimates, not measured coverage.

## Publishing

The existing GitHub Pages deployment runs `node scripts/validate.mjs` before uploading the site. A separate PR check runs the same validator. Data updates should update both the summary file and its embedded copy. The dashboard contains no externally hosted fonts, JS libraries or trackers.
