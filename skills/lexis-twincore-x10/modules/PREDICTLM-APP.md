# PredictLM App Integration

## Chat
- criar conversa;
- trocar conversa;
- apagar conversa;
- responder sem boilerplate de fallback/skill.

## Build
- múltiplas builds persistentes;
- nova build;
- trocar build;
- apagar build;
- clone;
- continuar de onde parou;
- export ZIP.

## Processos
- DataJud;
- DJEN;
- e-SAJ TJSP com sessão/CSRF;
- `gru1`;
- timeline + interpretação processual;
- resposta em “como está / o que aconteceu / bom ou ruim / o que fazer”;
- sanitização de CSS/HTML/entidades do DJEN;
- distinção entre quitação de custas e reabertura real;
- requisitos de ajuizamento quando solicitados.

## Imagine / Media
- geração de imagem via provider configurado ou provider público;
- Media Library;
- Supabase metadata-only;
- exclusão;
- animação local WebM sem API;
- adapters de vídeo avançado como referência/opcionais.

## Storage strategy
Postgres guarda prompt, seed, estilo, dimensões, URLs e metadados. Binário não é salvo por padrão.
Bucket privado `predict-media` é reservado para imagens pequenas explicitamente fixadas.
