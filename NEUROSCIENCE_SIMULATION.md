# PredictLM — Neuroscience Simulation Gap Tracker

Status legend:

- **DONE** — implemented in executable code and covered by tests or runtime instrumentation.
- **PARTIAL** — useful implementation exists, but it does not satisfy the full scientific requirement.
- **EXTERNAL** — requires licensed/large datasets, HPC, independent experimental data, ethics review, or lab collaboration; the app must not fake it.

This tracker is intentionally strict. A dataset name, controller prior, LLM explanation, or UI label does **not** count as a biological simulation.

## A. Data and connectome

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 1 | Full FlyWire neuron/synapse graph at runtime | EXTERNAL | Import parser exists; full graph is not bundled. |
| 2 | Official FlyWire neuron IDs | PARTIAL | Imported subsets preserve IDs; full release alignment pipeline still needed. |
| 3 | Real sparse connectivity matrix | PARTIAL | Real edge subsets can be parsed; large out-of-core sparse runtime pending. |
| 4 | Cell types / neurotransmitters / morphology | PARTIAL | Transmitter/sign supported in imported edges; morphology pipeline pending. |
| 5 | Real neuropil meshes | EXTERNAL | Provenance/region labels exist; meshes not bundled. |
| 6 | H01 volume data | EXTERNAL | H01 subset parser/provenance exists; petascale volume not bundled. |
| 7 | Official macaque coordinates/parcellation | PARTIAL | Atlas provenance and region counts exist; coordinate runtime pending. |
| 8 | Real mouse data | PARTIAL | MICrONS + Allen manifests/priors exist; full data runtime pending. |
| 9 | Reproducible scientific versioning | PARTIAL | Dataset release/DOI/source + run seed/dt/duration recorded; file hashes pending. |
| 10 | Huge dataset download/verification pipeline | EXTERNAL | Requires separate data service/storage, not Vercel. |
| 11 | Dataset licenses/terms | PARTIAL | Source/license fields and no raw redistribution policy; automated license gate pending. |
| 12 | Per-edge provenance | DONE | `ConductanceSynapse.provenance` and imported edge IDs/classes. |
| 13 | Cross-species homolog evidence | PARTIAL | Macaque remains labeled proxy; evidence graph pending. |
| 14 | Proofreading confidence per edge | PARTIAL | provenance supports confidence; importer needs source-specific confidence columns. |
| 15 | Measured vs invented parameters | DONE | measured / derived / simulated / unknown evidence classes. |

## B. Physical / neuronal model

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 16 | HH or LIF/AdEx membrane equations | DONE | Conductance LIF numerical solver. |
| 17 | Ion channels / real time constants | PARTIAL | LIF membrane constants are explicit; HH/ion channels pending. |
| 18 | AMPA/NMDA/GABA + delays | DONE | Conductance receptors, reversal potentials, tau and delays. |
| 19 | Plasticity | PARTIAL | Pair-based STDP is implemented; short-term depression/facilitation pending. |
| 20 | Stochastic noise / variability | DONE | Seeded Gaussian current noise. |
| 21 | Physical units | DONE | mV, ms, nS, pA, pF in solver/results. |
| 22 | Stable numerical integration | PARTIAL | Explicit Euler with dt validation; adaptive/stiff solvers pending. |
| 23 | Mean-field/neural mass | EXTERNAL | Not yet implemented. |
| 24 | Published mushroom body / central complex population models | PARTIAL | Controller priors exist; literature-calibrated population equations pending. |
| 25 | Neuromodulators | EXTERNAL | Not yet numerically modeled. |
| 26 | Metabolism / ATP / fatigue | EXTERNAL | Game fatigue is not biological metabolism. |
| 27 | Temperature / Q10 | EXTERNAL | Not implemented. |
| 28 | FI/PSTH experimental curve validation | PARTIAL | Validation hooks exist; fixed experimental datasets pending. |
| 29 | Standard stimulation protocols | DONE | Current injection pulse protocol. |
| 30 | Reproducible seed | DONE | Solver is deterministic given documented seed. |

