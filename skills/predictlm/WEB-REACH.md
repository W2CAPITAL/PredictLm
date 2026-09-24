# Web Reach

## Goal

Expand research without turning retrieval into uncontrolled scraping.

## Active server adapters

### Firecrawl
Primary structured search when `FIRECRAWL_API_KEY` is configured.

### Apify
Optional supplemental dataset bridge:
- `APIFY_DATASET_ID` reads a dataset directly;
- `APIFY_RUN_ID` resolves its default dataset;
- `APIFY_API_TOKEN` remains server-side.

Apify results still pass through PredictLM source quality and topic relevance gates.

### Free fallback
Wikipedia + DuckDuckGo + GitHub search remain available when external research APIs are not configured or fail.

## Architecture references

- Agent-Reach: agent tool discovery/reach patterns.
- FastChat: multi-model serving/evaluation patterns.
- Open Lovable: Firecrawl → analysis → React/Next generation → sandbox/review patterns.
- Freebuff: coding/build/research agent coordination.

## Social bridges

Twikit, Xquik and similar social adapters are external opt-in bridges only. They must not become a silent dependency of normal research.

Rules:
- public research only unless an explicitly authorized connector is configured;
- do not collect account passwords or authentication exports;
- preserve source provenance;
- platform or legal restrictions override convenience;
- failure of a social bridge falls back to normal research rather than fabricating results.

## Build integration

When a user supplies a website reference:
FETCH/SEARCH → STRUCTURE → REQUIREMENTS → REACT/NEXT BUILD → VALIDATE → REVIEW → PACKAGE.

Do not claim a cloned site is production-ready until navigation, forms, data behavior, responsive states and build checks actually pass.
