# PES 2021 Reconstruction Project — Development Progress

**Status as of 15 November 2026**  
**Project stage:** Active research and development; not a playable standalone football game  
**Primary reference:** *PES 2021 Personal Reverse-Engineering, Modding and Porting Workflow (v3)*, dated 2 November 2026, supplemented by the developer's subsequent progress report and testing clarification.

> **Scope of this report:** This is a development-status report, not a release announcement. Reported achievements have not been independently re-run for this document. A successful offline comparison against captured game states is not the same as executing replacement code inside the live game.

## Vision

The long-term goal is a readable, portable and extensible football game built around independently implemented systems informed by PES 2021. The intention is to make it possible for a community to expand the simulation, management systems, competitions and other gameplay over time.

The nearer-term approach uses the original game as a behavioural reference and, where needed, a user's own installation as a source of game data. Full independence from the original executable and proprietary data is a possible distant goal, **not a current capability**.

The current workflow is private and local. It does not authorize distributing Konami executable code, assets, decompiler output or other derived material. Any future public release, including source or patches, will require a separate provenance and licensing review.

## Architecture: three complementary tracks

| Track | Purpose | Current picture |
| --- | --- | --- |
| **A — Data and formats** | Understand game archives, databases, textures, models and competition data | Initial format readers and texture display working; further formats remain |
| **B — Original-game reference and reconstruction** | Analyse game behaviour, capture evidence, implement portable logic and compare outputs | Significant offline behavioural reconstruction; no live replacement hook demonstrated |
| **C — Portable engine host** | Run independent C++ game systems on macOS, iOS/iPadOS and eventually other platforms | macOS host and initial rendering demonstrated; iPad runtime unconfirmed |

The project uses **C++20 and CMake** for portable code, **SDL3** for the planned cross-platform host, and a planned **Lua 5.4** scripting layer. Portable game logic lives separately from Windows-specific hooks and game-memory adapters. This separation is intended to let contributors improve systems without needing to work directly with machine-code addresses.

The intended platform order is macOS, iPadOS/iOS, then Linux, Android and Windows. This is a target roadmap, not a list of completed ports.

## Key progress

### 1. Master League and competition simulation

**Status: Implemented to a substantial degree; verified offline for recorded scenarios.**

Recent work has concentrated on the competition engine and Master League systems. According to the latest development report:

- The independent model builds a full season and continues into subsequent seasons.
- Competition construction and season transitions have been compared against records captured from the original game.
- The model can run a season using its own random decisions; one reported free-run check completed **8,022 matches**. This establishes that the model can progress through that run, **not** that those results match PES 2021.
- Work has extended into **finances, contracts, season switching and player events**.
- Portable implementations also exist for parts of **fatigue, stamina and injuries**.

The original v3 plan identifies season building, fixture generation, competition registration, regulation parsing, promotion and relegation as target subsystems. The latest update describes the competition engine as substantially implemented, but does not provide a separate test inventory or completion claim for every branch of every subsystem.

**Important limitation:** The reported comparisons cover approximately **one and a half seasons of a Liverpool career**, including **two season transitions**. They do not establish correctness across all clubs, leagues, exceptional rules or longer careers.

### 2. Portable host and asset loading

**Status: Initial macOS functionality demonstrated.**

- A basic portable host has been built and run on **macOS**.
- A **PES kit texture was displayed on macOS on 3 November 2026**, demonstrating an initial asset-loading and rendering path.
- An **iPad build branch exists**, but there is no confirmed report that the host has run successfully on the developer's iPad.
- Game database tables can be loaded at the file level. The current model still uses game snapshots rather than loading all of its own player, team and competition types directly from those tables.

Model rendering, animation playback, audio, and a playable match remain future work.

### 3. Reverse-engineering research and tools

**Status: Significant supporting infrastructure; some discovery tasks incomplete.**

The existing research workflow includes:

- A pinned PES 2021 PC executable version and hash for reproducible analysis.
- Ghidra/IDA research material, function discovery and naming tools, and a database of names, cross-build matches, evidence and confidence levels.
- Research into ordinary game functions relocated into the executable's `.impdata` section, with tooling intended to follow relevant jump stubs.
- Hardware-breakpoint and debugger-based capture tools for recording behaviour from the original Windows game.
- Cross-build research involving PES 2020, PES 2015, a PS4 executable and Football Life research.
- Comparison and regression-test tooling retained from earlier experiments.

The function naming imports and relocated-code classification have progressed, but the complete call-target discovery sweep has **not** been reported as fully merged. Football Life executable matching is blocked because the required executable is not available on the development machine. Several compatibility checks and the PES 2020 reference image also remain outstanding.

### 4. Earlier static recompilation experiment

**Status: Stopped; useful research retained.**

A previous effort, `pesrecomp`, attempted to recompile and boot the PC executable from its entry point. Over roughly three weeks, the effort accumulated **218 commits** and approximately **142 GB** of local data. The latest clean run reached **438 distinct `.trace` blocks** of game code, fewer than an earlier baseline of 482; most recorded blocks were in the protector-related `.impdata` region.

That route did not reach the intended gameplay and competition work. The boot-from-entry approach was therefore stopped, while useful analysis tools, reconstructions, tests and cross-build results were preserved. **The current project does not depend on restarting whole-executable static recompilation.**

## How behavioural verification works

The project uses an **offline capture-and-replay approach**:

1. **Capture on the Windows VM:** A debugger attached to the original, unmodified game saves a copy of game memory at the start of each in-game day. Selected random rolls or lists are also logged.
2. **Replay on the Mac:** The portable model loads a captured starting state, advances one day and is compared with the next captured state.
3. **Control randomness where available:** Logged original-game random decisions are supplied to the model to enable exact comparisons of the corresponding rules.
4. **Classify the evidence:** A match against a recorded state supports correctness **for that recorded scenario and the fields actually compared**; it does not establish complete equivalence.

