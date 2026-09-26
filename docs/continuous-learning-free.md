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

O caminho padrão da planilha não usa a API do Google: ele lê CSVs públicos do branch
de aprendizado com `IMPORTDATA`. Assim, o ciclo principal não depende de credenciais
do Google nem de uma quota paga.

## Planilha online

A planilha criada para o PredictLM usa um espelho **zero-secret**. A cada rodada, o
workflow publica CSVs na branch `continuous-learning`:

- `learning-data/APRENDIZADO.csv`
- `learning-data/FONTES.csv`
- `learning-data/GITHUB.csv`
- `learning-data/SKILLS.csv`
- `learning-data/CODIGO.csv`
- `learning-data/PENDENCIAS.csv`
- `learning-data/AUDITORIA.csv`

Cada aba do Google Sheets usa `IMPORTDATA` para ler o CSV público correspondente.
Como o repositório é público, não existe token do Google, service account ou API paga
no caminho padrão.

O writer direto via Google Sheets API continua opcional para instalações privadas, mas
não é necessário para a planilha padrão.

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
