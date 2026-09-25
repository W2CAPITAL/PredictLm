# CENTUM + PARALLAX

## Objetivo

Decisões, comparações, pedidos de certeza, aprovação, prontidão, risco e recomendação passam por um gate decisório antes da conclusão.

O objetivo não é fazer o usuário responder 100 perguntas.
As 100 perguntas são um protocolo interno para reduzir certeza falsa, omissões e decisões binárias frágeis.

## Pipeline obrigatório

RECALL
→ CLASSIFY
→ CENTUM 100
→ PLAN
→ FORGE
→ AEGIS
→ COUNCIL X10
→ CHAIR
→ THIRD BRAIN PARALLAX
→ VERIFY
→ ANSWER/EXECUTE
→ CAPTURE
→ IMPROVE

Execução externa/destrutiva continua exigindo autorização quando o produto já exige human gate.

## CENTUM 100

São exatamente 100 perguntas, divididas em 10 grupos de 10:

1. objetivo e definição;
2. evidência e fatos;
3. hipóteses e vieses;
4. alternativas e comparação;
5. riscos e perdas;
6. benefícios e oportunidade;
7. pessoas, incentivos e contexto;
8. reversibilidade e teste;
9. execução e realidade operacional;
10. certeza, falsificação e encerramento.

Cada pergunta é revisada internamente como:
SUPPORTED | CONTRADICTED | UNKNOWN | NOT_APPLICABLE.

UNKNOWN nunca vira fato.
CONTRADICTED precisa sobreviver até o julgamento de confiança/risco.

## Council X10

Depois do Centum, revisar:
1. Product / North Star;
2. Architecture / Systems;
3. Builder / Implementation;
4. UX / Human Factors;
5. Research / Domain;
6. Security / Abuse;
7. Failure / QA;
8. Legal / Privacy;
9. Operations / Cost;
10. Devil's Advocate.

O Chair reconcilia concordâncias e divergências.

## Third Brain — PARALLAX

PARALLAX não escolhe simplesmente FORGE ou AEGIS.

Ele procura:
- problema mal enquadrado;
- variável escondida;
- opção C;
- solução híbrida;
- experimento reversível;
- horizonte de tempo diferente;
- stakeholder ignorado;
- efeito de segunda ordem;
- sinal de unknown-unknown;
- condição que inverteria a conclusão.

Se não existir terceiro frame defensável, PARALLAX não inventa um.

## Strict Intent / sem fallback de conteúdo

A resposta final:
- entrega somente o pedido real;
- não troca o assunto por template genérico;
- não despeja checklist, skill, engine, provider, Council ou raciocínio interno;
- não usa knowledge chunk irrelevante como resposta substituta;
- se faltar evidência, declara a incerteza específica;
- falha de motor pode acionar outro motor técnico quando configurado, mas não pode alterar o conteúdo/objetivo solicitado.

## Performance

CENTUM só ativa quando há intenção de decisão/certeza/comparação/aprovação/risco/prontidão.
Pergunta factual simples e conversa casual não carregam as 100 perguntas.
Council executável usa Centum uma vez; não repete 100 checks dentro de cada uma das 10 lentes.

## Implementação

- `src/lib/decision-centum.ts`
- `src/lib/prompt-os/compiler.ts`
- `src/lib/browser-brain.ts`
- `src/lib/local-runtime-router.ts`
- `src/app/api/chat/route.ts`
- `src/lib/council-runtime.ts`
