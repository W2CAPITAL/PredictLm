---
name: brag-launch-video
description: Direção de vídeos curtos de lançamento/comercial do PredictLM inspirada no /brag (latent-spaces/brag, MIT). Inspeciona o produto real, escolhe hook e user flow, cria storyboard/composition brief, roteia para um renderer/provider realmente disponível e só conclui depois de validar um artefato reproduzível.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  source_repository: "latent-spaces/brag"
  source_license: "MIT"
  runtime: "provider-agnostic"
---

# PredictLM Brag Launch Video

Esta skill é a camada de **direção de lançamento** do pipeline de vídeo. Ela não é um provider de vídeo e não deve fingir que Hyperframes, FFmpeg, Veo, Seedance, Sora, Kling, ComfyUI ou qualquer outro renderer está disponível quando não estiver.

## Quando ativar

Ative para pedidos como:
- vídeo comercial do sistema;
- launch video;
- teaser do produto;
- demo curta para README;
- vídeo para GitHub/LinkedIn/X/Discord;
- “faça um vídeo mostrando o que esse app faz”;
- `/brag` ou “brag about this”.

Não ativar para um único clipe cinematográfico sem objetivo de produto, edição de vídeo já existente ou geração de imagem.

## Contrato

Fluxo obrigatório:

```
INSPECT
  -> POSITION
  -> HOOK
  -> USER FLOW
  -> STORYBOARD
  -> COMPOSITION BRIEF
  -> CAPABILITY PREFLIGHT
  -> RENDER
  -> VERIFY
  -> POSTER
  -> SHARE COPY
```

O Brag define **o que mostrar e por quê**. O renderer/provider define **como sintetizar/compor os frames**.

## 1. INSPECT — leia o produto de verdade

Prioridade:
1. README e documentação de produto;
2. rotas/páginas públicas;
3. componentes que representam o happy path;
4. tokens visuais e CSS;
5. package.json e arquitetura;
6. exemplos/demos;
7. assets públicos autorizados.

Nunca carregar para o brief:
- `.env*`, chaves, tokens ou credenciais;
- dados pessoais/clientes reais;
- URLs internas;
- build artifacts;
- dumps ou logs sensíveis.

Se a UI real contiver PII, substitua por dados fictícios antes do storyboard.

## 2. POSITION — responda o rubric antes de gerar

Registre de forma compacta:
1. O que o produto faz em uma frase?
2. Qual é a afirmação mais forte que pode ser demonstrada?
3. Qual é o melhor hook visual?
4. Qual tela/fluxo real deve aparecer?
5. Qual é a duração mínima satisfatória?
6. Qual tom combina com o produto?
7. Qual papel o áudio terá?
8. Qual frase curta serve como share copy?
9. Qual user flow real merece virar o centro do vídeo?

Sem respostas específicas, não renderize.

## 3. HOOK

Os primeiros 2–3 segundos precisam justificar o resto do vídeo.

Preferir:
- resultado antes da explicação;
- uma transformação observável;
- um fluxo real do produto;
- uma frase específica do produto.

Evitar:
- “Revolucione seu workflow”;
- fundos abstratos que serviriam para qualquer SaaS;
- logos demorados;
- claims não verificáveis.

## 4. STORYBOARD

Duração padrão: **15–25s**.

Estrutura-base:

```
Hook 2–3s
-> Reveal 2–4s
-> 2–3 product moments 5–12s
-> Outro 2–4s
```

A cadência pode variar, mas texto nunca pode desaparecer antes de ser lido.

Piso de leitura:
- label curta: ~0,8s assentada;
- headline/sentença: ~0,3s por palavra, mínimo ~1,2s;
- entradas podem ser rápidas; o hold precisa ser legível.

O centro deve mostrar **entry -> action -> result**, não apenas cards de marketing.

## 5. COMPOSITION BRIEF

O brief precisa incluir:
- objetivo;
- duração e aspect ratio;
- arquivos/telas do produto usados como fonte;
- copy que deve aparecer;
- cenas com timestamps;
- comportamento de câmera;
- transições;
- música/SFX;
- elementos reais de UI;
- dados fictícios usados para privacidade;
- critérios de aceitação.

Não prescrever APIs inexistentes ou uma stack específica se o runtime não a possui.

## 6. CAPABILITY PREFLIGHT

Antes de renderizar, descobrir o que está realmente disponível.

Rota preferida:
1. renderer/compositor configurado no host;
2. provider temporal real com retorno de vídeo;
3. composição programática/FFmpeg verificável;
4. storyboard exportável como fallback.

**Storyboard não é vídeo.** Prompt aceito por um provider não é vídeo. Job criado não é vídeo concluído.

Se Hyperframes existir, pode receber o composition brief. Se não existir, não é dependência obrigatória.

## 7. FOUR-CORE MEDIA CONTROL

Usar os quatro cores de forma leve:
- **Fly**: saliência, hook e eliminação de filler;
- **Mouse**: discriminação visual, continuidade espacial e detecção de artefatos;
- **Macaque**: hierarquia visual, composição, leitura de cena e continuidade entre planos;
- **Human**: objetivo, fidelidade ao produto, copy, working memory e QA final.

Nunca carregar Minecraft, Cognitive Lab completo, renderer 3D ou datasets brutos só para obter esses sinais.

## 8. RENDER

Para vídeo de produto:
- mostrar UI real ou reconstrução fiel;
- usar claims que o repositório realmente sustenta;
- evitar logos de providers na tela salvo se forem parte do produto;
- não usar depoimentos inventados;
- manter identidade visual do projeto;
- gerar áudio apenas quando suportado e pedido/adequado;
- voz é opt-in, não default.

## 9. VERIFY — gate obrigatório

Antes de dizer “pronto”:
- arquivo/URL de vídeo existe;
- mimetype/extensão é de vídeo;
- duração > 0;
- primeira e última cena existem;
- texto crítico é legível;
- o fluxo principal aparece;
- não há PII/segredos;
- não há claim impossível;
- áudio, se esperado, existe;
- asset abre/reproduz ou o provider confirma status terminal `completed`.

Em runtime local, validar com FFmpeg/ffprobe quando disponível.
Em provider remoto, aguardar estado terminal e validar a URL reproduzível.

Falha => corrigir/re-renderizar ou declarar a limitação específica. Nunca converter falha em sucesso textual.

## 10. POSTER + SHARE COPY

Escolha um frame forte já assentado — hook, hero ou payoff — em vez do primeiro frame arbitrário.

Share copy:
- 1–3 frases;
- postável sem edição;
- específica ao projeto;
- sem “excited to announce” e sem linguagem SaaS genérica.

## Artefatos esperados

```
brag-output/
  brag-plan.md
  composition-brief.md
  render-request.json
  brag.mp4 | verified-provider-url.txt
  brag.jpg
  share-copy.txt
```

## PredictLM launch preset

Para o próprio PredictLM, priorizar esta narrativa:
1. Chat como porta única.
2. CNJ -> DataJud + DJEN -> timeline -> explicação clara.
3. Build/Work dentro do mesmo Chat com VERIFY.
4. Fly/Mouse/Macaque/Human como controle leve, nunca como “cérebros mágicos”.
5. Imagine como capability isolada/lazy.
6. Final: “One assistant. Verified workflows.”

## Proveniência

Padrões de direção e entrega foram adaptados do repositório MIT `latent-spaces/brag`. O PredictLM mantém implementação própria e provider-agnostic; não copia o runtime Hyperframes nem assume disponibilidade dele. Ver `SOURCE-NOTES.md`.
