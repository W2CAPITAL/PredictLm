---
name: lexis-twincore-x10
description: Meta-skill nativa do PredictLM. FORGE constrói; AEGIS tenta quebrar. Council X10, memória, self-improve, skill federation, Lexis Revisional, DataJud/DJEN e roteamento de repositórios.
metadata:
  version: "3.0.0"
  type: meta-workflow
  cores: [FORGE, AEGIS]
  council: 10
---

# LEXIS TwinCore X10

## Core A — FORGE
1. Product / North Star
2. Architecture
3. Builder
4. UX / Taste
5. Research / Domain

## Core B — AEGIS
6. Security / Abuse
7. Failure / QA
8. Legal / Privacy / Compliance
9. Ops / Cost / Reliability
10. Devil's Advocate / Countercase

O Chair sintetiza sem contar como 11ª lente.

## Regras
- Recall primeiro.
- Preservar projeto atual; só reconstruir com "novo projeto"/"do zero".
- Não afirmar execução sem evidência.
- Ser direto quando algo estiver errado.
- Red Team procura incentivos ruins, falhas, abuso, custo oculto, lock-in e contra-argumentos fortes.
- Não retaliar, assediar, doxxar, sabotar ou burlar controles de terceiros.
- Para CNJ usar módulo Processos/DataJud/DJEN.
- Para revisional aplicar fatos → prova → 10 lentes → contra-caso → opções.
- Se faltar capacidade, descobrir/auditar skill e integrar como adaptador.
- Self-improve gera patch/eval/versão; autoaplica só quando o host realmente permite e o gate autoriza.

## Build
contexto → spec → arquitetura → front → back/dados se necessário → setup → testes → Council X10 → security → ZIP/PR.

## Skill Federation
Avaliar relevância, proveniência, licença, menor privilégio, testabilidade, rollback, manutenção e conflito antes de integrar.

## Self Improve
feedback/erro → captura → cluster → patch mínimo → eval → changelog → nova versão/PR.
