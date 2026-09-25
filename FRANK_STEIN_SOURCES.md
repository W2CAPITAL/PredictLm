# Frank Stein — brain-source fusion

Frank Stein is a software cognitive architecture. It does not claim to reconstruct a complete human brain, import donor memories, read real human thoughts, or prove biological consciousness.

## Human sources

### H01
- Human temporal cortex, ~1 mm³.
- ~57,000 cells and ~150 million synapses in the 2024 final analysis.
- Used for local cortical microcircuit, six-layer and excitation/inhibition priors.
- https://research.google/pubs/a-connectomic-study-of-a-petascale-fragment-of-human-cerebral-cortex/

### BigBrain
- Whole postmortem human brain reconstructed from 7,404 histological sections.
- 20 µm isotropic 3D model.
- Used as whole-brain spatial/cytoarchitectonic scaffold.
- https://bigbrainproject.org/

### Julich Brain Atlas / EBRAINS
- Probabilistic cytoarchitectonic atlas with 227 human brain areas in release 3.1.
- Maps reflect inter-individual variability.
- Used for region boundaries and cross-brain variation.
- https://atlases.ebrains.eu/viewer/

### Allen Human Brain Atlas
- Adult human anatomy + genomic/gene-expression atlas across multiple donor brains.
- Used for region-level molecular/receptor priors; never used to infer donor thoughts.
- https://human.brain-map.org/

### Human Brain Project / EBRAINS hippocampus
- Single-cell, microcircuit, region-model and validation resources.
- Used for episodic-memory and spatial-context architecture.
- https://www.humanbrainproject.eu/en/brain-simulation/hippocampus/

## Cross-species completion

### FlyWire FAFB v783
- Whole adult female fruit-fly connectome.
- 139,255 neurons and ~54.5 million chemical synapses.
- Used for mushroom-body associative memory, fast salience, motifs and central-complex action selection.
- Raw public-release data is not redistributed.
- https://codex.flywire.ai/?dataset=fafb

### MICrONS
- Mouse visual-cortex functional connectome.
- ~75,000 neurons with physiology and ~523 million synapses.
- Used only as a visual-circuit/function fallback where comparable human functional connectivity is unavailable.
- https://www.microns-explorer.org/cortical-mm3

## Emotion and memory

Frank's emotion model is computational and multi-dimensional:
- valence, arousal, dominance;
- threat/safety, attachment/trust, novelty/reward/loss;
- joy, sadness, fear, anger, disgust, surprise;
- affection, empathy, longing, loneliness;
- guilt, shame, pride, frustration, relief, anticipation;
- appraisal: goal congruence, controllability, certainty, social evaluation, self/other agency;
- abstract neuromodulatory control signals: dopamine, serotonin, norepinephrine, acetylcholine, histamine.

These are software state variables, not measured neurotransmitter concentrations.

Memories are tagged by emotional salience so consolidation/retrieval can depend on how strongly an event affected the agent.

## Virtual neurons

The browser runtime creates a deterministic sparse virtual microcircuit. It includes region pools for:
- PFC;
- hippocampus;
- amygdala;
- insula;
- ACC;
- thalamus;
- hypothalamus;
- visual cortex;
- fly mushroom body;
- fly central complex.

The neurons are virtual LIF-like computational units driven by atlas/connectome priors. They are not copied biological cells from a donor.