## C. Scale and simulation infrastructure

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 31 | 10^3–10^7 neurons backend | PARTIAL | Browser solver is toy-scale; NEST is declared for full external mode only. |
| 32 | GPU/CPU cluster | EXTERNAL | Not available in Vercel runtime. |
| 33 | Checkpoint/restart | PARTIAL | Minecraft state persists; scientific solver checkpoint format pending. |
| 34 | Long simulation job queue | EXTERNAL | Requires worker/cluster backend. |
| 35 | Spike/LFP streaming | PARTIAL | spike results exist; streaming/LFP pending. |
| 36 | Spike-train compression | EXTERNAL | Pending. |
| 37 | Multi-trial batch/statistics | PARTIAL | deterministic reruns + comparison utilities; batch runner pending. |
| 38 | Parallelism by region | EXTERNAL | Pending. |
| 39 | Memory-mapped connectome | EXTERNAL | Pending external data worker. |
| 40 | Cost/time estimate | PARTIAL | mode is explicit; runtime estimator pending. |
| 41 | Toy vs full mode | DONE | `toy-browser` vs `full-external`. |
| 42 | Numerical regression tests | PARTIAL | deterministic solver regression exists; fixed golden-spike artifact pending. |
| 43 | Public performance benchmarks | EXTERNAL | Pending reproducible benchmark suite. |
| 44 | Multi-tenant heavy job isolation | EXTERNAL | Pending worker infrastructure. |
| 45 | Scientific observability | DONE | seed, dt, duration, solver, datasets, provenance and claims manifest. |

## D. Scientific validation

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 46 | Systematic literature comparison | PARTIAL | provenance sources exist; figure-by-figure review pending. |
| 47 | Behavioral ground truth | EXTERNAL | Needs curated experimental datasets. |
| 48 | RMSE / firing-rate correlation | DONE | quantitative validation helper. |
| 49 | Ablation experiments | DONE | neuron/synapse ablation utility + paired comparison. |
| 50 | Peer-reviewable methods | PARTIAL | executable methods documented; supplement-quality protocol pending. |
| 51 | Fixed public evaluation dataset | EXTERNAL | Pending dataset selection/version lock. |
| 52 | Chat vs simulation separation | DONE | numerical results originate from solver, not chat. |
| 53 | Negative controls | DONE | deterministic shuffled-synapse control. |
| 54 | Hyperparameter robustness | EXTERNAL | Parameter sweep runner pending. |
| 55 | Falsified hypothesis log | EXTERNAL | Lab notebook workflow pending. |
| 56 | Automatic source citation | PARTIAL | dataset/source/DOI stored in manifest; figure citations pending. |
| 57 | Human-data compliance | EXTERNAL | Dataset-specific governance review required before large H01 workflows. |
| 58 | Ethics review for clinical data | EXTERNAL | No clinical dataset should be added without appropriate review. |
| 59 | Limit scientific claims in UI | DONE | UI now labels toy numerical simulation and evidence classes. |
| 60 | External audit/lab collaboration | EXTERNAL | Cannot be implemented as code. |

## E. Sensory, body and behavior

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 61 | Compound-eye model | PARTIAL | fly POV/FOV exists; physical optics pending. |
| 62 | Antenna/haltere model | EXTERNAL | Pending. |
| 63 | Closed-loop sensor → network → action → sensor | DONE | Minecraft neural controller executes this loop. |
| 64 | 3D environment with physics | PARTIAL | real voxel WebGL + collision/water; full rigid-body/fluids pending. |
| 65 | Articulated biomechanical body | EXTERNAL | Pending external physics/Unity model. |
| 66 | Population activity → motor policy | DONE | action populations are selected by spike counts. |
| 67 | Standard behavioral tasks | EXTERNAL | Pending Y-maze/fixation/reach task library. |
| 68 | Reward learning tied to plasticity | PARTIAL | STDP exists; reward-modulated STDP/RL coupling pending. |
| 69 | Fatigue/adaptation | PARTIAL | game hunger exists; neural sensory adaptation pending. |
| 70 | Multimodal temporal binding | PARTIAL | workspace has multimodal signals; calibrated latency model pending. |
| 71 | Synthetic electrophysiology/spike sorting | EXTERNAL | spike trains exist; extracellular forward model pending. |
| 72 | Compare against real behavioral video/trials | EXTERNAL | Requires ground-truth datasets. |

