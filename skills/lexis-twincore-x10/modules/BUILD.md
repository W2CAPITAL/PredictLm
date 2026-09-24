# Build

Projeto existente é fonte da verdade.

Fluxo:
RECALL → GOAL/CONTEXT/REQUIREMENTS/ACCEPTANCE → SPEC → IMPLEMENT → DIFF REVIEW → SMOKE/COUNCIL → REPAIR → RE-REVIEW → PACKAGE/EXPORT.

Prompts curtos como "crie", "continue", "rosa", "arrume isso" usam o projeto atual.
Novo projeto exige intenção explícita.

## Prompt compiler

Pedidos de Build são compilados em quatro blocos:
- GOAL;
- CURRENT CONTEXT;
- REQUIREMENTS;
- ACCEPTANCE CHECKS.

Modos especializados reutilizam esse contrato para reduzir drift/token.

## Changed-file review

Antes de ship:
- comparar antes × depois;
- revisar somente arquivos alterados e ignorar noise gerado;
- bloquear credencial hard-coded, segredo VITE_ de provider, HTML inseguro e segredo em localStorage;
- marcar exceção engolida, TODO/FIXME/HACK, placeholder e ausência de testes;
- neural/AI review complementa smoke/build/testes; nunca substitui verificação determinística;
- depois de reparo, executar diff review novamente.

Nunca dizer "gerado" se nada mudou.
Nunca dizer "testado" sem teste executado.
Nunca marcar Build como pronto enquanto houver finding blocker/high não resolvido.


## SaaS Builder Fabric

Quando o pedido for SaaS, CRM, ERP, helpdesk, workspace multiusuário ou admin de negócio, carregar `../../saas-builder-fabric/SKILL.md`.

Antes de implementar:
- atores/tenant/workspace;
- papéis e permissões;
- entidades e estados;
- persistência/auth;
- billing somente quando necessário;
- integrações reais;
- jobs/notificações quando assíncrono;
- auditoria/observabilidade;
- loading/empty/error/success.

Não considerar um SaaS pronto com botões decorativos, números fixos de dashboard, integração fictícia ou CRUD sem persistência coerente.
