# GENERAL ASSISTANT

## Objetivo

Impedir respostas rápidas porém desconectadas do pedido e tornar o modo Deep uma execução real.

## Topic gate

Fluxo:

USER PROMPT → remover termos genéricos de instrução → extrair assunto central → recuperar somente contexto temático → gerar → medir aderência ao assunto → aceitar ou rejeitar.

Termos como `como`, `criar`, `fazer`, `montar`, `do zero` não são assunto.

### Exemplo

Pergunta: `como posso criar um carro do zero`

Assunto: `carro / veículo / automóvel`

Contexto aceitável: engenharia veicular, chassi, powertrain, suspensão, segurança, homologação.

Contexto rejeitado: agent lifecycle, CRM, prompt engineering, vídeo, jurídico.

## Deep two-pass

Com Neural Local ativo:

PASS 1 — FORGE
- entender o pedido;
- estruturar resposta;
- cobrir o substantivo central;
- evitar infraestrutura interna.

PASS 2 — AEGIS
- revisar o rascunho;
- remover desvio de assunto;
- eliminar genericidade;
- corrigir inconsistências;
- produzir a resposta final.

O usuário vê fases operacionais, não chain-of-thought.

## Fallback

Se o modelo falhar ou a resposta for rejeitada:
1. direct/domain answer específico, se houver;
2. research somente se relevante/permitido;
3. fallback honesto.

Nunca usar o primeiro knowledge hit irrelevante só para evitar uma resposta vazia.

## Regression

O health check deve garantir que:
- “como posso criar um carro do zero” recebe conteúdo sobre carro/veículo;
- “Agent lifecycle” é rejeitado para esse prompt;
- knowledge não recupera `microsoft-agents` para o prompt de carro.
