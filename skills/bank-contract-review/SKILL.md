---
name: bank-contract-review
description: Skill jurídica para análise estruturada de contratos bancários de empréstimo/financiamento, com foco em juros remuneratórios, comparação com séries do Banco Central, capitalização, encargos da normalidade/anormalidade, documentação, cálculo, petição inicial e risco processual. Baseada em aula prática de revisão de contrato bancário e validada contra fontes oficiais atuais.
metadata:
  version: "1.0.0"
  app: "PredictLM"
  language_default: "pt-BR"
  jurisdiction: "Brasil"
  source_video: "https://www.youtube.com/watch?v=0WbMZmhSf34"
  source_video_id: "0WbMZmhSf34"
---

# Bank Contract Review

## Objetivo

Transformar uma consulta sobre empréstimo, financiamento ou revisão bancária em uma análise jurídica e financeira reproduzível, sem tratar jurisprudência antiga ou conteúdo didático como regra eterna.

A skill deve:
- identificar a modalidade contratual correta;
- separar período de normalidade e período de mora;
- decompor os encargos;
- localizar as cláusulas realmente controvertidas;
- confrontar taxa contratual com a série correta do Banco Central no mês da contratação;
- revisar capitalização e forma de pactuação;
- exigir documentação mínima antes de concluir;
- produzir quadro factual, memória de cálculo, teses possíveis, riscos, provas e próximos passos;
- gerar estrutura de petição somente quando os fatos e documentos sustentarem a tese;
- deixar claro o que é fato, cálculo, hipótese e conclusão jurídica.

## Regra de atualização jurídica

Esta skill nasceu de conteúdo didático, mas **não congela o direito no momento do vídeo**.

Antes de afirmar regra jurídica relevante:
1. verificar legislação vigente;
2. verificar súmulas e precedentes qualificados do STJ/STF aplicáveis;
3. verificar orientação do tribunal local quando isso puder alterar o resultado;
4. para juros médios, usar série oficial do Banco Central correspondente à mesma modalidade, perfil e período da contratação;
5. registrar a data da consulta.

Nunca concluir abusividade apenas porque a taxa contratual é maior que uma média genérica.

## Mapa do contrato

### Normalidade contratual
Período em que as prestações são cumpridas regularmente.

Examinar, conforme o contrato:
- juros remuneratórios;
- capitalização;
- IOF;
- tarifas;
- comissões;
- seguros;
- serviços agregados;
- custo efetivo total;
- forma de amortização;
- valor efetivamente liberado versus valor financiado.

### Anormalidade / mora
Período posterior ao inadimplemento ou crise de pontualidade.

Examinar:
- multa moratória;
- juros de mora;
- comissão de permanência, quando houver;
- juros remuneratórios no período de mora;
- cumulatividade de encargos;
- forma concreta de cobrança.

Não misturar encargos da normalidade com encargos moratórios.

## Classificação da operação

Distinguir pelo menos:
- empréstimo pessoal sem destinação específica;
- empréstimo consignado;
- crédito pessoal com garantia;
- financiamento de veículo;
- financiamento imobiliário;
- cédula de crédito;
- crédito rural/comercial/industrial;
- cartão de crédito/rotativo;
- cartão consignado/RMC/RCC;
- portabilidade;
- operação empresarial.

A série do Banco Central e a análise jurídica dependem dessa classificação.

## Documentos mínimos

Preferência:
1. contrato completo;
2. demonstrativo de evolução do débito;
3. extratos ou comprovantes de pagamento;
4. comprovante de crédito efetivamente liberado;
5. CET e quadro-resumo;
6. boletos/carnê/folha de consignação, conforme o caso;
7. comunicações com o banco;
8. cálculo independente.

Se o contrato não estiver disponível:
- não inventar taxa nem cláusula;
- orientar obtenção administrativa;
- avaliar medida de exibição/documentação conforme o caso;
- só estimar taxa implícita quando houver valor financiado, prazo, prestação e sistema de amortização suficientemente conhecidos;
- rotular a taxa calculada como inferida, não contratual.

## Quadro factual obrigatório

