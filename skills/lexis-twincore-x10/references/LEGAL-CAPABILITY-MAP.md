# Legal Capability Map — TwinCore X10

This file maps external repositories to **capability patterns**. It is not a vendored copy.

## Brazilian Legal Ops

### autodevx/legal-skills
Pattern adopted:
- skills are domain workflows, not generic prompts;
- CNJ parser/validation as deterministic code;
- contract review, contingency, hearing classification as separate capabilities;
- tests and references live beside each skill;
- Brazilian procedural context matters (CNJ, PJe, e-SAJ, CPC, LGPD).

TwinCore mapping:
- `processos`
- `legal-revisional`
- future `contrato-review`
- future `contingencia`
- skill tests/evals

### neimaciel/gestao-escritorio
Pattern adopted:
- office management as measurable operations;
- revenue, contracted/received fees, workload, portfolio risk and pipeline must be separated;
- partner-facing summary should be decision-oriented rather than a data dump.

TwinCore mapping:
- GTM/CRM
- operational Council lens
- legal portfolio dashboard

### neimaciel/resumo-autos
Pattern adopted:
- long case files should produce an auditable timeline, evidence map, thesis matrix and one-page current state;
- claims without support must be marked as not found rather than invented.

TwinCore mapping:
- Processos dossier
- evidence board
- future full-file summarizer

### neimaciel/execucao-patrimonial
Pattern adopted:
- enforcement is a sequence of lawful procedural tools, not random asset hunting;
- keep evidence of each attempt and distinguish investigation from judicial constraint;
- fraud/IDPJ hypotheses require legal basis and evidence.

TwinCore mapping:
- litigation strategy
- execution module roadmap
- AEGIS abuse/privacy gate

### simiao-cavalcante/proprio-punho
Pattern adopted:
- writing style can be represented as explicit rules, examples and anti-style;
- corrections become new style constraints;
- form/style does not replace legal review or source verification.

TwinCore mapping:
- per-user style profile
- feedback → rule update
- legal drafting review

## Legal orchestration

### rohasnagpal/legal-ai-skills
Pattern adopted:
- route a matter to specialist legal capabilities;
- simple matter → one skill;
- complex matter → coordinated specialists → one consolidated work product;
- official-source-first and jurisdiction awareness;
- empty registry/search result is not proof of non-existence.

TwinCore mapping:
- Council X10
- skill federation
- legal router
- official-source fallbacks

### lawve-ai/awesome-legal-skills
Pattern adopted:
- broad catalog is useful for discovery, but catalog membership is not trust;
- TwinCore still audits scope, jurisdiction, permissions and license before integration.

### sickn33/agentic-awesome-skills
Pattern adopted:
- discover capability by task, then install/integrate minimally;
- keep provenance and rollback.

## DevOps / self-improve

### harness/harness-ai + harness/harness-skills
Pattern adopted:
- one source of truth can be adapted to multiple hosts;
- skills + MCP/tools + workspace rules + governance hooks are separate layers;
- establish scope before mutation;
- verify dependencies before creating dependents;
- discover schema before writing payloads;
- debugging/governance/reporting are first-class workflows.

TwinCore mapping:
- HOST-ADAPTERS.md
- Skill Federation adapters
- Self-Improve branch/test/PR loop
- dependency and schema gates

## Additional legal repositories in registry

The following remain registered for targeted inspection before deeper integration:

- neimaciel/execucao-patrimonial
- brunoflma/jusmanizer
- pizaniadv/auditor-estrategico-juridico
- carloslimadv/biblioteca-prompts-juridicos
- emidio-trancoso/advocacia-aberta
- marcelogcardozo/processa-ai
- JeffersonMFti/agente-dra-julia-advocacia
- proprio-punho and other legal drafting/style projects

## Integration rule

Repository discovery never means blindly copying the repository.

For each candidate:
1. inspect README / skill contract;
2. inspect license;
3. identify a concrete missing capability;
4. decide pattern vs adapter vs code reuse;
5. create eval;
6. sandbox;
7. register permissions and rollback;
8. promote only if it beats the existing path.
