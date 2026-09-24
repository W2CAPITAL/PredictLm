# LexisPredict Reference Map

Fonte: `W1CAPITAL/LexisPredict`.

## Superfícies SaaS

- Agenda: `src/app/agenda/page.tsx`
- Analytics/Auditoria: `src/app/analytics/page.tsx`, `src/app/auditoria/page.tsx`
- CRM: `src/app/crm/**`, `src/app/actions/crm-*.ts`, `src/lib/crm-*`
- Financeiro: `src/app/financas/page.tsx`, `src/components/financeiro/**`
- Processos: `src/app/processos/**`, `src/app/cases/page.tsx`
- Supervisão/equipe: `src/app/supervisao/page.tsx`, `src/app/team/page.tsx`
- Config/integrações: `src/app/settings/page.tsx`, `src/app/integracoes/page.tsx`
- Offline/import: `src/app/offline/page.tsx`, `src/app/import/page.tsx`
- Local/Supabase/sync: `src/lib/data-provider/**`, `src/lib/sync/**`

## IA

- Catálogo/Omni: `src/lib/ai/motors.ts`
- Cascade: `src/lib/ai/cascade.ts`
- Despacho: `src/ai/motor-despacho.ts`
- Providers especializados: `src/lib/ai/**`
- Chat: `src/app/api/chat/route.ts`

## Jurídico e processos

- DataJud: `src/lib/datajud*.ts`, `src/app/api/datajud-*/route.ts`
- DJEN: `src/lib/djen*.ts`, `src/app/api/djen-proxy/route.ts`
- Scanner/queue: `src/components/scanner/**`, `src/app/api/queue/**`, `src/app/api/cron/datajud-scan/route.ts`
- Revisional/veredito: `src/app/revisional/page.tsx`, `src/app/veredito/page.tsx`

## OCR e documentos

- OCR: `src/lib/ocr/**`, `src/app/tools/ocr/page.tsx`
- Extração documental: `src/app/actions/document-extraction.ts`, `src/ai/flows/document-flow.ts`
- Modelos jurídicos: `src/lib/pecas-modelos.ts`
- PDFs: `src/components/pdf/**`
- Dossiês: `src/app/actions/dossie-*.ts`, `src/lib/dossie-*.ts`

## KPI e relatórios

- `src/lib/kpi-carteira.ts`
- `src/lib/kpi-executivo.ts`
- `src/lib/kpi-unificado.ts`
- `src/app/actions/kpi-atendimento-actions.ts`
- `src/lib/relatorio-equipe-narrativa.ts`
- `src/lib/xlsx-dossie-builder.ts`

## Regra de reutilização

Este mapa serve para destilar arquitetura e comportamento. Não copiar módulos proprietários para terceiros sem autorização/licença apropriada.
