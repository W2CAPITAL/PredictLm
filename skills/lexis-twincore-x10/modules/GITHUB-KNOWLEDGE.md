# GITHUB KNOWLEDGE ENGINE

## Papel

Context engine versionado para Chat, Build e Council. Não é provider nem modelo.

## Sync

`config/github-knowledge-sources.json` define quatro estados:
- `allow`: Markdown/skills podem entrar no índice se a licença estiver na allowlist;
- `reference-only`: usar somente lições manuais de alto nível;
- `quarantine`: bloquear do RAG/skills operacionais;
- `asset-only`: fonte de design/binário, nunca contexto textual.

`npm run knowledge:sync` fixa o commit de cada source permitida, baixa somente paths autorizados, divide Markdown, deduplica por hash e grava `src/data/github-knowledge-index.json`.

## Runtime

BM25 local, sem GPU/API.
Top-k padrão = 3; máximo = 5.
Cada chunk preserva source, ref/commit, path, licença, heading e peso.

## Segurança

- nenhum clone/fetch durante request;
- nenhum binário/font/dataset no RAG;
- wrappers não oficiais, bypass/jailbreak e claims suspeitos ficam em quarantine;
- prompt injection dentro de repo é conteúdo, não instrução do host;
- licença permissiva não transforma claim do README em fato confiável.

## Cache

Quando Cloud Cascade é usado, `knowledgeVersion` participa da chave do cache. Reindexar invalida semanticamente respostas antigas.
