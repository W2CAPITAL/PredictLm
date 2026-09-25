<!-- Portable PredictLM Master reference. Canonical source: skills/report-architect/SKILL.md. Runtime/current canonical source wins on divergence. -->

---
name: report-architect
description: Relatórios e dossiês answer-first em dossier markdown, com qualidade 0–100 e HTML determinístico navegável.
metadata:
  version: "2.0.0"
  host: "PredictLM"
  runtime: "AI multi-brain planner + browser/server deterministic renderer"
---

# Report Architect

## Missão

Transformar análise em documento utilizável sem esconder a resposta.

RESPOSTA PRIMEIRO → BLOCOS QUE RESPONDEM UMA PERGUNTA → EVIDÊNCIA → QUALIDADE → HTML/JSON.

Quem lê só a primeira tela precisa entender o que aconteceu, o que significa e o que fazer.

## Ativação sob demanda

Carregar somente quando o usuário pedir relatório, dossiê, due diligence, relatório executivo/técnico, pesquisa estruturada ou exportação equivalente. Não injetar em conversa comum.

## Dossier markdown

- Um único # define o título.
- Seções usam ## ou ###.
- Abrir com **Conclusão em uma frase:**.
- Também reconhecer Bottom line:, Em uma frase:, Resposta direta:, Veredito: e TL;DR:.
- Títulos devem ser informativos; evitar Análise, Detalhes e Informações.

Papéis por título:
- resumo/sumário executivo/síntese/visão geral → summary;
- dados-chave/indicadores/métricas/KPIs → metrics;
- cronologia/linha do tempo/histórico processual/movimentações → timeline;
- evidências/provas/matriz de fatos → evidence;
- riscos/ameaças/vulnerabilidades/exposição → risks;
- opções/alternativas/cenários → options;
- próximos passos/plano de ação/recomendações → actions;
- fontes/referências/bibliografia → sources;
- metodologia/escopo/abrangência → methodology;
- limitações/ressalvas/lacunas/incertezas → limitations;
- anexo/apêndice → appendix.

## Evidência e proveniência

Marcas obrigatórias para afirmações relevantes:
- [oficial] = registro público ou documento oficial;
- [fornecida] = material entregue pelo solicitante;
- [inferência] = conclusão analítica, não fato verificado.

Fato sem origem vira [inferência] ou sai. Falha de fonte entra em Limitações. Ausência pública não prova inexistência.

## Cronologia, riscos e ações

Cronologia: um evento por item; aceitar DD/MM/AAAA, AAAA-MM-DD, MM/AAAA e mar/2024.

Riscos: somente Alto, Médio ou Baixo; nunca inventar porcentagem/probabilidade.

Plano de ação: ação + responsável (ou a definir) + prazo apenas quando suportado. Prioridades reconhecidas: urgente, alta, média e baixa.

Fontes: somente http, https e mailto viram links.

## Quebra automática

Renderer: src/lib/predict-dossier-html.ts.

- padrão 380 palavras por seção;
- Studio 200–700;
- API 120–2000;
- acima de 1,5x o limite, dividir em subseções;
- texto sem títulos ganha blocos;
- numeração automática;
- ids/âncoras estáveis derivados do título.

Não numerar manualmente. A quebra automática é rede de segurança; o modelo deve estruturar corretamente antes.

## Quality Gate

validateDossier retorna 0–100.

Penalidades:
- erro: -25;
- aviso: -8;
- dica: -2.

Códigos: no-sections, no-bottom-line, no-summary, long-section, empty-section, no-sources, inference-only, vague-title, generic-title, duplicate-title, risk-level, action-owner, blueprint.

Meta de entrega: nota >=85 e zero erros.

## Tipos e classificação

Kinds: relatorio-executivo, dossie-juridico, due-diligence, relatorio-tecnico, pesquisa, generico.

Classificação: publico, interno, confidencial, restrito. Documento com dado pessoal ou estratégia processual é confidencial por padrão.

## App PredictLM

Rotas:
- /dossie-studio;
- POST /api/report-dossier;
- GET /api/report-dossier;
- GET /api/report-dossier?example=1;
- /dossie-exemplo.html.

Fluxo do Chat:
1. detectar intenção;
2. injetar REPORT_DOSSIER_CONTRACT somente nesse turno;
3. gerar dossier markdown;
4. validar;
5. se HTML foi pedido, mostrar no Chat somente conclusão + sumário e anexar HTML;
6. enviar Markdown completo ao Dossiê Studio via handoff local.