## F. Neuroscience interface / AI

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 73 | Separate fact / inference / fiction | DONE | evidence-class contract + UI text. |
| 74 | Inject current / lesion tools | PARTIAL | executable API utilities exist; dedicated UI controls pending. |
| 75 | Neuroglancer-style 3D graph/volume | EXTERNAL | Pending. |
| 76 | Scientific graph queries | PARTIAL | edge objects/importers exist; query layer pending. |
| 77 | Export to Python/R | DONE | spike/voltage/firing-rate CSV exports. |
| 78 | Reproducible notebooks | EXTERNAL | Pending notebook generator. |
| 79 | LLM is not the solver | DONE | enforced architecture/documentation. |
| 80 | LLM as interface to numerical results | PARTIAL | architecture supports this; dedicated result tool wiring pending. |
| 81 | Citations when explaining circuits | PARTIAL | source manifest exists; response-level enforcement pending. |
| 82 | Paper figure + caption + parameters | DONE | `paperFigurePayload` emits raster/traces/rates/seed/dt. |
| 83 | Do not call spikes thoughts | DONE | UI says neural policy/spikes and synthetic public state separately. |
| 84 | Simulation-based neuro tutor | EXTERNAL | Pending. |
| 85 | Stable lab API | PARTIAL | typed TS API exists; versioned public API pending. |

## G. Cross-species / human claims

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 86 | Evidence-backed homologies | PARTIAL | proxy boundary exists; formal homology evidence graph pending. |
| 87 | Never present macaque proxy as H01 | DONE | explicit provenance/unknown handling. |
| 88 | Human extrapolation uncertainty | DONE | unresolved/unknown class is mandatory. |
| 89 | Separate cortex scales | PARTIAL | dataset scopes are separated; dedicated model families pending. |
| 90 | Restrict clinical claims | DONE | current runtime has no diagnostic/treatment claim path. |
| 91 | Per-species limits in docs/UI | DONE | manifests + NeuroCore + Minecraft scientific copy. |
| 92 | Neurochemist/neuroscientist external scoring | EXTERNAL | Requires human experts. |

## H. Product / legal / honesty

| # | Requirement | Status | Current implementation |
|---|---|---|---|
| 93 | Remove “real brain in browser” copy | DONE | forbidden product-copy contract and UI correction. |
| 94 | Digital Brain vs neural simulation | DONE | separate modules/classes. |
| 95 | State realistic infrastructure cost | DONE | full mode is external; no free-tier whole-brain claim. |
| 96 | State engineering/infrastructure requirement | DONE | full-scale mode is not serverless/browser. |
| 97 | Dataset-maintainer partnerships | EXTERNAL | Organizational work, not code. |
| 98 | Tests against metaphor regression | DONE | scientific-contract + simulation tests. |
| 99 | Publish limitations | DONE | this tracker + scientific manifests/skill docs. |
| 100 | Independent reproduction without LLM | PARTIAL | experiments are deterministic and LLM-independent; independent external reproduction study still required. |

## Current exit criteria

The PredictLM may currently claim:

> **Numerical neural simulation at toy/browser scale, with physical units, deterministic seeds, conductance synapses, stimulation, ablation, controls, quantitative validation hooks and a closed-loop Minecraft behavior interface.**

It may **not** claim:

- that a complete human/macaque/mouse/fly biological brain is running;
- that H01 is a whole human brain;
- that MICrONS is a whole mouse brain;
- that an LLM generated spike narrative is a solver result;
- that a macaque prior is human measurement;
- that synthetic memories/public thoughts came from biological tissue.

The next scientific milestone is not more UI copy. It is a fixed public experimental dataset + calibrated parameters + external full-scale solver worker + independent reproduction of a quantitative result.
