---
name: free-provider-fabric
description: Malha de providers/API de baixo custo do PredictLM. Integra bridges self-hosted (LocalCodeCli, GPTOSS Proxy, Puter Pool), presets de providers públicos catalogados pelo Free-LLM e descoberta de APIs sem chave do free-apis-list, sempre com budget, rate limit, circuit breaker e sem fingir credenciais ou contornar autenticação.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  sources:
    - Corporationakht/LocalCodeCli
    - junioralive/gptoss-proxy
    - Parithosh-Varma/puter-pool
    - spinov001-art/free-apis-list
    - nejib1/Free-LLM
---

# Free Provider Fabric

## Objetivo

Diminuir dependência de uma única API e impedir que o app consuma toda a cota por causa de retries, reviewers ou agent swarms.

A malha usa quatro camadas:
1. local/self-hosted — preferida quando alcançável;
2. free-tier — providers com chave/tier gratuito explicitamente configurados;
3. metered — providers pagos/creditados;
4. public-data — APIs de dados sem chave, usadas como fonte de pesquisa e nunca como substitutas de LLM.

## Budget padrão

`PREDICTLM_API_BUDGET_MODE=conservative`

No modo conservador:
- até 2 chamadas remotas por turno;
- até 1 chamada classificada como metered por turno;
- review multi-provider desligado;
- repair extra desligado;
- soft cap diário por provider/instância;
- soft cap diário por sessão/instância.

Modos: conservative, balanced, quality, unlimited.

## LocalCodeCli

Fonte: `Corporationakht/LocalCodeCli` (MIT).

O PredictLM usa a interface OpenAI Responses do proxy.

```env
LOCALCODE_BASE_URL=http://127.0.0.1:8082
LOCALCODE_API_KEY=freecc
LOCALCODE_MODEL=<gateway model configured in LocalCodeCli>
```

No Vercel, localhost não aponta para o PC do usuário. Para produção, use um bridge de rede autorizado e protegido.

## GPTOSS Proxy

Fonte: `junioralive/gptoss-proxy` (MIT).

A integração é opt-in e só aceita um endpoint configurado pelo operador:

```env
GPTOSS_PROXY_BASE_URL=https://SEU-WORKER.workers.dev
GPTOSS_PROXY_API_KEY=
GPTOSS_PROXY_MODEL=gpt-oss-20b
```

PredictLM não usa automaticamente o upstream público encontrado no código do projeto e ignora reasoning_content privado.

## Puter Pool

Fonte: `Parithosh-Varma/puter-pool`.

Uso somente como endpoint já operado pelo usuário:

```env
PUTER_POOL_BASE_URL=http://127.0.0.1:3000
PUTER_POOL_API_KEY=
PUTER_POOL_MODEL=<modelo>
```

O PredictLM não cria contas Puter, não coleta tokens do navegador, não automatiza verificação e não gerencia rotação de contas.

## Free-LLM presets

Fonte: `nejib1/Free-LLM` (MIT).

Presets por ENV: Mistral, Hugging Face Router, Together, Fireworks, SambaNova, Cerebras, DeepInfra, Requesty, ModelScope, SiliconFlow, Nebius, Novita, Scaleway, Venice, Friendli, Inference.net, LLM7, Hetzner, Nous e Ollama Cloud.

Nenhum é chamado sem chave/modelo explicitamente configurado.

## Provider genérico

Para adicionar um OpenAI-compatible provider sem editar código:

```env
PREDICTLM_EXTRA_PROVIDERS_JSON=[{"name":"meu-provider","base":"https://api.exemplo.com/v1","model":"modelo","keyEnv":"MEU_PROVIDER_API_KEY","costHint":"free-tier"}]
MEU_PROVIDER_API_KEY=...
```

Protocolos: `openai`, `anthropic` e `responses`. Chaves inline no JSON ficam desabilitadas por padrão.

## free-apis-list

Fonte: `spinov001-art/free-apis-list` (MIT).

Serve como catálogo de descoberta de APIs públicas de pesquisa, clima, governo, livros, desenvolvimento, geografia, ciência, social e segurança. Uma API não é executada automaticamente só por aparecer no README.

## Política de custo

Prioridade:
1. cache/local;
2. LocalCode/FreeLLMAPI/Ollama/self-hosted;
3. free-tier configurado;
4. metered provider.

Fallback não significa fan-out. O próximo provider só é tentado quando o anterior falha ou é rejeitado e ainda existe orçamento.

## Agentic cost control

Por padrão:
- Chat não usa reviewer remoto separado;
- Build faz uma passagem única;
- Report Architect faz uma passagem única;
- Media Director faz uma passagem única;
- repairs extras ficam desligados.

Para reativar:

```env
PREDICTLM_ENABLE_AGENTIC_REVIEW=true
PREDICTLM_ENABLE_REPAIR_CALLS=true
PREDICTLM_API_BUDGET_MODE=quality
```

## Limitação do soft daily cap

Em Vercel serverless, o ledger em memória é soft e por instância. Ele reduz loops e bursts, mas não substitui um contador global persistente. Para enforcement global estrito, use Redis/KV/Postgres.

## Segurança

Nunca tratar free como autorização para burlar autenticação, colher cookies/tokens, criar contas em massa ou contornar rate limits. A malha usa somente endpoints configurados/autorizados.