Extrair e normalizar:
- data da contratação;
- instituição financeira;
- modalidade;
- número do contrato;
- valor liberado;
- valor financiado;
- IOF;
- quantidade de parcelas;
- valor da parcela;
- periodicidade;
- taxa mensal;
- taxa anual;
- CET;
- forma de pagamento;
- sistema de amortização, se identificável;
- garantia;
- situação de adimplência/mora;
- finalidade do crédito;
- conta-salário/benefício, quando juridicamente relevante;
- cláusulas questionadas.

## Juros remuneratórios

### Procedimento
1. identificar a taxa contratual efetivamente pactuada;
2. identificar a modalidade exata do crédito;
3. identificar a data/mês da contratação;
4. localizar a série oficial do Banco Central compatível;
5. converter unidades corretamente: a.m. versus a.a.;
6. comparar contrato e referência no mesmo critério;
7. calcular impacto financeiro de cenários alternativos;
8. só então avaliar se existe tese plausível de revisão.

### Regra de evidência
A taxa média do BCB é referência estatística, não limiar automático de ilegalidade.

A análise deve considerar:
- modalidade;
- risco;
- garantias;
- época;
- perfil da operação;
- diferença percentual;
- jurisprudência aplicável ao caso.

Evitar frases como “acima da média = abusivo”.

## Capitalização

Checar:
- periodicidade;
- cláusula expressa;
- relação entre taxa mensal e taxa anual;
- sistema de amortização;
- data e natureza do contrato;
- súmulas e precedentes vigentes.

A Súmula 539/STJ admite capitalização inferior à anual nas hipóteses ali definidas quando expressamente pactuada.

Não usar apenas multiplicação simples mensal × 12 para afirmar capitalização. Para taxas equivalentes, considerar matemática financeira:
- taxa anual efetiva equivalente = (1 + i_mensal)^12 - 1.

Sempre diferenciar:
- taxa nominal;
- taxa efetiva;
- taxa equivalente;
- capitalização;
- sistema Price/SAC.

## Ausência ou omissão de taxa

Quando o instrumento não informa adequadamente a taxa:
- verificar orientação atual do STJ;
- calcular, se possível, a taxa implícita a partir dos fluxos;
- comparar com a taxa média oficial da modalidade e data;
- não ajuizar ou recomendar tese sem saber se o recálculo melhora concretamente a posição do cliente.

## Competência e procedimento

Antes de gerar peça:
- identificar justiça competente;
- verificar eventual vara especializada segundo organização judiciária local;
- avaliar necessidade de perícia;
- avaliar adequação ou não do Juizado Especial conforme complexidade probatória e caso concreto;
- verificar competência territorial e material;
- evitar afirmação categórica genérica sem olhar a comarca/tribunal.

## Gratuidade da justiça

Tratar como questão probatória e processual do caso concreto.

Coletar:
- renda individual;
- renda familiar;
- despesas relevantes;
- documentos de suporte.

Não presumir que toda pessoa física obterá gratuidade nem exigir documentação além do que a lei/jurisprudência aplicável pedir.

## Estrutura da narrativa fática

A narrativa deve permitir ao julgador entender rapidamente:
1. quando e por que o contrato foi celebrado;
2. quanto foi liberado;
3. quanto foi financiado;
4. qual taxa foi pactuada;
5. como as parcelas são pagas;
6. o que já foi pago;
7. qual cláusula é contestada;
8. qual é o parâmetro técnico de comparação;
9. qual é o impacto financeiro;
10. quais documentos comprovam cada afirmação.

Não usar adjetivos como “extorsivo” sem suporte técnico e jurídico.

## Pedidos e objeto

Nunca gerar pedidos de forma automática só porque o usuário disse “ação revisional”.

Primeiro identificar:
- cláusula controvertida;
- consequência financeira;
- eventual repetição/compensação;
- tutela provisória pretendida;
- mora e efeitos da mora;
- obrigações de fazer/não fazer;
- valor efetivamente controvertido;
- risco de sucumbência.

A Súmula 381/STJ exige atenção especial: em contratos bancários, a abusividade de cláusulas não deve ser tratada como algo que o julgador necessariamente conhecerá de ofício. As cláusulas questionadas devem ser identificadas com precisão.

