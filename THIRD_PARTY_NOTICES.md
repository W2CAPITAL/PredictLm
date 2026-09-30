# Third-party notices

## Chat IA Engine

The normal-chat streaming architecture in PredictLM was adapted from ideas in:

- Repository: LeonardoFirme/chat_ia
- License: MIT
- Copyright (c) 2026 Leonardo Firme

The referenced project uses a direct chat flow with conversation history, server-side model calls and Server-Sent Events (SSE) streaming. PredictLM reimplements that architecture for its own Next.js multi-provider runtime rather than copying the original FastAPI/Prisma stack.

MIT License notice:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, subject to the conditions of the original MIT License.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED.



## Minecraft Cognitive World

PredictLM's Minecraft Cognitive World is an independent research/simulation integration used to evaluate embodied software controllers in a voxel-world setting.

Minecraft is a trademark of Mojang Synergies AB and Microsoft. PredictLM is not affiliated with, sponsored by, or endorsed by Mojang or Microsoft, and this repository does not grant rights to Minecraft game assets or other proprietary Minecraft content.

## Connectome and neuroscience references

The Cognitive Lab uses published neuroscience resources as provenance for software-control abstractions. The principal references include FlyWire, MICrONS, H01, Allen Institute resources, and explicitly labelled macaque atlas/projectome references.

Dataset provenance, scope boundaries, and known license information are maintained in [CONNECTOME_SOURCES.md](CONNECTOME_SOURCES.md). PredictLM does not treat these scientific datasets as proof of consciousness and does not relicense third-party datasets under the PredictLM license.


## Cognitive / self-improvement research references

PredictLM's knowledge/source policy may ingest or distill bounded engineering patterns from these public repositories:

- **GAIR-NLP/ASI-Evolve** — Apache-2.0. Used for experiment-loop, cognition-store and evaluation-driven improvement patterns.
- **269652/artificial-consciousness-ai** — MIT. Used for persistent-memory layering and observability patterns; consciousness labels are not treated as scientific proof.
- **jasonkresch/bots** — MIT. Used for bounded evolutionary simulation, fitness and mutation patterns.
- **Sairamg18814/shvayambhu** — Apache-2.0, reference-only in PredictLM. Strong consciousness/emergence claims are not imported as established facts.
- **asi-alliance/Max_folio** — Apache-2.0, reference-only. Used for self-audit/failure-mode ideas with autonomy bounded by PredictLM gates.
- **tlcdv/the_consciousness_ai** — non-commercial license, reference-only. No source code is copied into the commercial/runtime knowledge index.

Where an upstream source is marked reference-only, PredictLM uses only high-level architectural lessons and does not vendor or bulk-ingest source code.
