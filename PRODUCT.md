# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the project owner doing ongoing PES 2021 reverse engineering and AOT recompilation. They coordinate research and recordkeeping on a MacBook Air M1, and use Windows x64 for authoritative game execution and debugging.

## Product Purpose

The dashboard organizes observed behavior, reverse-engineering evidence, portable native implementation work, and verification status. Success means being able to find the supporting evidence, understand what is established versus uncertain, and choose a useful next subsystem or function to investigate.

## Positioning

This is a project-specific research and execution dashboard grounded in the repository's findings, probes, tests, milestones, toolchain, and open questions. It connects observations from the Windows target to readable, buildable portable native C++ reconstruction and validation work.

## Operating Context

Research notes and project coordination live on a MacBook Air M1. Windows x64 is authoritative for running and debugging the original game and collecting runtime observations. Work moves through lift, build, and verify cycles, with evidence recorded alongside confidence and platform context.

## Capabilities and Constraints

The dashboard tracks observed-block coverage, lift/build/verify cycles, lane traces, reconstruction proofs of concept, subsystem targets, differential-validation results, native host and platform gaps, evidence, notes, and investigation priorities. The implementation goal is readable, buildable portable native C++. Interpreter, JIT, and Wine fallbacks are out of scope.

## Evidence on Hand

The repository includes `data.json` generated from project research, `README.md`, format notes, milestone and open-question records, and the source implementation in `index.html`, `dashboard.js`, `base.css`, and `tokens.css`. Dashboard summaries should remain traceable to repository evidence; derived summaries must be identified as derived.

## Product Principles

- Keep observation, inference, and implementation claims distinguishable.
- Preserve the Windows x64 target as the authority for original-game runtime behavior.
- Make MacBook Air M1 coordination and portable host work visible without conflating them with target execution.
- Preserve confidence labels and links to evidence when summarizing findings.
- Keep the reconstruction readable, buildable, portable native C++ without interpreter, JIT, or Wine fallback.
