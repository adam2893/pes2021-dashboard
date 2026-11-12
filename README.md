# PES 2021 RE Dashboard

Interactive dashboard for the PES 2021 reverse-engineering and portable engine project.

## Features

- **Overview**: Project stats, recent activity timeline
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

The dashboard reads from:
- `FINDINGS.md` - Running notebook with dated entries
- `db/seeds/*.tsv` - Function naming seeds with confidence
- `db/functions.sqlite` - Naming database (233,322 functions)
- `CMakeLists.txt` - Test definitions and build targets
- `tests/behaviour/probes.tsv` - Hardware probe definitions
- `tests/golden/` - Golden test hashes
- `pes-workflow-guide-v3.md` - Milestones and open questions

## Deployment

Automatic deployment to GitHub Pages on push to `main` via `.github/workflows/deploy-pages.yml`.

The workflow:
1. Checks out the repo
2. Runs `python3 docs/build_data.py` to generate `docs/data.json`
3. Uploads the `docs/` folder as a Pages artifact
4. Deploys to GitHub Pages

## Project Constraints (Preserved)

- **Goal**: Readable, buildable portable native C++ with no interpreter, JIT, or Wine fallback
- **Three Tracks**: A (Data), B (Oracle/PC Hooks), C (Portable Host)
- **Platform Order**: macOS → iPadOS/iOS → Linux → Android → Windows
- **Fidelity Tiers**: exact / behavioural / free (decided per subsystem)
- **Evidence-based**: confirmed / probable / guess with explicit evidence
- **Offline only**: No online/account features

## Keyboard Shortcuts

- `/` - Focus global search
- `1-8` - Switch views (1=Overview, 2=Findings, 3=Naming, 4=Tests, 5=Milestones, 6=Workflow, 7=Platforms, 8=Questions)
- `Escape` - Clear search

## Browser Support

Modern browsers with ES modules support (Chrome 89+, Firefox 90+, Safari 15+, Edge 89+).