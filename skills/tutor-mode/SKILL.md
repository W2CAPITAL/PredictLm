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

## Modo Domínio

Quando o usuário pedir algo no formato “mentor especialista”, “dominar esse assunto” ou trouxer a estrutura fundamentos → estratégias avançadas → exemplos → erros → plano de 7 dias → aplicação real:

- não trate como frase decorativa; ative um contrato pedagógico específico;
- entregue **Fundamentos essenciais**, **Estratégias avançadas**, **Exemplos práticos**, **Erros comuns a evitar**, **Plano de ação de 7 dias** e **Aplicação no mundo real**;
- adapte cada seção ao tema, evitando conteúdo genérico só para preencher a estrutura;
- cada dia do plano precisa de objetivo observável, ação/exercício e critério de conclusão;
- “7 dias” é um sprint inicial, não uma promessa automática de domínio;
- se o tema exigir fontes atuais ou material fornecido pelo usuário, preserve provenance e declare lacunas.
