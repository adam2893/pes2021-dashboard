# PES 2021 RE Dashboard

Interactive dashboard for the PES 2021 reverse-engineering and portable engine project.

## Features

- **Overview**: Project stats, recent activity timeline
- **Coverage & Cycles**: Named addresses, port counts, signature and byte checks, observed-block coverage gaps, differential results, subsystem estimates, and searchable evidence
- **Findings**: Searchable, filterable findings notebook (Track B/C)
- **Naming DB**: Browse all seeded function names with confidence levels, evidence, and source files
- **Tests**: Unit, golden, behaviour, and host integration tests organized by category
- **Milestones**: Visual progress tracking across all three tracks (A/B/C)
- **Workflow**: Subsystem picker for choosing the next investigation target with dependencies and suggested steps
- **Platforms**: Clear separation between MacBook Air M1 (coordination) and Windows x64 VM (authoritative execution)
- **Open Questions**: Track blocking/unresolved investigations

## Local Development

```bash
cd pes2021
python3 docs/build_data.py
# Open docs/index.html in a browser (serve via local server for ES modules)
```

### Serve locally

```bash
cd pes2021/docs
python3 -m http.server 8000
# Open http://localhost:8000
```

## Data Sources

The dashboard reads the current aggregate project snapshot from `summary.json` and searchable detailed entries from `data.json`. The summary records 652 named function addresses, 76 portable port records, 115/115 unique signature lookups, 98/140 cross-version function-start address overlaps, and 42/42 bytes in one narrow version comparison. Those are distinct checks, not an aggregate count of AOT-equivalent functions or bytes.

## Deployment

Automatic deployment to GitHub Pages on push to `main` via `.github/workflows/deploy-pages.yml`.

The workflow checks out the repository, uploads the static dashboard files as a Pages artifact, and deploys them to GitHub Pages. Refresh `summary.json` from the current PES project summary before publishing updated metrics.

## Project Constraints (Preserved)

- **Goal**: Readable, buildable portable native C++ with no interpreter, JIT, or Wine fallback
- **Three Tracks**: A (Data), B (Oracle/PC Hooks), C (Portable Host)
- **Platform Order**: macOS → iPadOS/iOS → Linux → Android → Windows
- **Fidelity Tiers**: exact / behavioural / free (decided per subsystem)
- **Evidence-based**: confirmed / probable / guess with explicit evidence
- **Offline only**: No online/account features

## Keyboard Shortcuts

- `/` - Focus global search
- `Escape` - Clear search

## Browser Support

Modern browsers with ES modules support (Chrome 89+, Firefox 90+, Safari 15+, Edge 89+).
