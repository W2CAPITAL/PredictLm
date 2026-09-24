---
name: saas-builder-fabric
description: Padrões de produção para criar SaaS, CRM, ERP, helpdesk e workspaces completos no PredictLM Build, com tenancy, auth, RBAC, dados, billing, jobs, auditoria, integrações, testes e export.
metadata:
  version: "1.0.0"
  host: "PredictLM"
---

# SaaS Builder Fabric

## Objetivo

Evitar o padrão "landing page bonita + CRUD raso". Um app de negócio só conta como SaaS quando o fluxo principal realmente funciona.

## Pipeline

IDEIA → PRODUCT SPEC → TENANT / ACTORS / RBAC → INFORMATION ARCHITECTURE → DOMAIN MODEL → PERSISTENCE → AUTH → BILLING (se aplicável) → INTEGRATIONS → BACKGROUND JOBS / NOTIFICATIONS → AUDIT / OBSERVABILITY → UI STATES → TEST / BUILD → EXPORT

## Blueprint mínimo de SaaS

Para apps multiusuário, considerar explicitamente workspace/empresa/tenant, usuários, convites, papéis e permissões, isolamento por tenant, onboarding, dashboard operacional, entidades de domínio, busca/filtros/paginação, loading/empty/error/success, settings, integrações com status real, logs/auditoria, notificações reais, billing quando necessário e jobs/cron/queues quando o fluxo não cabe em request-response.

## CRM / vendas

Absorver padrões de Twenty, Comp AI CRM, EpesiCRM, SalesmanCRM e Free-CRM apenas conforme licença/proveniência.

Entidades típicas: Account/Company, Contact, Lead, Opportunity, Activity, Task, PipelineStage, Note, Attachment, Invoice/Quote, Campaign, Owner/Team.

Regras: nenhuma informação sobre pessoa deve ser inventada; atividade e evidência devem ser separadas de inferência; pipeline possui transições e timestamps; dashboard é derivado de dados reais, não números fixos.

## ERP / business OS

Referências de arquitetura: ERPNext e Huly. Separar módulos e permissões; não gerar um monólito visual que mistura tudo no mesmo componente.

## Helpdesk

Referência: Peppermint. Ticket deve modelar status, priority, requester, assignee, SLA/due date, messages, attachments, activity log, tags e category.

## SaaS starters

Referências: CMSaasStarter, Wasp Open SaaS, SaaS-Boilerplate, launchmvpfast, daisyUI admin dashboard, Startstack, saas-builder, Bloom e Awesome Generative AI Apps.

Padrões úteis: auth real, protected routes, multi-tenancy, forms/validation, dashboard, billing, email, SEO/marketing separado do produto, CI, testes, deploy e nomes de env sem segredos.

## App Builder quality gate

Um app complexo deve ter navegação funcional, formulários validados, CRUD real, persistência coerente, integração isolada do UI, estados assíncronos, RBAC/tenant quando multiusuário, backend quando necessário, smoke test e runnable export. Se qualquer botão central é decorativo, o app ainda não está pronto.

## Media/creator

CreatorHub pode inspirar creator workflows, mas não virar dependência Web3 automática.

O repositório higgsfield-ai/higgsfield informado é um framework de treinamento/orquestração GPU, não a API de geração de vídeo do produto Higgsfield. Use como referência de filas/execução/monitoramento, nunca como provider de vídeo fictício.

## Build prompt contract

GOAL → CURRENT PROJECT → ACTORS → WORKFLOWS → DATA → PERMISSIONS → INTEGRATIONS → FAILURE STATES → ACCEPTANCE CHECKS

## Segurança

Segredos ficam server-side; tenant_id/workspace_id em toda query multi-tenant; service keys nunca em VITE_/NEXT_PUBLIC_; webhook autenticado; rate limit quando aplicável; logs sem PII desnecessária; migrations e backups documentados.

## Definition of Done

Não dizer "SaaS completo" se faltar auth/tenant/data/validation onde essas capacidades são essenciais.
