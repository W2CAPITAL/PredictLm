---
name: domain-engine-fabric
description: Roteador especializado do PredictLM para Space/Earth/Starlink, Matemática/Computação Quântica, Finanças/Perícia, Legal/GraphRAG/Lexis e Infra/Observabilidade. Use no Chat, Research e Build quando um desses domínios exigir fontes, cálculos ou integrações específicas.
metadata:
  version: "1.0.0"
  host: "PredictLM"
---

# Domain Engine Fabric

## Missão

Adicionar especialização sem criar uma lista pública de modelos. O usuário continua vendo **Predict Auto**; internamente o Prompt OS ativa somente os motores de domínio relevantes.

## Runtime

USER REQUEST
→ Prompt OS
→ Domain Engine classifier
→ deterministic data/math/tool path quando possível
→ provider/research/knowledge quando agrega valor
→ provenance/relevance gate
→ resposta
→ opcional artifact/build

Implementação: `src/lib/domain-engine-fabric.ts`.

## Space / Earth / Satellite

Referências:
- `gibme-npm/starlink` — Starlink local gRPC + Enterprise API;
- `r-spacex/SpaceX-API` — dados públicos de lançamentos/starlink;
- `nasa-gibs/worldview` — Earth observation/GIBS;
- `Starlink/starlink`, `Baptajck/space` — referência complementar.

Regras:
- dados públicos/históricos ≠ telemetria viva;
- Starlink LAN exige bridge local/server, nunca acesso fictício pelo browser/Vercel;
- Enterprise Starlink exige credencial + resposta real;
- imagery NASA/GIBS preserva layer/timestamp/projection/source;
- cálculos de unidade/orbita/telemetria são determinísticos antes da explicação LLM.

## Mathematics / Quantum

Referências:
- `Kitsunp/kistmath-ai`: curriculum learning, symbolic reasoning, external memory;
- `Universidade-Livre/matematica`: trilha educacional;
- `TechTastic/Advanced-Math`: álgebra linear, estatística, quaternions, PID;
- fontes quânticas em notebooks entram como referência quando licença não está clara.

Runtime:
- `src/lib/deterministic-math-engine.ts` executa arithmetic/functions/stats sem `eval`;
- LLM explica o resultado, não inventa o número;
- separar teoria, simulação e medição em hardware quântico;
- explicitar unidade, hipótese e precisão.

## Finance / Forensics

Referências:
- `edilsonaguiais/sgs-peritos` — catálogo/uso de SGS/BCB;
- `FTShare-Lab/FTShare-MCP` e `FTShare-skill`.

Regras:
- modalidade correta da série BCB é parte da evidência;
- guardar code/date/unit/source;
- FTShare preserva pagination/truncated/warnings;
- resultado financeiro não vira recomendação de investimento automaticamente;
- narrativa deve ser reproduzível pelos dados.

## Legal / GraphRAG / Lexis

Referências:
- `W1CAPITAL/LexisPredict`;
- `protonspy/JusChat`.

Regras:
- KPI/dono/save/tenant/prazo armazenado = código determinístico;
- DataJud e DJEN independentes;
- GraphRAG só conecta relações com provenance;
- `created_by` é dono; `atendido_por` é atendimento;
- dossiê é segundo cérebro, não substituto da resposta principal.

Carregar também `../lexispredict-saas/SKILL.md`.

## Infra / Deploy / Observability

Referências:
- `vercel/vercel`;
- `netdata/netdata` como architecture/reference por GPL;
- `wotlk-local-server-kit` como referência de service orchestration/health/portable local stack;
- FTShare MCP para lifecycle de MCP Streamable HTTP.

Regras:
- status operacional só após probe real;
- logs/metrics não autorizam inventar root cause;
- server secret nunca em client;
- portas administrativas/database não são públicas por padrão;
- runbooks incluem start/stop/health/failure/recovery.

## Build integration

`src/lib/domain-engine-fabric.ts` gera:
- `DOMAIN_ENGINE_BLUEPRINT.md`;
- `src/domain/domain-engines.ts`;
- módulos, entidades e integrações específicas.

`app-scaffolder.ts` adiciona adapters/env para:
- SpaceX public data;
- NASA GIBS;
- Starlink bridge;
- BCB SGS;
- FTShare MCP;
- Netdata;
- Vercel;
- DataJud/DJEN.

## Definition of Done

Um domínio só é tratado como integrado quando:
- fonte/licença/proveniência está registrada;
- o Prompt OS realmente recebe o contexto;
- o Build materializa módulos/entidades/integrações;
- integração externa não aparece "online" sem probe;
- cálculo determinístico não é substituído por palpite do LLM;
- CI/build passa.
