---
name: biointelligence
description: Cross-species brain-inspired learning fabric for PredictLM. Fuses data-grounded motifs from human, macaque, fly, C. elegans, mouse and zebrafish with app-wide experience while preserving scientific provenance and operator control.
metadata:
  version: "1.0.0"
  runtime: "browser + simulation + continuous-learning"
---

# BioIntelligence Fabric

## Goal

Use comparative neuroscience to improve software learning, attention, memory, inhibition, prediction and action selection across PredictLM.

This is **brain-inspired computation**, not biological tissue, a wetware biocomputer, or proof that the app contains an animal mind.

## Species ensemble

- **Human / H01** — partial human cortical connectomics where directly measured.
- **Macaque** — cortical atlas, spatial transcriptomics, PFC projectomes and claustrum connectivity priors.
- **Drosophila / FlyWire** — brain-wide compact circuit motifs, salience and sensorimotor routing.
- **C. elegans** — whole-animal anatomical connectome for compact recurrent sensor→interneuron→motor organization.
- **Mouse / MICrONS + Allen** — dense structural/functional visual-cortex data plus anatomical atlas framework; not a complete mouse-brain connectome.
- **Larval zebrafish** — whole-brain EM resource and reconstructed circuits; not every neuron/synapse is fully proofread or functionally known.

Each species keeps a separate provenance/scope. Missing biology remains **unknown**, not fabricated.

## App-wide learning loop

Every surface can emit a sanitized learning event:

`UI / route / API / Build / Research / Media / Legal / Simulation / Cognitive Lab`
→ normalize + redact
→ per-species controller signals
→ weighted cross-species fusion
→ learning priority + disagreement
→ Digital Brain update
→ optional research gap
→ continuous-learning evidence
→ proposal/test/review path for durable code changes.

The global observer records behavior/outcomes, not private content.

Allowed event fields include:
- route/surface;
- button/control label;
- form submission occurred;
- API path without query string;
- status code;
- latency;
- success/failure;
- simulation state labels;
- counts and coarse Studio transitions.

Never capture into this ledger:
- form values;
- passwords;
- tokens, cookies or authorization headers;
- full user messages;
- source-file contents;
- uploaded document contents;
- hidden credentials.

## Learning rule

A disagreement between species controllers is useful signal. It can raise research priority or trigger comparison/replay; it is never treated as biological voting or evidence of consciousness.

Examples:
- Fly/C. elegans emphasize fast sensor→action loops.
- Mouse/zebrafish emphasize sensory organization and predictive response.
- Human/macaque emphasize working memory, executive integration and longer-horizon control.

The fusion result is a software policy signal. Actual task correctness remains grounded in tests, evidence and user intent.

## Simulation integration

Life Simulation, MiroFish and Cognitive Organism outcomes enter the same learning ledger.

Simulation outputs may train:
- which actions reduced prediction error;
- which counterfactuals exposed a fragile decision;
- which world states led to failure;
- which agent policies were robust across scenarios.

Simulation output is synthetic evidence and must remain distinguishable from measured biological data and real-world observations.

## Scientific truth boundary

Always preserve four labels:
1. **measured/published data**
2. **derived controller**
3. **simulated runtime state**
4. **unresolved/unknown**

Never call software telemetry an animal's real thought, memory, emotion or consciousness.

## Implementation

- `src/lib/biointelligence-fabric.ts`
- `src/lib/app-learning.ts`
- `src/components/AppLearningObserver.tsx`
- `src/lib/digital-brain.ts`
- `src/lib/cognitive/*`
- `src/lib/life-simulation-engine.ts`
- `src/lib/simulation/mirofish-fabric.ts`
- `config/continuous-learning.json`
- `config/external-learning-sources.json`
