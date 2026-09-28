# Minecraft Cognitive World × Neuroscience Lab — roadmap 1–100

Status legend: **DONE** = implemented and covered by current code/tests; **PARTIAL** = contract or first implementation exists but the full product surface/validation is incomplete; **PENDING** = not yet implemented.

The central rule is permanent:

> Minecraft Cognitive World measures operational intelligence in a closed loop. Neuroscience Lab measures species-scoped scientific fidelity. Neither axis substitutes for the other.

## A. Product separation and claims

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 1 | Two explicit modes | DONE | Minecraft Cognitive World and Neuroscience Lab are separate UI concepts. |
| 2 | Minecraft fixed banner | DONE | `MINECRAFT_ARENA_BANNER` + UI test. |
| 3 | Lab fixed banner | DONE | `LAB_SCIENCE_BANNER` + UI test. |
| 4 | Controller names | DONE | H01/MICrONS+Allen/atlas+projectome/FlyWire informed labels. |
| 5 | Prohibit “human brain playing Minecraft” copy | DONE | Claim-regression test. |
| 6 | Abstraction level visible | DONE | L1–L4 contract; current profile label displayed in HUD. |
| 7 | Coverage visible | DONE | Evidence-coverage index + present/proxy/absent breakdown; explicitly not % of brain. |
| 8 | Logs avoid “human thought” claim | DONE | User-facing copy says controller/public runtime state. |
| 9 | README/skill duality | DONE | README + NeuroCore v3.9. |
| 10 | CI claim gate | DONE | `cognitive-world-lab-contract.test.ts` fails on forbidden copy/missing boundary banner. |

## B. Coverage and abstraction

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 11 | Per-agent coverage HUD | DONE | Evidence index + breakdown. |
| 12 | Abstraction HUD | DONE | L1–L4 labels. |
| 13 | Fly summary | DONE | FlyWire whole-brain connectivity; dynamics modelled. |
| 14 | Human summary | DONE | H01 partial; cortical controller. |
| 15 | Mouse summary | DONE | MICrONS + Allen cortical/mesoscale. |
| 16 | Macaque summary | DONE | Atlas + projectome proxy. |
| 17 | Present/absent/proxy list | DONE | Typed subsystems + detailed lists. |
| 18 | Why incomplete per species | DONE | `whyNotComplete` exposed in UI. |
| 19 | Coverage history vs training | PARTIAL | Export schema separates task performance history from evidence coverage; persistent chart pending. |
| 20 | Coverage JSON export | DONE | Download from selected controller HUD. |
| 21 | Side-by-side four-controller comparison | PARTIAL | Comparison helper exists; dedicated UI dashboard pending. |
| 22 | Red scientific-mode low-coverage seal | PENDING | Scientific-mode flag exists; UI seal pending. |

## C. Minecraft Cognitive World benchmark

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 23 | Fixed task suite | DONE | 12 fixed tasks. |
| 24 | Metrics | DONE | steps, deaths, items, distance, replans, objective latency, cooperation events. |
| 25 | Reproducible seed | DONE | Experiment spec + world seed. |
| 26 | Action budget | DONE | Runner stops at budget. |
| 27 | Curriculum | PENDING | Flat → survival → multi-agent scheduler pending. |
| 28 | Memory probe | DONE | Task definition + headless objective. |
| 29 | Distractor benchmark | PARTIAL | Task exists; controlled distractor injector pending. |
| 30 | 3+ step planning | PARTIAL | Task/objective exists; richer crafting graph benchmark pending. |
| 31 | Cooperation benchmark | PARTIAL | Task and metric exist; true two-controller headless environment pending. |
| 32 | Competition benchmark | PARTIAL | Optional task exists; scarce-resource multi-agent world pending. |
| 33 | Internal leaderboard | PARTIAL | Aggregation/comparison helper exists; UI leaderboard pending. |
| 34 | Random baseline | DONE | Deterministic random controller. |
| 35 | Heuristic baseline | DONE | Simple reactive heuristic controller. |
| 36 | Learning curves | PENDING | Result schema supports history; graph UI pending. |
| 37 | Abort/resume checkpoint | PARTIAL | Checkpoint schema/snapshot exists; resumed loop wiring pending. |
| 38 | Headless CI mode | DONE | `MinecraftHeadlessBenchmarkEnvironment`. |
| 39 | Replay | DONE | Action/event/reward replay stream. |
| 40 | “What Minecraft answers” doc | DONE | README + this document. |

