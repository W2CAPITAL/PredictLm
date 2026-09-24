# Research Source Matrix

## Princípio
Não existe uma fonte universal. O domínio da pergunta determina a fonte principal, e a síntese forte depende de triangulação.

## Ordem operacional
1. classificar domínio;
2. buscar fonte oficial/primária;
3. buscar fonte acadêmica/especializada;
4. buscar fonte independente de triangulação;
5. avaliar atualidade, método, conflito e lacunas;
6. sintetizar somente o que as fontes suportam.

## Matriz
- Saúde: PubMed/MEDLINE, ClinicalTrials.gov, Cochrane; complementar com OMS e literatura revisada.
- Exatas/tecnologia: OpenAlex, arXiv, IEEE Xplore, ACM DL, Semantic Scholar; preprint não equivale a revisão por pares.
- Software: documentação oficial e repositório primário; GitHub prova o próprio software, não fatos externos.
- Jurídico BR: CNJ/DataJud/DJEN, tribunais e legislação oficial.
- Finanças/economia BR: BCB/SGS, IBGE, CVM e órgãos oficiais.
- Humanidades/história: BNDigital/Hemeroteca, JSTOR, SciELO, Redalyc, arquivos primários.
- Comportamento humano/social: literatura acadêmica, psicologia/saúde pública e SciELO; relatos comunitários só como contexto.
- Checagem contemporânea: fonte primária + Reuters/AP + organizações com metodologia pública/IFCN quando aplicável.
- Segurança: CERT/CISA/NIST e fornecedor/afetado como base; threat intelligence como lead; fóruns adversariais como threat-reference.

## Pesquisa acadêmica no runtime
`/api/research` pode federar OpenAlex, Semantic Scholar, busca web/Firecrawl, DuckDuckGo, Wikipedia apenas como orientação inicial, GitHub apenas para perguntas de software e Apify quando configurado.

## Gate de fonte adversarial
`threat-reference`: só entra em pergunta defensiva/sensível; fica limitado a poucas referências; nunca vence fonte oficial/acadêmica por volume; conteúdo bruto sensível é suprimido; alegação exige corroboração.

## Gate de resposta
Fonte em inglês não muda o idioma da conversa. Snippet de pesquisa não vira resposta por si só. Research é contexto do Chat, não um substituto do Chat.
