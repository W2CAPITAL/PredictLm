---
name: grok
description: Integra capacidades Grok/xAI ao PredictLM com fronteiras reais entre Vercel, API xAI e execução local. Use para pesquisa web/X com citações, research em lote, imagem/vídeo via providers Grok/xAI realmente configurados e pós-processamento adaptativo com ffmpeg quando disponível localmente.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  source_repository: "Wangnov/grok-skills"
  source_license: "MIT"
  public_identity: "PredictLM"
---

# Grok / xAI capability skill

Esta skill adapta para o PredictLM os padrões úteis de `Wangnov/grok-skills` sem transformar o Grok em uma personalidade pública separada.

## Regra principal

Primeiro detectar a capacidade real, depois escolher a rota.

Nunca:
- fingir que Vercel consegue acessar uma sessão `grok login` existente no computador do usuário;
- tratar uma instrução para `image_gen` ou `image_to_video` como arquivo pronto;
- declarar ffmpeg/chromakey/VP9/drawtext disponível sem preflight;
- usar wrappers não oficiais para burlar autenticação xAI;
- expor `XAI_API_KEY` no navegador.

## Rotas implementadas no PredictLM

### 1. Pesquisa web/X — servidor

Quando `XAI_API_KEY` existe, o Research pode usar o endpoint oficial xAI Responses através de:

- `src/lib/server/xai-search.ts`
- `src/app/api/research/route.ts`

Contrato:
- `auto` = `web_search` + `x_search`;
- `web` = somente web;
- `x` = somente X;
- no máximo 10 turnos;
- suporte a allow/exclude domains;
- suporte a allow/exclude X handles;
- filtros `from`/`to` em `YYYY-MM-DD`;
- image understanding em web/X;
- video understanding em X;
- resposta e citações são normalizadas;
- URLs citadas entram no mesmo gate de relevância/qualidade das demais fontes do Research;
- falha xAI não destrói Firecrawl, DuckDuckGo, GitHub, OpenAlex, Semantic Scholar ou outras rotas.

Configuração:

```env
XAI_API_KEY=
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-4.7
XAI_SEARCH_MODEL=grok-4-1-fast
```

`XAI_SEARCH_MODEL` é independente do modelo de Chat para permitir trocar a rota de pesquisa sem afetar a conversa.

### 2. Imagem / vídeo — hospedado

No deploy web, mídia Grok/xAI só é tratada como ativa quando existe uma rota real:

- Vercel AI Gateway/OIDC com modelo de imagem compatível;
- provider de imagem configurado;
- xAI/API compatível quando explicitamente suportado pelo adapter;
- outros providers reais do Imagine/Video.

A skill não usa a sessão local `grok login` a partir do Vercel.

O Imagine mantém:
- identity lock;
- referência visual;
- geração real;
- revisão semântica;
- repair bounded;
- failover;
- arquivo/URL validado antes de apresentar sucesso.

### 3. Grok CLI — local/desktop opcional

Em uma execução local do repositório, o operador pode usar o Grok CLI autenticado.

Antes de qualquer mídia ou research local:

```bash
node scripts/grok/preflight.mjs
```

O preflight verifica:
- SO;
- Node;
- presença do executável `grok`;
- presença de `XAI_API_KEY`;
- presença do ffmpeg/ffprobe;
- filtros importantes como `chromakey`, `colorkey`, `despill`, `overlay`, `drawtext`;
- encoders relevantes como `libx264`, `libvpx-vp9`, ProRes e GIF.

A UI hospedada nunca assume que esse ambiente local existe.

### 4. Pós-processamento

Princípio:

**probe → escolher pipeline → executar → verificar artefato**

Exemplos de capacidades, somente quando detectadas:
- chroma key / green screen;
- despill;
- concat;
- watermark;
- GIF;
- extração de frame;
- VP9 com alpha;
- H.264/AAC;
- crop/scale.

Os parâmetros de chroma key dependem do material; não são fixos globalmente.

## Research em lote

Para pesquisa extensa, o PredictLM usa o próprio planner de Research e pode somar xAI às demais fontes.

Não abrir N chamadas ilimitadas. Respeitar:
- depth;
- source budget;
- provider cooldown;
- timeout;
- deduplicação;
- source-quality gate;
- citation provenance.

Subagentes, quando usados no Build/Research, recebem objetivos estreitos e o resultado é reconciliado por uma única resposta final.

## Mídia em lote

Fluxo recomendado:

1. definir shots;
2. gerar/validar keyframes;
3. gerar vídeo a partir de still aprovado quando identidade importar;
4. verificar cada artefato;
5. pós-processar somente se a capacidade local existir;
6. concatenar;
7. validar arquivo final.

Uma sequência de prompts ou storyboard não é vídeo pronto.

## Segurança e autenticação

- somente endpoints oficiais/autorizados;
- xAI key server-side;
- sem anti-bot, cookie scraping ou rotação de proxy para contornar login;
- sessão Grok local pertence ao host local;
- ações locais potencialmente consequenciais continuam sujeitas a confirmação do operador;
- conteúdo retornado por busca permanece dado não confiável até passar pelos gates do Research.

## Proveniência

Padrões adaptados de `Wangnov/grok-skills`, licença MIT, consultado como fonte de skills/research/media. O PredictLM mantém implementação própria para compatibilidade com Next.js/Vercel e seu Provider Mesh.