## D. Perception → memory → decision → action

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 41 | Common sensorium | DONE | Typed position/grid/inventory/HP/entities/structures observation. |
| 42 | Limited episodic memory | DONE | 32-entry bounded memory in common adapters. |
| 43 | Spatial memory | DONE | 128-cell bounded coarse spatial map. |
| 44 | Goal priorities/interruption | PARTIAL | Threat interruption + goal field; full priority queue pending. |
| 45 | Planner vs reactive trace | DONE | Both candidates + selector stored in `DecisionTrace`. |
| 46 | Stable Action API | DONE | move/jump/craft/attack/interact/wait. |
| 47 | Configurable action latency | PARTIAL | Spec field exists; delayed application queue pending. |
| 48 | Observation noise | PARTIAL | Spec field exists; noise injection pending. |
| 49 | Novelty/salience | DONE | Novelty input is functional runtime state, not consciousness claim. |
| 50 | Readable trace | DONE | observation digest → memory writes → candidates → selected action. |
| 51 | Closed-loop unit tests without renderer | DONE | Contract/headless tests. |
| 52 | LLM cannot invent world action | PARTIAL | Headless path is LLM-free and game planner executes real Action API; universal runtime guard still pending. |

## E. Four controllers in the same world

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 53 | Common `step(obs) → action` adapter | DONE | Four adapters implement `CognitiveController`. |
| 54 | Fly fast/orientation/threat bias | PARTIAL | Profile-specific synthetic LIF gains; FlyWire-calibrated behavior pending. |
| 55 | Mouse visual/spatial bias | PARTIAL | Spatial memory + mouse-specific gains; literature calibration pending. |
| 56 | Macaque visual/attention/reach proxy | PARTIAL | Profile-specific exploration/social gains; reach task calibration pending. |
| 57 | Human planning + H01-informed label | PARTIAL | Planner/crafting policy + H01 provenance; H01-derived functional weights pending. |
| 58 | Priors documented by source | PARTIAL | Dataset provenance documented; current controller gains explicitly synthetic, not paper-fitted. |
| 59 | No-LLM controller-only mode | DONE | Headless/controller runtime does not call LLM. |
| 60 | Optional LLM high-abstraction cortex | PARTIAL | Experiment flag exists; explicit bounded module not yet wired. |
| 61 | Hot controller swap | PENDING | Adapter API makes this feasible; UI/runtime swap pending. |
| 62 | Freeze/ablate parts | PARTIAL | Scientific ablation utilities exist; controller memory/planner ablation harness pending. |
| 63 | No silent cross-species weight sharing | DONE | Controller-specific synthetic gains + transfer policy recorded. |
| 64 | Automatic winner-by-task-family report | PARTIAL | Controller run aggregation exists; family report UI pending. |

## F. Neuroscience Lab

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 65 | Species-compatible tasks only | DONE | Task/species validator. |
| 66 | Fly task family | DONE | Odor plume, optomotor, orientation, gap crossing contracts. |
| 67 | Mouse task family | DONE | Visual discrimination, simple maze, circuit probe contracts. |
| 68 | Macaque task family | DONE | Fixation, visual search, simplified reach contracts. |
| 69 | Human local H01 tasks only | DONE | Local stimulation/column/circuit tasks; no whole-brain. |
| 70 | Minecraft tasks rejected in Lab | DONE | Explicit guard. |
| 71 | Parameters with units/citations | PARTIAL | Solver units/provenance exist; every Lab task still needs fixed citations/parameter packs. |
| 72 | Data-only mode | DONE | Trial config + provenance declares data-only; solver integration gate pending for every pathway. |
| 73 | Published-behavior validation | PARTIAL | RMSE/correlation hooks exist; fixed datasets pending. |
| 74 | Paper-style figure export | DONE | Existing scientific experiment payload. |
| 75 | Provenance on each trial | DONE | `LabTrialProvenance`. |
| 76 | Dynamics vs FlyWire connectivity separation | DONE | Required provenance text. |
| 77 | L2 → L3 roadmap | PARTIAL | Abstraction levels documented; per-species upgrade checklist pending. |
| 78 | Refuse MICrONS=whole mouse | DONE | Docs/tests/contracts. |
| 79 | Refuse H01=human mind | DONE | Docs/tests/contracts. |
| 80 | Scientific release checklist | DONE | Ten-item Lab checklist; external human review remains organizational work. |

