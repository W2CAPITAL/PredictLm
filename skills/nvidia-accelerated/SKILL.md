---
name: nvidia-accelerated
description: Roteador interno do PredictLM para as NVIDIA Agent Skills solicitadas: RAG/AI-Q/NeMo Retriever, cuDF/DALI, cuOpt/CUDA-Q, DeepStream, Nemotron e Omniverse/Physical AI. Usa GPU apenas quando existe um host compatível; Vercel fica como orquestrador/cliente.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  source_repository: "NVIDIA/skills"
  source_license: "Apache-2.0 / CC-BY-4.0 por skill"
  public_identity: "PredictLM"
---

# NVIDIA Accelerated Skill Fabric

Esta skill incorpora os padrões das NVIDIA Agent Skills sem fingir que um deploy Vercel possui CUDA, Omniverse ou GPU local.

## Regra de execução

Classifique cada capability em uma destas rotas:

- **vercel-safe** — formulação/lógica leve que pode rodar no servidor web;
- **remote-service** — Vercel chama por HTTP um serviço GPU/RAG externo;
- **gpu-host** — exige workstation/cloud GPU com CUDA/Omniverse/DeepStream/cuOpt/etc.;
- **local-tooling** — utilitário de desenvolvimento/CI, não runtime do usuário.

Mapa canônico no código: `src/lib/nvidia-capability-router.ts`.

## Skills incorporadas

### RAG / Research
- `rag-blueprint` — arquitetura/deploy/troubleshooting de RAG; externo.
- `rag-eval` — avaliação RAGAS e regressão de qualidade; externo/CI.
- `aiq-research` — deep research por backend AI-Q acessível.
- `aiq-deploy` — deploy do AI-Q em host próprio.
- `nemo-retriever` — ingest/query documental local ou via serviço.

### Data / Performance
- `accelerated-computing-cudf` — pandas/cuDF para ETL grande; GPU externa.
- `dali-dynamic-mode` — data loading/preprocess GPU; GPU externa.
- `data-designer` — geração de datasets sintéticos; ferramenta local/CI.

### Optimization / CUDA-Q
- `cuopt-developer`
- `cuopt-install`
- `cuopt-routing-api-python`
- `cuopt-server-api-python`
- `cuopt-numerical-optimization-formulation`
- `cudaq-guide`

Formulação LP/MILP/QP pode ser feita no próprio app. Solver cuOpt/CUDA-Q acelerado exige backend apropriado.

### Video / 3D / Physical AI
- `deepstream-dev` — analytics de vídeo com DeepStream/TensorRT em GPU.
- `omniverse-usd-performance-tuning` — profiling/otimização USD.
- `omniverse-cad-to-simready` — CAD → SimReady.
- `omniverse-realtime-viewer` — viewer USD/ovrtx/ovstream.
- `physical-ai-infrastructure-setup-and-resilient-scaling` — Kubernetes/NIM/OSMO.
- `physical-ai-neural-reconstruction` — NuRec/NRE.

Essas rotas não são instaladas dentro do runtime Vercel. PredictLM pode gerar configuração, chamar serviço remoto autorizado e interpretar resultados.

### Model customization / Governance
- `nemotron-customize` — curation, SFT/PEFT, alignment, eval e conversão em ambiente Nemotron.
- `skill-card-generator` — skill cards/governança; ferramenta de desenvolvimento.

## Como isso melhora o PredictLM

1. **RAG** — separar deploy, retrieval e avaliação; não declarar melhoria sem benchmark.
2. **Research** — AI-Q/NeMo podem ser adapters quando um backend externo estiver realmente acessível.
3. **Dados grandes** — cuDF/DALI só entram quando o workload e hardware justificarem; não adicionar CUDA ao bundle web.
4. **Otimização** — cuOpt pode resolver rotas/LP/MILP por serviço externo; formulação fica disponível sem GPU.
5. **Vídeo** — DeepStream serve analytics/streaming GPU; não substitui o pipeline de geração de vídeo do navegador.
6. **Minecraft/Simulação** — Omniverse pode ser backend externo de USD/performance/streaming, nunca substituto silencioso do renderer web.
7. **Skills** — skill-card-generator e catálogo NVIDIA melhoram governança e atualização de capabilities.

## Performance rule

Não instalar dependências CUDA/Omniverse no Next.js/Vercel para 'acelerar' o app. Isso aumenta build e falha no runtime sem GPU. O ganho vem de:

- browser: chunking/render/cache/WebGPU quando suportado;
- Vercel: rotas curtas, cache, provider budgets e clientes HTTP;
- GPU host: cuDF/DALI/cuOpt/DeepStream/Omniverse quando realmente necessário;
- RAG: retrieval menor + eval antes/depois.

## Atualização

O catálogo NVIDIA muda continuamente. Antes de copiar comandos/version pins, verificar a skill upstream atual. O repo oficial recomenda `npx skills update` para instalações locais.

## Proveniência

Fonte: `NVIDIA/skills`, skills oficiais verificadas pela NVIDIA. Cada skill mantém sua própria licença e requisitos. PredictLM usa implementação própria e roteamento por capability.
