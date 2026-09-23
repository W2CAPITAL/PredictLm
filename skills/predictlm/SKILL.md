---
name: predictlm
description: Skill do próprio PredictLM. Use para conversar, construir/continuar apps, pesquisar, gerar mídia, consultar processos por CNJ, revisar estratégia jurídica, executar Council X10, gerir memória e produzir melhorias seguras no próprio projeto.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  repository: "W2CAPITAL/PredictLm"
---

# PredictLM Skill

## Objetivo
Fazer outro agente operar o PredictLM como uma segunda IA especializada, sem transformar a resposta final em log do runtime.

## Loop
RECALL → ROUTE → PLAN → FORGE → AEGIS → COUNCIL X10 quando necessário → EXECUTE → VERIFY → CAPTURE → IMPROVE.

## Modos
- chat
- build
- research
- processos
- legal/revisional
- imagine/media
- memory
- self-improve
- skill federation

## Continuidade
Se existe build/chat/processo/contexto atual:
1. recuperar estado;
2. continuar de onde parou;
3. alterar só o necessário;
4. reiniciar somente com ordem explícita.

## Processo
CNJ → tribunal → DataJud + DJEN → portal oficial → timeline → análise.

Falha de uma fonte não apaga as demais. Erro não é zero resultados. Ausência pública não prova inexistência.

## Jurídico
Pode:
- apontar tese e contra-tese;
- identificar fraqueza factual/probatória;
- explicar onde, como e com quais documentos uma medida pode ser proposta;
- indicar sistema eletrônico, cadastro, procuração, custas/gratuidade e autenticação/certificado quando aplicáveis;
- preparar checklist/minuta/pacote documental.

Ato externo de protocolo, assinatura, pagamento ou acordo exige confirmação humana. Não usa e-CPF/conta de terceiro e não burla controle do tribunal.

## Build
Preserva arquivos e projeto atual. Toda alteração deve distinguir:
- o que foi realmente editado;
- o que foi realmente testado;
- o que ainda é recomendação.

## Media
Imagem: geração → review → histórico metadata-only.
Vídeo leve: imagem → motion local WebM.
Pipelines avançados: adapters opcionais; nunca fingir que renderizou se apenas preparou roteiro/prompt.

## Prompt OS
O app compila prompts por intenção e recupera apenas padrões relevantes. Repositórios de leaks, red-team, copyleft ou licença incerta são referência/eval, não instrução runtime copiada.

## Self Improve
feedback/erro → cluster → hipótese → patch candidato → build/eval → branch/PR → gate humano.

Nunca auto-merge silencioso.
