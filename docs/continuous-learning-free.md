# PredictLM Continuous Learning — gratuito

## O que roda 24/7

O workflow `.github/workflows/continuous-learning.yml` executa uma rodada por hora.

Ele:
1. verifica um lote rotativo de repositórios já allowlisted;
2. coleta atualizações de feeds oficiais;
3. consulta um tópico acadêmico no arXiv;
4. descobre repositórios novos apenas como candidatos;
5. aplica confiança, licença, proveniência, deduplicação e sanitização;
6. recalcula lacunas de pesquisa;
7. cria filas de revisão de código e skills;
8. publica o índice em `continuous-learning/learning-data/index.json`;
9. opcionalmente sincroniza uma planilha Google Sheets.

O workflow não requer npm install nem API de LLM.

## Por que é gratuito

O repositório W2CAPITAL/PredictLm é público. GitHub Actions em runners padrão de
repositórios públicos não consome a franquia cobrada de minutos de repositórios
privados. O desenho usa apenas um job curto por hora.

A sincronização do Google Sheets faz poucas chamadas por rodada e foi desenhada para
permanecer muito abaixo das quotas padrão. Políticas de quota/preço dos provedores
podem mudar; o workflow deve parar/degradar antes de exigir uma API paga.

## Planilha online

Crie/use uma planilha com estas abas:
- APRENDIZADO
- FONTES
- GITHUB
- SKILLS
- CODIGO
- PENDENCIAS
- AUDITORIA

No GitHub, configure apenas como **repository secrets**:

- `PREDICTLM_LEARNING_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Compartilhe a planilha com o e-mail da conta de serviço como Editor.

A chave privada nunca deve ir para código, commit, issue, log ou variável
`NEXT_PUBLIC_*`.

## Motor local

`src/lib/continuous-learning.ts` lê:

`https://raw.githubusercontent.com/W2CAPITAL/PredictLm/continuous-learning/learning-data/index.json`

O índice é cacheado no navegador. Quando o PredictLM estiver aberto, o runtime local
usa os registros aceitos como evidência adicional. Offline, usa o cache anterior.

Isso não é retreinamento de pesos. É aquisição, versionamento, recuperação e aplicação
de conhecimento.

## Auto-programação

O modo grátis não executa um modelo local na nuvem. Portanto:

- o coletor 24/7 cria `codeProposals` e `skillProposals`;
- o motor local, quando estiver ligado, pode transformar a proposta em patch;
- o patch precisa passar por branch -> testes -> build -> review -> PR;
- `main` nunca deve ser alterada automaticamente por conteúdo recém-encontrado.

Esse limite evita que uma fonte errada, prompt injection ou README malicioso se torne
código de produção.

## Adicionar assuntos

Edite `config/continuous-learning.json`.

Cada tópico pode definir:
- `githubQueries`;
- `arxivQuery`;
- prioridade;
- skills relacionadas.

Novas fontes de feed devem ser oficiais/primárias sempre que possível.

## Execução manual

```bash
npm run learn:continuous
```

Sem `GITHUB_TOKEN`, a execução local apenas gera
`reports/continuous-learning/latest.json`.

Com o token do workflow, o índice é publicado na branch de aprendizado.

## Variáveis opcionais

- `PREDICTLM_PUBLISH_BRANCH`: branch de dados; padrão `continuous-learning`.
- `PREDICTLM_CONTINUOUS_INDEX_URL`: índice anterior alternativo.
- `NEXT_PUBLIC_CONTINUOUS_LEARNING_URL`: endpoint lido pelo app.

Nenhuma variável de IA paga é necessária.
