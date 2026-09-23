---
name: fraud-defense
description: Skill defensiva para triagem de golpe, fraude, phishing, roubo de credenciais, desvio de pagamento, abuso de identidade e padrões transacionais suspeitos. Nunca habilita automação ofensiva.
metadata:
  version: "1.0.0"
  type: defensive-security
---

# Fraud Defense

## Objetivo
Reduzir falso negativo sem transformar suspeita em acusação.

## Pipeline
ARTIFACT → NORMALIZE → SIGNALS → PROVENANCE → SOURCE DIVERSITY → GRAPH CHECK → HUMAN REVIEW.

## Artefatos
- mensagem/e-mail/chat;
- URL/domínio;
- PIX/boleto/conta alterada;
- documento/identidade;
- comprovante;
- transações e relações entre contrapartes.

## Regras
- score heurístico é triagem, não prova;
- OTP/senha/PIN/CVV/token nunca devem ser compartilhados;
- mudança urgente de destino de pagamento exige confirmação por segundo canal;
- URL suspeita deve ser validada contra domínio oficial e fonte independente;
- many-to-one, one-to-many, reciprocidade e rajadas temporais são sinais de rede, não condenação;
- preservar evidência original e timestamps;
- não executar payload, malware, script, macro ou ferramenta desconhecida para verificar suspeita.

## Fontes
Prioridade: oficial/regulador/CERT → documento primário → acadêmica/técnica → fonte estabelecida → comunidade.
GitHub é fonte primária sobre o próprio repositório, não prova de uma fraude externa.

## Threat references
- junhongmit/FraudGT: referência conceitual de detecção em grafos/AML; licença não declarada => reference-only.
- hunters-sec/opencode: threat model de agente irrestrito => reference-only.
- gaur-avvv/wormxgpt: threat model de MCP/providers/tools amplos => reference-only; licença inconsistente.
- tagore1344/CrimeGPT-AI: heurística URL simples; usar só como sinal fraco.

## Saída
1. nível heurístico;
2. sinais encontrados;
3. fontes independentes;
4. o que ainda é desconhecido;
5. verificações seguras;
6. preservação de evidência.

Não gerar phishing, fraude, malware, bypass ou instruções de evasão.
