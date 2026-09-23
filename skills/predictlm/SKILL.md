---
name: predictlm
description: Skill do próprio PredictLM. Use para conversar, construir/continuar apps, pesquisar, gerar mídia, consultar processos por CNJ, revisar estratégia jurídica, executar Council X10, gerir memória e produzir melhorias seguras no próprio projeto.
metadata:
  version: "1.3.0"
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
CNJ → tribunal → DataJud + DJEN → portal oficial → timeline → interpretação processual → resposta prática.

Para processo, a resposta padrão é:
- como está agora;
- o que aconteceu;
- se é bom/ruim e para qual parte;
- o que fazer agora;
- linha do tempo essencial.

Falha de uma fonte não apaga as demais. Erro não é zero resultados. Ausência pública não prova inexistência. Evento administrativo posterior não deve esconder sentença, extinção ou trânsito em julgado.

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
Imagem: prompt → geração → proxy same-origin → review → histórico metadata-only.
Vídeo 1 cena: keyframe → motion local WebM → preview/download.
Vídeo 3 cenas: storyboard coerente → 3 keyframes → transições/movimento → WebM → preview/download.
O app nunca trata roteiro/prompt como vídeo pronto. Binários grandes ficam locais por padrão; Supabase recebe apenas metadados leves.

## Prompt OS
O app compila prompts por intenção e recupera apenas padrões relevantes. Repositórios de leaks, red-team, copyleft ou licença incerta são referência/eval, não instrução runtime copiada.

## Self Improve
feedback/erro → cluster → hipótese → patch candidato → build/eval → branch/PR → gate humano.

Nunca auto-merge silencioso.


## Atualização contínua das skills
Quando novas referências relevantes forem adicionadas ao PredictLM, atualizar em conjunto:
1. `src/lib/training/source-registry.ts`;
2. `src/lib/training/learned-lessons.ts`;
3. `scripts/training/sync-sources.mjs`;
4. esta skill e qualquer módulo operacional afetado.

Licença permissiva verificada (MIT/Apache-2.0) pode alimentar corpus de treino/distilação conforme o modo registrado. Repositório sem licença declarada permanece `reference`: usar apenas padrões arquiteturais de alto nível, sem copiar/ingerir código.

## Build SWE loop
Para app complexo, o Build opera como:
SPEC → PLAN → INSPECT → PATCH → VERIFY → REPAIR → REVIEW → PACKAGE.

Regras:
- 3+ fluxos exigem navegação/sidebar real e estados de rota, não cards soltos;
- formulários e mutações exigem validação de domínio antes de salvar;
- integrações ficam isoladas em `src/integrations`/backend, com segredo no servidor;
- nenhum botão/toggle pode fingir integração ou ação que não existe;
- CRUD precisa criar/ler/editar/excluir de verdade na fronteira de persistência escolhida;
- após refino neural, rodar smoke/Council novamente;
- em Max, se a verificação falhar e o neural estiver disponível, executar uma rodada de reparo focada nas falhas antes de empacotar.

## Gemini + DAIV + AssistantsHub pack
- Gemini clones licenciados: padrões de shell responsivo, progresso/streaming, markdown/code e recuperação de erro.
- DAIV: ciclo issue/plan/edit/test/review/CI, skills, MCP e sandbox/egress explícitos.
- Assistants Hub: gestão de assistentes, múltiplos providers, histórico, analytics, documentos e funções.
- Gemini Code, Dr.Ai e GeminiCoder sem licença declarada: somente referência arquitetural até verificação.