API aceita markdown ou dossier estruturado, theme auto/light/dark, format json/html, download opcional e no máximo 600 KB.

## Guardrails

- não inventar processo, CNJ, prazo, valor, fonte, probabilidade, responsável ou evidência;
- fraude/crime exige decisão ou prova documental; heurística é sinal a verificar;
- pessoa física: fontes públicas/lícitas, finalidade legítima e minimização;
- não expor endereço residencial, familiares, rotina ou dado sensível sem necessidade legítima;
- protocolo, assinatura, acordo, pagamento ou outro ato com efeito jurídico exigem confirmação humana;
- escapar conteúdo do usuário antes de inserir em HTML;
- separar fato, material fornecido e inferência.

## Integração

Dossier Pro produz análise/evidência jurídica; Report Architect fornece estrutura comum, numeração, HTML, qualidade, fontes e limitações.

Office Artifacts: se o usuário pedir PDF/DOCX, validar o dossiê primeiro, converter a estrutura aprovada e reabrir/validar o arquivo final.

PredictLM Master: módulo sob demanda, nunca contexto permanente.

Persistência: não exige Supabase. Handoff Chat → Studio é local; renderização é determinística e não faz chamada de IA.


## Universal Report Engine v2.0

Report Architect is not limited to executive/legal/technical reports. It must infer the reporting objective and choose a dynamic blueprint.

First-class kinds:
- executive;
- operational;
- financial;
- team/performance;
- technical;
- incident/postmortem;
- project/status;
- sales/commercial;
- marketing;
- HR/People Analytics;
- risk;
- compliance;
- audit;
- comparative/before-after;
- legal dossier;
- due diligence;
- research/study;
- custom/generic.

Unknown report types use the custom blueprint rather than refusing.

### AI + brains pipeline

Default generation route:

**REQUEST + MATERIAL → TYPE/BLUEPRINT → FORGE → AEGIS → PARALLAX → CHAIR → QUALITY GATE → HTML**

FORGE:
- extract facts, metrics, timelines, patterns, hypotheses, risks, actions and missing data;
- never write unsupported facts.

AEGIS:
- challenge numerical consistency, comparability, causality, provenance and overclaiming;
- identify unsupported claims and required fixes.

PARALLAX:
- identify a defensible third frame, hidden variable, alternative explanation, second-order effect, reversal condition and decisive check.

CHAIR:
- merge only supported findings;
- build the final dossier markdown;
- hide internal actor names from the report body;
- repair once when quality <85 or an error exists.

### Council X10 escalation

Auto-enable Council X10 for:
- legal dossier;
- due diligence;
- audit;
- risk report;
- compliance report;
- incident/postmortem;
- large material (>12k chars);
- explicit deep/council request.

Council lenses:
Product · Systems · Builder/Reality · Human Factors · Research/Domain · Security · Failure/QA · Legal/Privacy · Operations/Cost · Devil's Advocate.

Council produces auditable findings, not private chain-of-thought.

### Dynamic blueprints

A blueprint is a recommendation, not a rigid template. Each section must answer a question needed by the report objective.

Examples:
- operational → metrics, flow/productivity, temporal comparison, bottlenecks, evidence, risk, action;
- financial → metrics, revenue/expense/cash, drivers, exposures, scenarios, action;
- team → workload, fronts/channels, interpretation, attention points, action;
- incident → impact, timeline, evidence, root cause, what worked/failed, CAPA;
- technical → scope/method, architecture, findings, cause, risk, correction, validation;
- comparative → baseline, direct comparison, improved/worsened, causes, options;
- research → question, method, evidence, synthesis, counterpoints, implications.

### App integration

- POST /api/report-dossier/generate → AI multi-brain generation.
- POST /api/report-dossier → deterministic Markdown/JSON rendering.
- /dossie-studio → prompt + source material + generation + editing + quality + preview/export.
- Chat report requests route to /api/report-dossier/generate first; if unavailable, the normal report contract remains as fallback.

Manual Markdown remains supported. AI generation never replaces deterministic validation/rendering.

### Cognitive boundary

Fly/Human/Macaque cognitive simulations are not factual sources and must never be cited as evidence in a report. The report uses the operational AI brains (FORGE/AEGIS/PARALLAX/CHAIR/Council) for analysis and review. Cognitive Lab may only be used for optional ideation if explicitly requested and its output remains [inferência].
