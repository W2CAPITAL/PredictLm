---
name: game-studio-fabric
description: >
  Orquestração de desenvolvimento de jogos no PredictLM inspirada no Claude-Code-Game-Studios:
  rigor adaptativo, papéis por domínio, vertical slice, run-and-observe, playtest e gates de QA.
metadata:
  version: "1.0.0"
  type: build-specialist
  source: "Donchitos/Claude-Code-Game-Studios"
  source_license: "MIT"
---

# Game Studio Fabric

Use esta skill somente quando a tarefa envolver jogo, gameplay, Godot, Unity, Unreal, level design,
NPC/IA de jogo, HUD, shader, multiplayer, playtest, protótipo ou vertical slice.

## Princípio

Não importar uma burocracia de estúdio inteira para cada tarefa. O PredictLM escolhe o menor rigor
que produz evidência suficiente.

- **minimal**: brief curto → implementar → rodar/observar → corrigir.
- **standard**: design/arquitetura enxutos → vertical slice → QA → expandir.
- **full**: ownership explícito por domínio, gates técnicos/criativos, playtests e release checks.

## Papéis internos

- Producer — escopo, dependências e propagação cross-domain.
- Creative Director — fantasia, pilares, experiência e coerência.
- Technical Director — arquitetura, engine, performance e risco técnico.
- Game Designer — mecânicas e sistemas.
- Gameplay/Engine/UI/Network specialists — implementação por domínio.
- Art/UX — identidade visual e legibilidade.
- QA/Playtest — regressão, observação, feel e evidência.

Papéis são internos. A resposta pública continua sendo uma única voz do PredictLM.

## Gates

1. **Scope** — o pedido e o loop principal estão claros.
2. **Architecture** — engine, dependências e boundaries são coerentes.
3. **Implement** — mudanças ficam no domínio correto.
4. **Run and Observe** — mudança visível precisa ser renderizada/observada quando o host permite.
5. **Test/Playtest** — lógica e experiência são verificadas separadamente.
6. **Vertical Slice** — antes de escalar produção, validar um loop completo representativo.
7. **Release** — só declarar pronto quando build/test/evidência correspondem ao que realmente rodou.

## Regra visual

Build, parse ou teste unitário não provam que HUD, menu, cena ou layout estão corretos.

Quando o host puder:
- executar a superfície real;
- capturar screenshot/vídeo;
- comparar com critérios;
- reter a evidência.

Quando não puder, declarar **NOT VERIFIED** em vez de fingir que olhou.

## Vertical slice

Para projetos não triviais:
- definir uma pergunta falsificável;
- implementar um loop completo curto;
- medir o que realmente funcionou;
- corrigir arquitetura/design antes de escalar;
- reduzir escopo antes de reduzir qualidade representativa.

## Playtest

Separar achados em:
- design;
- balanceamento;
- bug;
- polish.

Observação de playtest é evidência de experiência, não prova universal. Não inventar comportamento de usuários.

## Engines

O runtime detecta, quando possível:
- Godot;
- Unity;
- Unreal;
- Web/Canvas/WebGL/WebGPU.

Especialistas de engine só entram quando o pedido ou o workspace justificar.

## Integração nativa

- `src/lib/game-studio-fabric.ts`
- `src/lib/agent-runtime/agentic-fabric.ts`
- `src/lib/agent-runtime/catalog.ts`
- `src/lib/build-reference-playbook.ts`
- `src/lib/fusion/capability-fabric.ts`
- `src/app/api/agent/route.ts`

A fonte é MIT. Adaptar padrões é permitido, mas o PredictLM mantém arquitetura própria e não copia o template inteiro.
