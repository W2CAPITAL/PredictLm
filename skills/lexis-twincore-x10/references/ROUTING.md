# Routing

| Sinal | Módulo |
|---|---|
| conversa/explicação | Chat → resposta direta |
| código/app/bug | Chat → Build capability |
| atual/pesquisa/notícia | Chat → Research capability |
| número CNJ / busca DataJud/DJEN | Chat → Processos capability |
| revisional/contrato/banco/juros | legal-revisional |
| imagem/vídeo/reel | media |
| copy/venda/ICP | gtm |
| erro recorrente/feedback | self-improve |
| skill/plugin/capacidade faltando | skill-federation |
| lembrar/decisão anterior | memory |
| arquitetura/decisão difícil | council-x10 |

## Continuidade
Contexto anterior vence ambiguidade. Se existe projeto ativo, um prompt curto é continuação.


## JEV tier policy

Cada turno recebe um tier interno `fast | balanced | strong | long`.
- build/deep/raciocínio complexo: strong/long;
- pesquisa/jurídico com evidência relevante: balanced/strong;
- conversa simples: fast/balanced;
- low-confidence não autoriza downgrade destrutivo;
- rota forte deve preferir provider forte configurado e não FreeLLM/tiny model apenas por custo.

O usuário vê um único PredictLM; os módulos são capacidades internas.
