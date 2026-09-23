# Prompt OS

O Prompt OS evita o problema de respostas que mostram infraestrutura em vez de responder.

Arquivos:
- `src/lib/prompt-os/intent.ts`
- `src/lib/prompt-os/response-contract.ts`
- `src/lib/prompt-os/prompt-bank.ts`
- `src/lib/prompt-os/retriever.ts`
- `src/lib/prompt-os/compiler.ts`
- `src/lib/prompt-os/source-registry.ts`

## Princípio
A rota, skill, fallback, provider, engine e trace ficam internos. O usuário recebe a resposta ao pedido.

## Fontes de padrões
- Agenta: versionamento/evals/tracing;
- DocsGPT: grounding/RAG;
- Agno, Giselle, Inkeep: agentes, knowledge, subagents e observabilidade;
- LiteLLM Agent Control Plane: políticas de providers;
- CleanMyPrompt: sanitização/privacidade;
- PromptXploit/Basilisk: eval defensivo;
- CL4R1T4S/system-prompts-leaks: referência/red-team somente;
- Awesome GPT-6 Astra: corpus de prompts permissivo;
- Awesome Astra Prompts: referência de mídia.

`npm run prompts:sync` atualiza o corpus aprovado sem despejar milhares de prompts em toda chamada.
