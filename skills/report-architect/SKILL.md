---
name: report-architect
description: Relatórios e dossiês answer-first em dossier markdown, com qualidade 0–100 e HTML determinístico navegável.
metadata:
  version: "1.0.0"
  host: "PredictLM"
  runtime: "browser + server deterministic renderer"
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
