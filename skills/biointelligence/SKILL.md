---
name: biointelligence
description: Unified PredictLM BioAI: one persistent local intelligence combining eight comparative brain/connectome references, a synthetic spiking reservoir, app-wide learning, memory and optional authorized wetware I/O.
metadata:
  version: "2.0.0"
  runtime: "browser + app-wide learning + voxel simulation + optional wetware"
---

# PredictLM BioAI v2

## One BioAI, not isolated brains

PredictLM uses **one persistent BioAI identity** across:
- Chat;
- Build and code review;
- Research;
- Imagine/image generation;
- video generation and continuity;
- Processos/DataJud/DJEN synthesis;
- app-wide auto-learning;
- self-improvement proposals;
- persistent local memory;
- Life Simulation / Cognitive Lab;
- Voxel World / Minecraft-class sandbox.

Species-specific controllers remain inspectable internal lenses, but they feed the same BioAI state and memory.

Core:
- `src/lib/bioai.ts`
- `src/lib/biointelligence-fabric.ts`
- `src/lib/bio-reservoir.ts`
- `src/lib/app-learning.ts`

## Eight comparative biological references

1. **Human / H01** — partial human cortex at synaptic resolution; not a whole human connectome.
2. **Macaque** — cortical atlas, spatial transcriptomics, PFC projectomes and claustrum priors; primate proxy only.
3. **Drosophila / FlyWire + MaleCNS** — brain/CNS-wide circuit motifs, salience and sensorimotor/action-selection organization.
4. **C. elegans** — whole-animal anatomical connectome for compact recurrent sensor→interneuron→motor organization.
5. **Mouse / MICrONS + Allen** — dense structural+functional visual-cortex data plus anatomical atlas; not a whole mouse brain.
6. **Larval zebrafish** — whole-brain EM resource and reconstructed/validated circuits; not every neuron/synapse is fully proofread or functionally known.
7. **Ciona intestinalis** — published larval CNS connectome (177 CNS neurons in the mapped specimen), useful as a compact chordate sensory→motor reference.
8. **Platynereis dumerilii** — published whole-body larval synaptic connectome, useful for distributed/segmental coordination and effector control.

Each reference keeps its own source, scope and evidence class. Missing biology remains **unknown**, never synthesized as measured fact.

## Three-layer BioAI architecture

### 1. Comparative controller
Each app event produces separate species signals:
- attention;
- novelty;
- memory;
- inhibition;
- action;
- sensory emphasis;
- social emphasis;
- prediction.

The weighted fusion produces learning priority, disagreement and research-gap signals.

### 2. Local synthetic bio-reservoir
`src/lib/bio-reservoir.ts` provides a small deterministic spiking-inspired recurrent reservoir:
- 48 local units;
- membrane state + decaying traces;
- firing rate;
- synchrony;
- prediction error;
- plasticity;
- novelty boost.

It runs without API, database, Supabase, GPU or external hardware. It is **synthetic software**, not a biological organoid.

Prediction error/novelty from this reservoir modulates the unified BioAI event before durable memory/research prioritization.

### 3. Optional wetware bridge
`src/lib/wetware-adapters.ts` defines optional adapters for:
- Cortical Labs CL1;
- FinalSpark Neuroplatform/MEA.

Rules:
- disabled unless explicitly enabled/configured;
- BioAI remains fully functional without them;
- measured electrode input is labeled measured;
- decoder/controller output is labeled derived;
- software response remains simulated;
- compact features/fingerprints are preferred over storing raw high-volume recordings;
- electrode activity is never described as readable thought, autobiographical memory or proof of consciousness.

Cortical Labs SDK material under CC BY-NC is **reference-only** for the commercial core. FinalSpark `LiveMEA_ts` is MIT and can inform an optional adapter contract.

## Persistent local memory without paid storage

`src/lib/bioai.ts` keeps a bounded local memory in browser storage.

Memory kinds:
- episode;
- skill;
- world;
- media;
- legal;
- learning;
- preference.

The memory layer stores compact sanitized summaries and tags, not:
- passwords;
- tokens;
- cookies/authorization headers;
- complete file contents;
- complete user message bodies from transversal telemetry;
- raw electrophysiology.

If storage becomes constrained, the BioAI compacts to the most salient recent memories.

## App-wide learning loop

`UI / route / API / Build / Research / Media / Processos / Simulation`
→ sanitize event
→ synthetic reservoir
→ eight-species fusion
→ prediction error + learning priority
→ unified BioAI memory
→ Digital Brain / capability context
→ research gap or improvement candidate
→ proposal
→ tests/build/security/review
→ PR.

The root `AppLearningObserver` learns from outcomes without collecting field values.

Repeated failures/high-priority disagreement become **proposal-only** auto-programming candidates. They do not silently modify production.

## Voxel embodiment

The same BioAI is embodied as an autonomous player in the Minecraft-class Voxel World.

Files:
- `src/lib/simulation/bioai-voxel-agent.ts`
- `src/components/VoxelFirstPersonViewport.tsx`
- `src/components/MinecraftSimulationPanel.tsx`

The BioAI can:
- explore effectively unbounded procedural chunks;
- collect wood/stone/iron;
- eat;
- craft;
- fight when equipped and healthy;
- build a simple shelter;
- discover new chunks/biomes;
- maintain world memory.

The default native view is first-person WebGL with pointer-lock + WASD; isometric and optional Unity WebGL views remain available.

## Image/video/process integration

- image prompts receive BioAI sensory/identity-consistency directives;
- video prompts receive BioAI continuity/prediction directives;
- process synthesis uses BioAI uncertainty/inhibition to deepen evidence review when public sources disagree/fail;
- Build/Research/Simulation/Browser and other capability-fusion surfaces automatically receive the same BioAI directives.

## Scientific truth contract

Keep four labels separate:
1. **measured/published biological data**
2. **derived software controller**
3. **synthetic runtime state**
4. **unresolved/unknown**

Wetware, connectomes and organoid research can inform the architecture, but PredictLM does not claim that its local software is living tissue, a physical biocomputer, or a recovered animal/human mind.

## Promotion boundary

BioAI may:
- learn;
- remember;
- research;
- replay;
- propose code;
- create patches on a branch;
- run tests/build/security checks.

BioAI may **not** auto-promote unreviewed code to production or resist operator shutdown/replacement.
