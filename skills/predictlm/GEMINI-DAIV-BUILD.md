# PredictLM · Gemini / DAIV / AssistantsHub Build Pack

## Objetivo
Aprimorar Chat e Build sem transformar referências externas em cópia de produto.

## Fontes treináveis
- RanitManik/Gemini-Clone · MIT
- GourangaDasSamrat/Gemini-Clone · MIT
- srtab/daiv · Apache-2.0
- assistants-hub/assistantshub.ai · MIT
- Addy-shetty/Vibe-Prompting · MIT (já registrado)

## Fontes somente de referência
Sem licença declarada no GitHub no momento da inclusão:
- raizamartin/gemini-code
- iamakashpc/Gemini-Clone
- C0deNe0/gemini-clone
- MAHMOUDELSAYED7/Dr.Ai
- ekramasif/GeminiCoder

## Padrões absorvidos
### Chat
- shell responsivo;
- feedback de geração/streaming;
- markdown e blocos de código;
- erros visíveis e recuperáveis;
- provider separado da interface.

### Build
- inspecionar projeto antes de editar;
- planejar e aplicar patches pequenos;
- usar ferramentas/arquivos/testes como ações, não apenas sugerir código;
- rodar verificação depois do patch;
- reparar falhas em modo Max quando houver neural local;
- manter trilha clara do que mudou.

### Assistants platform
- múltiplos providers/modelos;
- histórico de conversas;
- documentos e funções;
- analytics/observabilidade;
- configuração real, sem toggles fictícios.

## Contrato para apps complexos
Um app com múltiplos fluxos deve sair com navegação funcional, validação, estados async, integração isolada, persistência coerente, testes/smoke e documentação de ambiente. Arquivos em `src/` só contam como melhoria se estiverem ligados ao comportamento real do app/export.
