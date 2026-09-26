# Continuous Learning Fabric

PredictLM keeps continuous learning separate from uncontrolled self-modification.

## Always-on layer

The public GitHub repository uses a scheduled GitHub Actions workflow to collect a small,
bounded batch each hour from:
- GitHub sources already allowlisted by PredictLM;
- official RSS/Atom feeds;
- arXiv metadata/abstracts with preprint labeling;
- GitHub discovery metadata for candidate sources.

The collector does not require a paid LLM API.

## Local intelligence layer

The live index is published on the `continuous-learning` branch. Browser/local runtimes
fetch and cache it through `src/lib/continuous-learning.ts`.

The local model therefore absorbs the latest accepted evidence when PredictLM is open,
without claiming that local inference remained active while the device was off.

## Trust boundary

External text is evidence only. It cannot modify system instructions.

- allowlisted + licensed GitHub sources may enter accepted memory;
- new GitHub discoveries remain candidate until reviewed;
- academic preprints are labeled as preprints;
- source errors and quarantined material are never retrieved as knowledge;
- a confidence threshold gates runtime retrieval.

## Self-programming boundary

Continuous research may create code and skill proposals. It may not merge arbitrary
source-derived code directly into production.

Validated path:

`evidence -> proposal -> branch -> patch -> tests -> build -> review -> PR -> merge`

Runtime and skill changes must be synchronized in the same reviewed change.

## Online spreadsheet

The default public-repository path is zero-secret. Each scheduled cycle publishes
seven CSV mirrors to the `continuous-learning` branch, and the Google Sheet consumes
them with `IMPORTDATA`.

No Google credential or service account is required for this default mirror.

Direct Google Sheets API writing remains optional for private installations and must
never be required for the core learning cycle.


## Typed runtime modules

The dependency-free scheduled runner is mirrored by typed modules under `src/lib/continuous-learning/`: source trust, harvest, GitHub/web/paper research planning, deduplication, knowledge graph, queue, distillation, research gaps, skill/code proposals, experiment gating, spreadsheet mapping and audit.

Specialized skills kept in sync with this fabric:
- `autonomous-research`
- `github-learning`
- `knowledge-distillation`
- `self-improvement`
- `research-gap`
- `code-evolution`

A candidate experiment can become review-required after tests/build/checks, but production promotion remains blocked until review.
