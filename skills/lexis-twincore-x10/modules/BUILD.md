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


## Build from Unified Chat

Build não depende de uma aba pública separada. O Chat detecta pedidos de criação/edição de software e chama o pipeline Build internamente.

Fluxo atual:
```text
CHAT INTENT
→ JEV ROUTE (strong/long para tarefa complexa)
→ INSPECT WORKSPACE
→ SELECT RELEVANT FILES VERBATIM
→ IMPLEMENT
→ SMOKE + COUNCIL + DIFF REVIEW
→ REPAIR quando necessário
→ PACKAGE
→ ZIP anexado no Chat
```

### Regra de contexto
Arquivos relevantes não devem ser reduzidos a pequenos resumos antes da edição. A política JEV-inspired elimina arquivos/contexto não relacionado e preserva verbatim o código retido dentro do budget.

### Regra de exportação
O empacotador deve preservar TypeScript/TSX, caminhos relativos, alias `@/`, dependências declaradas e imports externos necessários. O CI executa um smoke de exportação real: instala o projeto gerado e roda `npm run build`.

Um ZIP que foi apenas serializado, mas não sobrevive ao smoke de compilação, não conta como Build funcional.