## G. Metrics, honesty, education

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 81 | In-app glossary | PENDING | Terms documented but not a dedicated UI glossary. |
| 82 | “Minecraft proves biology?” quiz | PENDING | Not implemented. |
| 83 | Minecraft score vs Lab fidelity dashboard | PENDING | Data contracts separated; combined dashboard pending. |
| 84 | Share warning for mixed interpretations | PENDING | Not implemented. |
| 85 | Run citation template | PARTIAL | Provenance metadata exists; formatted citation generator pending. |
| 86 | Teacher mode | PENDING | Not implemented. |
| 87 | Engineer mode | PARTIAL | Traces/ablation data exist; dedicated toggle pending. |
| 88 | Claims changelog | PARTIAL | Git history/docs provide audit trail; dedicated changelog pending. |
| 89 | Hall of failures | PENDING | Runner can record losses; UI/report pending. |
| 90 | External communication policy | DONE | README + NeuroCore v3.9 set the language contract. |

## H. Engineering, CI and product

| # | Requirement | Status | Implementation |
|---|---|---|---|
| 91 | Controller contract + fixed-seed CI | DONE | Determinism and common adapter tests. |
| 92 | Disclaimer snapshots/guards | DONE | UI source assertions. |
| 93 | Feature flags | PARTIAL | Environment flags are defined; route-level enforcement pending. |
| 94 | Browser performance budget | PARTIAL | Headless mode + toy/full separation exist; formal budget thresholds pending. |
| 95 | Anonymous arena-vs-lab telemetry | PENDING | Not implemented; requires privacy/product decision. |
| 96 | Minecraft failure never blocks general Chat | DONE | Lab/Simulation are isolated surfaces; existing chat remains independent. |
| 97 | Document Minecraft win ≠ biology | DONE | UI + README + skill + tests. |
| 98 | Real FlyWire subgraph only upgrades Lab evidence | PARTIAL | Policy exists; source-specific automatic level update pending. |
| 99 | Single YAML Experiment Runner | DONE | `ExperimentSpec` YAML serialization/parser + headless runner. |
| 100 | Four neuro-informed architectures, one world, no fake complete brains | DONE as product contract / PARTIAL scientifically | Same-world controllers and coverage labels are live; quantitative multi-agent benchmark depth still expands over time. |

## Current claim boundary

PredictLM may say:

> Four neuro-informed software controllers can be compared in the same Minecraft-like closed-loop world with reproducible seeds, coverage sheets, spiking toy dynamics, memory/action traces and headless benchmarks.

PredictLM may not say:

- that a complete human, mouse, macaque or fly biological brain is running;
- that task success proves species-level biological fidelity;
- that H01 is a whole human brain or mind;
- that MICrONS is a whole mouse brain;
- that FlyWire connectivity alone supplies complete dynamics, body, sensors or subjective state;
- that synthetic spikes are thoughts.

## Next highest-value implementation tranche

1. multi-controller headless environment for true cooperation/competition;
2. observation-noise and delayed-action queues;
3. persistent benchmark result store + learning curves + failure hall;
4. controller ablation toggles and hot swap;
5. fixed literature-backed Lab datasets/parameter packs;
6. side-by-side Minecraft score vs Lab-fidelity dashboard;
7. formal browser performance budgets and feature-flag enforcement.