### Three distinct levels of evidence

| Evidence type | What it demonstrates | What it does **not** demonstrate |
| --- | --- | --- |
| **Recorded-state replay** | The reconstructed rules reproduce selected original-game outcomes from captured starting conditions | Behaviour in unrecorded situations or untested fields |
| **Partial replay with supplied subsequent values** | Specific rules work when external or otherwise unavailable results are supplied | That the model independently produced those supplied values |
| **Free-running simulation** | The independent model can progress without the original game supplying every outcome | Fidelity to what PES 2021 would have produced |

Some replay comparisons intentionally supply match results, lineups, transfers or squad values from a subsequent snapshot because the model does not yet generate those values itself. These tests are useful but **must not be counted as fully independent end-to-end predictions**.

There is **no reported live test** in which the portable C++ implementation is hooked into PES 2021 and replaces an original game function. This is a remaining gap against the original workflow's stricter milestone definitions.

### Current coverage limits

- Captures currently come from one Liverpool career, approximately 1.5 seasons long.
- Two season transitions are included.
- Some unusual cases, such as particular league playoff formats, contract-expiry dates or transfer-list states, have only been tested using constructed scenarios.
- Free-run results are checked for completion and plausibility, not compared to original-game outcomes.
- This document does not claim a quantified percentage of code coverage, rule coverage or behavioural fidelity.

## Milestone tracker

The following preserves the numbering and acceptance criteria of workflow v3. **“Partial” is intentional:** a working implementation does not automatically satisfy every original verification or platform requirement.

| # | Milestone | Status as reported 15 Nov 2026 | Remaining acceptance gap |
| ---: | --- | --- | --- |
| 1 | Setup and pinned reference | **Partial** | Three checks previously open; PES 2020 image unavailable; other setup checks not reconfirmed |
| 2 | Host skeleton on Mac and iPad | **Partial** | Mac runs; successful iPad run unconfirmed |
| 3 | Football Life address matching | **Blocked** | Required Football Life executable unavailable locally |
| 4 | First game texture on screen | **Partial** | Kit texture displayed on Mac on 3 Nov; iPad side unconfirmed |
| 5 | Function seeds and discovery | **Partial** | Names imported and relocated code classified; complete sweep not confirmed merged |
| 6 | First portable referee function hooked into PC game | **Not met** | Referee code exists, but no live replacement hook demonstrated |
| 7 | First referee logic verified in portable host against recorded PC cases | **Partial** | Port passes tests, but not confirmed against recorded live cases |
| 8 | Database loaded into host-owned game types | **Partial** | File-level tables load; model still relies on snapshots |
| 9 | Competition engine, verified on PC and running a season on Mac | **Substantially implemented; not fully met by strict wording** | Full-season and season-transition model works; offline snapshot comparisons exist, but no live PC replacement verification |
| 10 | Models and animation | **Not started** | FMDL/model display and animation playback |
| 11 | First playable kick-about | **Not started** | Pitch, ball, 22 players and independent match simulation |
| 12 | Match logic integrated into host matches | **Not started as an integrated milestone** | Fatigue/stamina/injury components exist, but host match integration awaits milestone 11 |
| 13 | Linux and Android builds | **Not started** | Platform builds and tests |
| 14 | Expand reconstructed subsystems | **In progress** | Master League finances, contracts, season transitions and player events are being developed; scope remains open |

## Current priorities and open work

These are **existing gaps in the v3 plan**, not a proposed replacement strategy:

1. **Increase behavioural coverage:** Capture more careers, clubs, leagues, unusual regulations and edge cases; label comparisons by the inputs actually supplied and fields independently produced.
2. **Complete a live hook-and-replace test:** Demonstrate at least one portable subsystem executing in place of original game logic, when that is needed to satisfy the existing PC-verification milestone.
3. **Finish host-owned database integration:** Read player, team and competition records into the portable model rather than depending on memory snapshots.
4. **Bring up the iPad host:** Verify an actual device build and asset display.
5. **Advance visual milestones:** Decode and render models, play animation clips, and eventually build the first basic match simulation.
6. **Preserve reproducibility:** Maintain pinned versions, capture metadata, confidence levels, test fixtures and clear distinctions between exact replay, partial replay and free simulation.

The real-time football match engine remains a major unimplemented component. The current achievements primarily concern the management, competition, data and infrastructure sides of the project.

## Contributing and eventual publication

The long-term intention is a codebase that other developers can understand, build and extend. In particular, the project aims to separate:

- **Original, portable implementations** of game rules and engine functionality.
- **Private research and evidence** derived from proprietary binaries or captured game states.
- **Third-party tools and code**, subject to their own licences.
- **User-supplied proprietary game data**, which is not included in the project.

**No public contribution or redistribution process is established by this report.** The underlying v3 workflow explicitly describes a private project and forbids distributing Konami code, assets, decompiler output or derived tooling. Before opening a public repository or accepting contributions, the maintainer should decide what can be published, audit provenance and licences, and ensure no private captures, binaries or proprietary assets are committed.

## Summary

The project has progressed beyond executable analysis into **working portable code for significant parts of PES 2021's competition and Master League behaviour**. An independent season model runs on macOS and has been compared offline against captured original-game states; a macOS host can also display an extracted game texture.

The evidence remains limited to recorded scenarios, and no live code-replacement hook, iPad runtime, rendered player animation or playable match has yet been demonstrated. The current direction remains the three-track v3 workflow: **reconstruct and verify game systems, load game data into a portable host, and gradually build toward a deeper, extensible football game**.
