# DEEP RESEARCH TREE

## Goal

Turn research into a bounded evidence tree instead of one broad search.

## Modes

- Fast: one focused query and a small source budget.
- Balanced: main query + official/evidence + limitations/counterpoints.
- Comprehensive: adds methods/data and alternative comparisons, with bounded recursion.

## Runtime contract

PLAN QUERIES → SEARCH IN BATCHES → DEDUP URL/HOST → SCORE SOURCES → IDENTIFY GAPS → DEEPEN ONLY IF NEEDED → SYNTHESIZE → CITE.

Rules:
- queries should be non-overlapping;
- visited URLs are deduplicated;
- one failed branch does not erase successful branches;
- timeout means partial evidence, not zero evidence;
- source diversity matters more than raw result count;
- high-stakes claims prefer primary/official/academic sources;
- catalogs such as awesome lists are discovery only, not evidence;
- stop when another branch adds no material evidence.

Patterns adapted from deep-research repositories supplied by the user, with license gating in the source registry.
