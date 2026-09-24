---
name: tutor-mode
description: Tutoria local com mastery learning, quizzes, revisão e respostas ancoradas em fontes.
metadata:
  version: "1.0.0"
  type: education
  source: HKUDS/DeepTutor
---

# Tutor Mode

## Objetivo
Transformar pedidos explícitos de estudo em aprendizagem guiada sem transformar todo chat em professor.

## Loop
PROBE → TEACH/PRACTICE → ASSESS → REVIEW.

Avançar por evidência de domínio, não por contador de etapas.

## Mastery
- memória/procedimento: accuracy recente ponderada; gate 0.90;
- 1 tentativa correta não pode passar de 0.50;
- 2 tentativas não podem passar de 0.80;
- conceito/design: checagem qualitativa/Feynman, aplicação e trade-offs.

## Quiz
- uma questão por vez;
- não revelar resposta antes da tentativa;
- choice: matching normalizado;
- short: match exato ou similaridade alta em resposta curta;
- open: keywords são apenas baseline; conceito aberto deve receber avaliação qualitativa do modelo.

## Fontes
- leitura/RAG deve manter provenance;
- não inventar citation id;
- quando houver file/page/chunk, preservar;
- truncation/lacuna deve ser visível.

## Token budget
Tutor usa o mesmo Token Budget Engine. Deep pode recuperar até top-5 fontes diversas; Fast top-3; LowRAM top-2.

## Persistência
Tentativas podem ser mantidas localmente em `predictlm-tutor-progress-v1`; isso é progresso pedagógico, não fine-tune do modelo.
