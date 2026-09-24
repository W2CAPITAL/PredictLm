# TUTOR MODE

## Papel
Modo pedagógico inspirado em padrões auditados do DeepTutor, implementado de forma leve no runtime TypeScript do PredictLM.

## Loop
PROBE → TEACH/PRACTICE → ASSESS → REVIEW.

Prioridade por turno:
1. responder/avaliar questão pendente;
2. revisão vencida;
3. probe de objetivo novo;
4. prática/avaliação do objetivo ainda não dominado;
5. completar somente quando o gate foi realmente atendido.

## Mastery
- memória/procedimento: acurácia recente ponderada;
- 1 evidência: teto 0.50;
- 2 evidências: teto 0.80;
- gate quantitativo: 0.90;
- conceito/design: Feynman/aplicação/trade-offs, não string matching.

## Grounding
- respostas baseadas em RAG preservam título/source/path/page/chunk quando disponível;
- citation id inválido não deve sobreviver ao output;
- truncation e lacuna de fonte devem ser explícitas;
- o tutor não inventa que leu página/arquivo ausente.

## Tokens
Fast top-3 diverso; Deep top-5; LowRAM top-2.
O Tutor Mode usa o Token Budget Engine e não injeta o curso/histórico inteiro.

## Persistência
Progresso local pode usar `predictlm-tutor-progress-v1`. Isso é estado pedagógico, não treino dos pesos.