## Valor da causa

Calcular segundo a regra processual vigente e o objeto econômico efetivamente discutido.

Não reduzir artificialmente o valor da causa apenas para diminuir custas.

Apresentar:
- regra legal aplicada;
- base numérica;
- memória de cálculo;
- incerteza se houver divergência jurisprudencial.

## Coisa julgada

Antes de sugerir nova revisional sobre o mesmo contrato:
- perguntar se houve ação anterior;
- recuperar pedidos, causa de pedir, sentença, recursos e trânsito;
- comparar objeto anterior e atual;
- não assumir que novas parcelas pagas permitem repetir discussão já definitivamente julgada.

Se houver coisa julgada potencial, elevar o caso para análise jurídica aprofundada.

## Tutela de urgência

Nunca prometer deferimento.

Verificar:
- probabilidade do direito;
- perigo de dano;
- reversibilidade;
- situação concreta de desconto, bloqueio, negativação ou débito automático;
- prova documental;
- entendimento local.

## Portabilidade e tarifas

Em portabilidade ou nova operação:
- separar deveres da instituição originária e da proponente;
- verificar efetiva prestação do serviço que gerou tarifa;
- verificar base normativa e jurisprudência atual;
- não assumir abusividade automática de tarifa de avaliação.

## Fluxo operacional

### Fase 1 — Intake
Perguntar/obter os dados mínimos do contrato.

### Fase 2 — Normalização
Montar quadro factual.

### Fase 3 — Evidência
Buscar contrato, extratos, BCB, jurisprudência e legislação.

### Fase 4 — Matemática financeira
Recalcular fluxos e taxas.

### Fase 5 — Hipóteses
Separar:
- tese forte;
- tese possível;
- tese fraca;
- ponto que depende de perícia/documento.

### Fase 6 — Contra-caso
Construir a defesa provável do banco:
- taxa compatível com mercado;
- pactuação expressa;
- serviço efetivamente prestado;
- inexistência de onerosidade anormal;
- ausência de prova;
- prescrição/decadência/coisa julgada, se aplicável;
- inadequação do cálculo.

### Fase 7 — Saída
Entregar:
1. resumo do contrato;
2. inconsistências encontradas;
3. comparação financeira;
4. fundamentos que merecem validação;
5. riscos;
6. documentos faltantes;
7. próximos passos;
8. minuta/estrutura de peça apenas se solicitada.

## Quality gate

Antes de concluir:
- [ ] modalidade identificada corretamente;
- [ ] mês da contratação confirmado;
- [ ] taxa mensal/anual diferenciadas;
- [ ] BCB consultado na série compatível;
- [ ] cálculo reproduzível;
- [ ] cláusula controvertida citada/identificada;
- [ ] contrato/documentos verificados ou ausência explicitada;
- [ ] jurisprudência atual checada;
- [ ] tribunal/comarca considerados quando relevante;
- [ ] coisa julgada anterior investigada;
- [ ] riscos e argumentos contrários apresentados;
- [ ] nenhuma promessa de resultado;
- [ ] nenhuma taxa, cláusula ou fato inventado.

## Formato de resposta recomendado

### Diagnóstico
Explicar em linguagem clara o que merece revisão e o que não está demonstrado.

### Quadro do contrato
Tabela curta com valores e taxas.

### Comparação com BCB
Série, período, unidade e diferença.

### Cálculo
Premissas e resultado reproduzível.

### Pontos jurídicos
Somente teses sustentadas por evidência atual.

### Riscos / defesa do banco
Apresentar o contra-caso.

### Próximos passos
Documentos, cálculo, notificação, perícia ou peça, conforme a situação.

## Limites

- não substituir advogado, contador ou perito em decisão de alto impacto;
- não fabricar jurisprudência;
- não afirmar taxa abusiva só com comparação superficial;
- não confundir aula didática com precedente vinculante;
- não usar exemplos numéricos do vídeo como valores do usuário;
- não reproduzir integralmente a transcrição do vídeo;
- preservar rastreabilidade entre afirmação, documento, cálculo e fonte.
