# PredictLM Cognitive Lab — Connectome provenance

The normal PredictLM Chat does **not** depend on this module. Cognitive Lab is isolated at `/cognitive` and uses a separate streaming route at `/api/chat/cognitive-stream`.

## Fly Core — FlyWire FAFB v783

The Fly Core is derived from the organization and published network statistics of the FlyWire whole adult female *Drosophila melanogaster* brain connectome.

- Dataset: FlyWire FAFB public release v783
- Flagship paper: Dorkenwald et al., *Neuronal wiring diagram of an adult brain*, Nature (2024)
- Scale reported in the flagship paper: 139,255 neurons and 54.5 million chemical synapses
- Network-statistics companion work: rich-club organization, recurrent/feed-forward motifs, and analyses across 78 neuropils
- Data explorer: https://codex.flywire.ai/
- Public-release license: CC BY-NC 4.0

PredictLM does **not** redistribute the raw FlyWire edge list. Cognitive Lab ships a connectome-derived controller and allows the user to import an authorized real subset locally in the browser. Imported files are summarized into runtime control evidence and are not uploaded by this feature.

Expected FlyWire CSV columns include:

`pre_root_id,post_root_id,neuropil,syn_count,nt_type`

## Human Core — H01

The Human Core is derived from H01, the Google Research / Lichtman Lab reconstruction of roughly one cubic millimeter of human temporal cortex.

- Dataset: H01
- Final analysis: Shapson-Coe et al., Science (2024)
- Scale: roughly 57,000 cells, ~16,000 neurons and ~150 million synapses
- Includes all six cortical layers and excitatory/inhibitory synaptic annotations
- Official release: https://h01-release.storage.googleapis.com/landing.html
- Released-data page: https://h01-release.storage.googleapis.com/data.html
- License: CC BY 4.0

H01 is **not a complete human-brain connectome**. PredictLM labels it as a cortical fragment everywhere in the runtime.

The official H01 synaptic connection export is available in Apache Avro. Cognitive Lab currently accepts a CSV subset/export (for example from a local preprocessing/CREST workflow) with columns such as:

`pre_id,post_id,syn_count,type,layer`

## What "connectome-derived" means

Cognitive Lab does not pretend to run 139,255 fly neurons or 150 million human synapses in the browser. It uses:

1. dataset scale and provenance;
2. organizational motifs reported from the real mapped data;
3. separate fly and human state-transition controllers;
4. an optional imported real edge subset that modifies runtime excitation/inhibition, region coverage, integration and salience;
5. a global workspace that broadcasts only compact control signals to the LLM;
6. prediction-error feedback after each answer.

This is a brain-inspired software control architecture. It is not evidence of biological consciousness or sentience.


## Fly chat and simulation

The Fly Core is exposed directly at `/cognitive/fly`. It has its own conversation history and sends `cognitiveMode: "fly"` to the isolated cognitive streaming route.

The Life Simulation Studio also contains a visible autonomous fly agent. Its movement state is driven by the same `FlyCoreState` fields used by Fly chat (salience, threat, exploration, inhibition, mushroom-body association, central-complex drive and action selection).

The simulation periodically synchronizes its Fly Core back to the Cognitive Lab IndexedDB state, so Fly chat and the simulated fly share one persistent controller state. The normal PredictLM Chat at `/` remains independent.


## Scientific evidence levels

PredictLM separates four layers so the Cognitive Lab can use neuroscience without overstating what the datasets contain.

| Layer | Meaning | Examples |
|---|---|---|
| **Measured / published** | Data or quantitative facts tied to a named dataset/paper | FlyWire neuron/synapse scale, H01 cortical fragment, macaque cortical atlas/projectomes |
| **Imported real subset** | User-authorized edge subset parsed locally and summarized by the runtime | FlyWire/H01 CSV subset |
| **Derived controller** | Software variables/dynamics informed by published organization, motifs or priors | salience, excitation/inhibition balance, integration, action-selection controls |
| **Simulated state** | State invented/accumulated by PredictLM during execution | memories, goals, publicThought, synthetic biography, scenario actions |

Anything outside those layers remains **unresolved/unknown**. A macaque prior is never silently relabeled as human measurement, and a connectome is never treated as a source of autobiographical memories.

## Macaque references

The Human↔Primate bridge uses macaque data only as an explicitly labeled proxy outside direct H01 coverage:

- Cell 2023 macaque cortical spatial/transcriptomic atlas: 143 cortical regions, 264 transcriptome-defined cell types;
- macaque PFC single-neuron projectome atlas: long-range projection priors, not synapse-level connectivity;
- macaque claustrum tracer connectivity: brain-wide projection evidence, not a whole-brain synaptic connectome.

These references improve anatomical/organizational priors while preserving the distinction between **human direct evidence**, **non-human primate proxy**, and **unknown**.
