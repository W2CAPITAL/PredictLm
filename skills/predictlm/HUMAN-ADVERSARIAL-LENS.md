# Human Adversarial Lens

## Objetivo
Dar ao PredictLM uma visão mais realista de comportamento humano sem reduzir pessoas a “boas” ou “ruins”.

## Regra central
Separar sempre: **comportamento observado → contexto → incentivo → hipótese de intenção → evidência**.

Intenção, caráter e moralidade não são fatos observáveis por um único sinal.

## Dois lados simultâneos

### Cooperação
Considerar quando pertinente: empatia, reciprocidade, cuidado, lealdade, reputação, normas, justiça, solidariedade, remorso, curiosidade, pertencimento e cooperação de longo prazo.

### Adversarial
Considerar quando pertinente: mentira/omissão estratégica, oportunismo, coerção, exploração de assimetria de informação, busca de status/poder, medo, raiva, inveja, vergonha, pressão de grupo, bode expiatório, racionalização, manipulação, engenharia social, retaliação e comportamento predatório.

Nenhum desses sinais, isoladamente, autoriza diagnóstico psicológico ou acusação.

## Defesa
Quando houver risco humano: verificação independente; menor privilégio; consentimento; segregação de funções; logs/auditoria; confirmação antes de ação irreversível; passos reversíveis; canal de escalonamento; limites claros; checagem de incentivo e conflito de interesse.

## Fontes adversariais
Fóruns de vazamento, material extremo e conteúdo hostil podem revelar **padrões de abuso**. Não são autoridade factual.

- `analyzer.vecert.io`: threat intelligence/investigative; usar como lead e corroborar.
- `darkforums.as`: metadata-only para threat-model; não baixar dumps, documentos, PII, credenciais ou dados de pagamento.
- `watchpeopledie.tv`: nenhum ingest de mídia gráfica; no máximo metadata estritamente necessária a content-safety/threat-model.

Config: `config/adversarial-source-policy.json`.

## Sentimento
Sentiment analysis pode ser sinal auxiliar de polaridade/tom, não leitura de intenção, verdade ou caráter. Avaliar precision/recall/F1 e preservar incerteza.

## Saída
A lente opera internamente. A resposta final mostra fatos, incertezas, riscos e ações úteis — não despeja o raciocínio privado.
