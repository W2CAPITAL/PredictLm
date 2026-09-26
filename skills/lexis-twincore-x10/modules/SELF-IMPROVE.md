# Self Improve

OBSERVE → VERIFY → LEARN → DESIGN → EXPERIMENT → ANALYZE → COMPARE → PROMOTE.

O fluxo de engenharia combina o gate já existente do PredictLM com o padrão experimental do ASI-Evolve:
- **OBSERVE/VERIFY**: capturar falhas reais e confirmar que não são ruído;
- **LEARN**: recuperar tentativas anteriores, evidência e lições relevantes;
- **DESIGN**: gerar um candidato mínimo (regra, router, prompt, skill, código ou configuração);
- **EXPERIMENT**: executar benchmark/testes contra baseline congelado;
- **ANALYZE**: registrar resultado, regressões, custo e por que funcionou/falhou;
- **COMPARE**: manter apenas candidato que supera baseline sem quebrar gates;
- **PROMOTE**: branch/PR/artifact → CI → gate humano/sistema → merge.

Hierarquia:
1. regra;
2. router;
3. prompt/template;
4. skill/context;
5. modelo/few-shot;
6. provider.

Toda melhoria precisa: problema, frequência, impacto, hipótese, mudança, teste, métrica antes/depois, risco e rollback.

Sem escrita no host: gerar patch/version/changelog; não afirmar autoatualização.


## PredictLM feedback loop

Runtime signals:
- `POST /api/feedback` captures useful / incomplete / error signals.
- Supabase table: `predict_feedback_events`.
- Retention is intentionally compact; only fingerprint, short excerpt, surface and metadata are stored.
- `npm run selfimprove:collect` produces `reports/selfimprove/feedback.json`.

Application rule:
1. collect repeated failures;
2. cluster by surface/intent;
3. choose the smallest fix: rule → router → prompt → skill → code → model/provider;
4. create candidate patch;
5. run build/evals;
6. compare before/after;
7. open PR or artifact;
8. require a gate for merge/deploy.

The app may learn from errors; it may not silently rewrite production.


## Experiment memory

Cada tentativa deve ser tratada como experimento endereçável, não como "aprendizado" abstrato:

- problema / hipótese;
- baseline/commit de origem;
- patch candidato;
- conjunto de testes/evals;
- métricas antes/depois;
- falhas/regressões;
- decisão: rejeitado, manter para estudo, promover;
- lição reutilizável.

A memória de experimentos impede repetir patches que já falharam e permite seleção orientada por resultado. Estratégias como greedy/UCB/islands podem ser usadas **apenas para escolher candidatos em experimentos**, nunca para conceder objetivos externos autônomos ou permissão de modificar produção.

## Boundary de auto-aprimoramento

O PredictLM pode:
- propor mudanças em prompts, skills, roteamento, código e configuração;
- gerar patches;
- executar testes/benchmarks autorizados;
- comparar candidatos e registrar lições.

O PredictLM não pode:
- transformar uma saída de modelo em regra durável silenciosamente;
- promover memória/skill/código sem o gate previsto;
- criar metas externas permanentes por conta própria;
- interpretar self-model, drives ou metacognição funcional como prova de experiência subjetiva.

Referências arquiteturais:
- GAIR-NLP/ASI-Evolve — loop LEARN → DESIGN → EXPERIMENT → ANALYZE e memória de experimentos;
- 269652/artificial-consciousness-ai — separação entre memória episódica/autobiográfica/semântica e observabilidade;
- jasonkresch/bots — seleção/mutação/fitness para simulação controlada;
- asi-alliance/Max_folio — failure modes/self-audit como referência, sem importar autonomia irrestrita.


## Autonomous operational promotion

A partir de 2026-09-26, o loop de feedback possui uma faixa autônoma de baixo risco:

```text
feedback negativo/erro
  -> classificação fixa
  -> contagem de evidências
  -> confiança
  -> promoção automática de lição operacional
  -> Chat / Stream / Browser Brain
```

Regras:
- só templates operacionais pré-definidos podem se autopromover;
- threshold atual: 3 eventos;
- dados crus do usuário não viram instrução global automaticamente;
- código executável e pesos do modelo continuam exigindo benchmark/test/build/rollback;
- o snapshot agregado fica em `reports/selfimprove/auto-learning.json`.

Isso fecha o nível memória/comportamento do autoaprendizado sem abrir auto-modificação irrestrita de produção.
