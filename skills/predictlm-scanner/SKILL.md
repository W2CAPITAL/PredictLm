---
name: predictlm-scanner
description: Skill standalone do scanner processual do PredictLM. Use quando houver CNJ, DataJud, DJEN, e-SAJ, tribunal, publicação ou consulta processual.
metadata:
  version: "1.0.0"
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
8. separar fato, hipótese e limitação;
9. responder ao pedido sem despejar detalhes do motor.

## Regras
- erro ≠ zero resultados;
- vazio ≠ inexistência;
- uma fonte falhar não apaga outra;
- portal oficial encontrado pesa mais que inferência baseada só em agregador;
- prazo/mérito depende do ato/inteiro teor quando a pergunta exigir isso.

## TJSP
O adapter tenta sessão/CSRF da consulta pública do e-SAJ e mantém `gru1` como região preferida do deployment.

## Ações judiciais
A skill pode explicar requisitos e preparar tudo até o ato externo. Protocolo, assinatura e pagamento exigem confirmação humana.
