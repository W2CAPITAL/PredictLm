---
name: lexispredict-saas
description: Skill operacional extraída da arquitetura do SaaS LexisPredict. Use para SaaS jurídico/financeiro, CRM, processos, OCR, documentos, peças, procurações, relatórios, KPI, offline/sync, DataJud/DJEN e automação assistida.
metadata:
  version: "1.0.0"
  source_repository: "W1CAPITAL/LexisPredict"
  host: "PredictLM"
---

# LexisPredict SaaS Skill

## Missão

Transformar os padrões operacionais do LexisPredict em capacidades reutilizáveis do PredictLM sem acoplar o Chat ao produto original.

A skill cobre:

- arquitetura SaaS multiempresa/multiusuário;
- CRM, contatos, pipeline, atividades, cobranças, conciliação, financeiro e fornecedores;
- processos, agenda, tarefas, supervisão, auditoria, analytics e relatórios;
- DataJud + DJEN + scanner/worker/queue;
- OCR local e extração documental;
- documentos, peças jurídicas, procurações, substabelecimentos e habilitações;
- KPIs de carteira, atendimento, executivo, revisional e cumprimento;
- modo offline/local-first + sync;
- Provider Mesh/Omni + rotas determinísticas locais;
- dossiês e relatórios como artefatos verificáveis.

## Regra de arquitetura

O usuário vê **um único Predict Auto**.

Internamente:

REQUEST
→ CLASSIFY
→ DETERMINISTIC TOOL/DATA
→ PROVIDER MESH quando agrega valor
→ LOCAL ENGINE somente se já configurado/ativado
→ VERIFY
→ ANSWER
→ opcional ARTIFACT

Não expor uma lista de Claude/Groq/NVIDIA/Qwen/WebLLM como se o usuário devesse escolher infraestrutura.

## SaaS shell

Usar como referência os módulos reais do LexisPredict:

- onboarding/login/empresa/perfis;
- isolamento por empresa/escopo;
- dashboard e KPIs;
- CRM completo;
- finanças e conciliação;
- agenda/tarefas/notificações;
- processos e filas operacionais;
- settings/integrações/supervisão/superadmin;
- offline/import/sync.

Ao criar SaaS novo:

1. identificar atores e tenant;
2. modelar entidades e regras;
3. definir RBAC;
4. definir estados loading/empty/error/success;
5. separar UI, domínio, persistência e integrações;
6. validar CRUD e isolamento antes de chamar o app de pronto;
7. manter segredos somente server-side.

## Predict Auto / motores

Padrões úteis do LexisPredict:

- `src/lib/ai/motors.ts`: uma identidade Omni/cascata + opção local;
- `src/lib/ai/cascade.ts`: fallback entre providers;
- `src/ai/motor-despacho.ts`: despacho por intenção/capacidade;
- flows especializados apenas quando agregam domínio.

O PredictLM adapta isso para:

SERVER PROVIDER MESH
→ local router previamente configurado
→ browser local já carregado
→ research/knowledge fallback

Nada de varrer portas localhost automaticamente e nada de baixar modelo pesado no primeiro acesso.

## OCR

Referência principal: `src/lib/ocr/engine.ts`.

Contrato:

INPUT PDF/IMAGEM
→ detectar texto nativo
→ OCR local quando necessário
→ normalizar
→ extrair campos
→ preservar texto bruto + confiança
→ validar antes de gerar documento

OCR nunca deve inventar CPF, nome, endereço, banco, processo ou valor ausente.

## Document Forge jurídico

Capacidades:

- procuração ad judicia;
- substabelecimento;
- habilitação;
- petições/peças;
- minutas;
- relatórios jurídicos;
- documentos derivados de dados extraídos;
- PDF/DOCX/XLSX/PPTX quando o formato fizer sentido.

Fluxo:

SOURCE
→ EXTRACT
→ NORMALIZE
→ VALIDATE
→ TEMPLATE/RULES
→ DRAFT
→ AEGIS REVIEW
→ ARTIFACT

Peça jurídica deve separar fatos comprovados, campos ausentes, tese, pedidos e dados que exigem revisão humana.

## KPI / relatórios

Usar como referência:

- `src/lib/kpi-carteira.ts`;
- `src/lib/kpi-executivo.ts`;
- `src/lib/kpi-unificado.ts`;
- `src/lib/relatorio-equipe-narrativa.ts`;
- `src/lib/xlsx-dossie-builder.ts`.

Relatório forte combina:

dados normalizados
→ KPIs reproduzíveis
→ exceções/críticos
→ agregações
→ narrativa
→ XLSX/PDF/DOCX/PPTX

Nunca gerar número narrativo que não possa ser derivado da base.

## Dossier Second Brain

O dossiê é **segundo cérebro de evidências e artefatos**, não o cérebro que responde ao usuário.

Ele pode:

- agregar processo, cliente, timeline, documentos, publicações e evidências;
- deduplicar fatos;
- marcar conflito e lacuna;
- calcular KPIs/riscos;
- gerar HTML/PDF/XLSX/DOCX;
- preparar pacote de evidências para o Predict Auto.

Ele NÃO pode:

- substituir a resposta final por um dump de dossiê;
- concluir mérito apenas porque um campo/flag existe;
- transformar ausência de fonte em inexistência;
- ocultar erro de DataJud/DJEN;
- decidir silenciosamente ação jurídica.

Fluxo:

DOSSIER BRAIN
→ FACTS / TIMELINE / EVIDENCE GAPS / ARTIFACTS
→ PREDICT AUTO
→ resposta final contextual

## Jurídico / DataJud / DJEN

CNJ
→ tribunal
→ DataJud
→ DJEN
→ portal oficial quando necessário
→ timeline normalizada
→ interpretação
→ ação/artefato

Erro != zero.
Timeout != ausência.
Metadado != inteiro teor.
Movimentação administrativa posterior não apaga sentença/extinção/trânsito.

## Local-first e sync

Usar os padrões de:

- local provider;
- Supabase provider;
- sync engine;
- offline/import;
- viewers CSV/DB.

A fonte da verdade deve ser explícita por produto. Nunca fingir que cache local e backend remoto são a mesma coisa.

## Segurança

- tenant isolation em toda query;
- segredo nunca no client/GitHub;
- service-role nunca em bundle;
- documento/OCR pode conter PII e deve ter retenção mínima;
- protocolo, assinatura, pagamento e ação externa permanecem human-gated;
- logs devem evitar conteúdo sensível desnecessário.

## Definition of Done

Uma capacidade só conta como pronta quando:

- botão executa algo real;
- estado de erro existe;
- dados são validados;
- artefato abre;
- build/typecheck passa;
- integração é testada ou marcada como não configurada;
- não há segredo no repositório.


## Report Architect exports

Relatórios executivos, dossiês jurídicos, due diligence e relatórios técnicos do SaaS devem compartilhar o contrato Report Architect quando forem exportados.

Fluxo:
DADOS/PROCESSOS → ANÁLISE → DOSSIER MARKDOWN → PROVENIÊNCIA → QUALITY GATE → HTML/JSON → PDF/DOCX opcional.

Regras:
- fatos de DataJud/DJEN e portais oficiais = [oficial];
- dados enviados/importados pela empresa = [fornecida];
- interpretação = [inferência];
- retorno de API ausente/falha entra em Limitações;
- não inferir inexistência de ato apenas porque ele não foi localizado;
- classificação confidencial por padrão quando houver cliente, estratégia processual ou dado pessoal;
- nenhuma nova dependência Supabase é exigida pelo Report Architect.
