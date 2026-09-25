# TwinCore Host Parity

A TwinCore é o protocolo. O host determina as ferramentas concretas.

| Capacidade | Host com shell/sandbox | PredictLM |
| --- | --- | --- |
| Consulta CNJ | `scripts/legal/query_process.py` | `queryLegalProcess()` / `/api/legal/process` |
| DataJud + DJEN | Python/fetch | TypeScript nativo |
| Dossiê | `build_dossier.py` | `createLegalDossier()` / `/api/legal/dossier` |
| Arquivo | filesystem | Blob/download no chat e painel Processos |
| Council | modelo + protocolo | council-runtime + protocolo |
| Memória | filesystem/vault | local/adaptive memory |

## Invariantes

- DataJud + DJEN antes de narrar um processo.
- Timeout, 403 e `found=false` são estados diferentes.
- Dossiê é artefato estruturado, não resposta web genérica.
- AEGIS agressivo apenas com pedido explícito.
- Sem fallback silencioso para uma única fonte.
- Nenhuma implementação deve fingir ferramenta que o host não possui.
