# TOKEN BUDGET

## Objetivo
Reduzir custo/contexto sem apagar intenção, evidência ou continuidade.

## Ordem de preservação
1. pedido atual;
2. fatos/fontes de alta prioridade;
3. decisões recentes;
4. top-k de knowledge/skills;
5. histórico recente;
6. contexto antigo/repetido.

## Modos
- Lite: Deep/alta complexidade; preserva mais histórico/contexto.
- Full: default.
- Ultra: cota/contexto muito apertados; nunca usar em dossiê sem preservar evidência crítica.

## Técnicas
- dedup por normalização;
- histórico por orçamento, não por N fixo;
- compactação por sentença/head-tail somente depois de dedup;
- top-k adaptativo;
- snapshot de Build compactado;
- contexto de Council sem repetir RAG inteiro;
- image/video brief separado do chat.

## Medição
Registrar before, after, savedPct, droppedMessages e dedupedBlocks.
Percentuais de repositórios externos não são tratados como garantia.

## LLMLingua
`atjsh/llmlingua-2-js` é referência para compressão semântica opcional.
Não ativar por padrão enquanto exigir um modelo compressor extra que aumente RAM/download no cliente fraco.
