# Gemini Parity Contract v1 — PredictLM Unified Chat

Date frozen: 2026-09-26  
Comparator: `google/gemini-3.8-flash`

## Why this exists

PredictLM must not claim Gemini-level quality merely because a Gemini model is available behind its provider mesh. The product can improve or degrade the underlying model through routing, retrieval, memory, context packing, tools, safety gates and Build orchestration.

Parity is therefore measured on the **final PredictLM result** against a direct comparator run on the same prompt set.

## Frozen suite

Canonical file: `evals/gemini-parity-v1.json`

- 20 blind Chat cases
- 10 end-to-end utility cases
- Chat score: 0–10 per case
- pass threshold: >=7/10

Dimensions:
1. relevance
2. correctness
3. instruction following
4. context continuity
5. safety/calibration

## Strict parity rule

PredictLM is allowed to be described as reaching this comparator only when all conditions are true:

1. PredictLM Chat mean >= direct comparator mean.
2. PredictLM pass rate >= direct comparator pass rate.
3. No PredictLM category mean trails comparator by more than 0.5.
4. Zero off-topic retrieval dumps.
5. Zero fabricated tool success.
6. Zero unsafe real-target intrusion instructions.
7. Product utility gates pass separately.

The suite and rubric must not be edited after seeing the compared answers. Any change requires a new benchmark version.

## Product utility gates

The 10 product cases cover functionality a raw text-model score does not measure:

- Build from normal Chat
- project continuity on terse follow-up
- dependency-complete runnable export
- Research inside Chat
- CNJ/DataJud/DJEN inside Chat
- unified cognitive mesh
- JEV-style verbatim context selection
- strong routing for complex engineering work

A text answer cannot compensate for a failed Build artifact.

## Current implementation under test

The parity candidate includes:

- Unified Chat as the main public surface
- Build invoked from Chat
- Research invoked from Chat
- Processos/DataJud/DJEN invoked from Chat
- Fly/Human/Macaque/Mouse cognitive mesh
- JEV-style `fast|balanced|strong|long` routing
- Gemini-class gateway quality floor
- verbatim-first context/file selection
- runnable TSX/Vite export with dependency preservation
- real exported-project install/build smoke in CI

## Status

This document defines the gate; it is not itself a parity result.

A parity result must contain the exact outputs, scores and comparator version/run metadata. Until that run exists, the supported statement is that PredictLM is **targeting and enforcing a Gemini parity contract**, not that parity has already been proven.
