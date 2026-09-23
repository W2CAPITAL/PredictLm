---
name: predictlm-scanner
description: Skill standalone do scanner processual do PredictLM. Use quando houver CNJ, DataJud, DJEN, e-SAJ, tribunal, publicação ou consulta processual.
metadata:
  version: "1.1.0"
  repository: "W2CAPITAL/PredictLm"
  endpoint: "/api/legal/process"
---

# PredictLM Scanner

## Fluxo
1. validar CNJ;
2. resolver tribunal;
3. DataJud e DJEN em paralelo;
4. classificar timeout/429/403;
5. acionar portal oficial quando necessário;
6. preservar resultado parcial;
7. normalizar timeline;
8. interpretar a cadeia processual;
9. classificar impacto prático por parte;
10. gerar próximos passos;
11. separar fato, hipótese e limitação;
12. responder ao pedido sem despejar detalhes do motor.

## Regras
- erro ≠ zero resultados;
- vazio ≠ inexistência;
- uma fonte falhar não apaga outra;
- portal oficial encontrado pesa mais que inferência baseada só em agregador;
- prazo/mérito depende do ato/inteiro teor quando a pergunta exigir isso;
- extinção + trânsito prevalecem sobre uma intimação administrativa posterior;
- “custas satisfeitas” não reabre processo automaticamente;
- a resposta padrão precisa explicar o significado dos eventos, não copiar o DJEN cru;
- CSS/HTML e entidades devem ser removidos antes de mostrar publicação.

## TJSP
O adapter tenta sessão/CSRF da consulta pública do e-SAJ e mantém `gru1` como região preferida do deployment.

## Ações judiciais
A skill pode explicar requisitos e preparar tudo até o ato externo. Protocolo, assinatura e pagamento exigem confirmação humana.
