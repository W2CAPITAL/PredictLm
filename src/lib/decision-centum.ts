export type CentumCluster=
  |'objective'|'evidence'|'assumptions'|'alternatives'|'downside'
  |'upside'|'stakeholders'|'reversibility'|'execution'|'certainty';

export interface CentumQuestion{
  id:number;
  cluster:CentumCluster;
  question:string;
}

const CLUSTERS:{cluster:CentumCluster;title:string;questions:string[]}[]=[
  {cluster:'objective',title:'Objetivo e definição',questions:[
    'Qual decisão exata precisa ser tomada?',
    'Qual resultado concreto define sucesso?',
    'Qual resultado seria apenas aparência de sucesso?',
    'Qual problema real esta decisão pretende resolver?',
    'Estamos respondendo à pergunta certa?',
    'O escopo está claro o suficiente para decidir?',
    'Quais restrições são realmente obrigatórias?',
    'Quais restrições foram apenas presumidas?',
    'Qual horizonte de tempo importa para esta decisão?',
    'O que precisa continuar verdadeiro depois da decisão?'
  ]},
  {cluster:'evidence',title:'Evidência e fatos',questions:[
    'Quais fatos sustentam diretamente a conclusão?',
    'Quais fontes são primárias ou verificáveis?',
    'Que evidência importante está ausente?',
    'Alguma fonte está desatualizada para este caso?',
    'Há conflito entre fontes relevantes?',
    'Estamos confundindo correlação com causa?',
    'Há amostra pequena ou caso isolado sendo generalizado?',
    'O que foi observado e o que foi apenas inferido?',
    'Qual fato, se falso, derruba a conclusão?',
    'Que evidência independente confirmaria a decisão?'
  ]},
  {cluster:'assumptions',title:'Hipóteses e vieses',questions:[
    'Quais hipóteses não foram testadas?',
    'Qual hipótese parece óbvia demais para ter sido questionada?',
    'Existe viés de confirmação favorecendo uma conclusão?',
    'Existe viés de recência ou novidade?',
    'Existe viés de autoridade ou reputação da fonte?',
    'Estamos superestimando nossa capacidade de prever?',
    'Que hipótese mudaria sob outro contexto ou população?',
    'Que premissa depende de comportamento humano incerto?',
    'Qual premissa foi herdada de uma solução anterior?',
    'Que crença estamos protegendo em vez de testar?'
  ]},
  {cluster:'alternatives',title:'Alternativas e comparação',questions:[
    'Quais alternativas reais existem além da opção principal?',
    'Qual é a opção de não fazer nada agora?',
    'Existe uma opção menor, gradual ou experimental?',
    'Existe uma opção híbrida?',
    'Qual alternativa resolve o mesmo problema por mecanismo diferente?',
    'Estamos comparando opções com os mesmos critérios?',
    'Alguma opção foi descartada cedo demais?',
    'Qual alternativa um especialista de outra área sugeriria?',
    'Que opção maximiza aprendizado antes de compromisso?',
    'Existe uma opção C que torna o dilema A versus B desnecessário?'
  ]},
  {cluster:'downside',title:'Riscos e perdas',questions:[
    'Qual é o pior resultado plausível?',
    'Qual é o pior resultado provável, não apenas possível?',
    'Que dano seria irreversível?',
    'Que risco é pequeno em probabilidade mas enorme em impacto?',
    'Que risco está fora do nosso campo de visão atual?',
    'Como esta decisão pode falhar silenciosamente?',
    'Que dependência externa pode quebrar a decisão?',
    'Que incentivo ruim esta decisão pode criar?',
    'Que abuso ou uso indevido devemos antecipar?',
    'Qual é o plano se a principal suposição falhar?'
  ]},
  {cluster:'upside',title:'Benefícios e oportunidade',questions:[
    'Qual benefício principal esperamos obter?',
    'Qual benefício pode ser medido objetivamente?',
    'Existe ganho de segunda ordem além do benefício imediato?',
    'Que opção cria mais capacidade futura?',
    'Que opção reduz trabalho ou risco recorrente?',
    'Qual benefício depende de condições que ainda não existem?',
    'Há vantagem assimétrica com perda limitada e ganho alto?',
    'Que aprendizado útil ocorre mesmo se a tentativa falhar?',
    'Qual benefício seria difícil de copiar ou substituir?',
    'Estamos valorizando benefício real ou apenas conveniência?'
  ]},
  {cluster:'stakeholders',title:'Pessoas, incentivos e contexto',questions:[
    'Quem ganha com esta decisão?',
    'Quem perde ou assume o risco?',
    'Quem não foi ouvido e deveria ser?',
    'Os incentivos de quem recomenda a decisão estão alinhados?',
    'Quem terá de executar ou manter o resultado?',
    'A decisão muda responsabilidades entre pessoas ou equipes?',
    'Existe impacto sobre privacidade, autonomia ou consentimento?',
    'Há algum grupo afetado de forma desproporcional?',
    'Que informação cada parte possui que as outras não possuem?',
    'Como a decisão muda se vista pelo stakeholder mais crítico?'
  ]},
  {cluster:'reversibility',title:'Reversibilidade e teste',questions:[
    'A decisão é reversível?',
    'Quanto custa voltar atrás?',
    'Existe ponto de não retorno?',
    'Podemos testar em pequena escala primeiro?',
    'Qual experimento mais barato reduziria a maior incerteza?',
    'Que métrica define continuar, pausar ou abortar?',
    'Qual prazo de revisão deve ser definido agora?',
    'Que sinal precoce indicaria que estamos errados?',
    'Que rollback precisa existir antes da execução?',
    'Podemos adiar compromisso sem perder a oportunidade?'
  ]},
  {cluster:'execution',title:'Execução e realidade operacional',questions:[
    'Quem fará o quê depois da decisão?',
    'Quais recursos são realmente necessários?',
    'Que dependência precisa estar pronta antes de começar?',
    'Qual é o caminho crítico da execução?',
    'Quais etapas podem ocorrer em paralelo?',
    'Que validação deve ocorrer antes de cada etapa irreversível?',
    'Como erros serão detectados e comunicados?',
    'Que manutenção futura esta decisão cria?',
    'Que custo total aparece depois do primeiro resultado?',
    'Qual é o próximo passo concreto se a decisão for aprovada?'
  ]},
  {cluster:'certainty',title:'Certeza, falsificação e encerramento',questions:[
    'Quão certa a conclusão realmente precisa ser?',
    'Que parte da conclusão continua incerta?',
    'O que nos faria mudar de ideia?',
    'Que teste poderia falsificar a conclusão?',
    'Existe base rate ou referência histórica comparável?',
    'Estamos confundindo ausência de evidência com evidência de ausência?',
    'A linguagem usada é mais confiante que os dados permitem?',
    'Qual conclusão mínima é suportada sem extrapolação?',
    'Qual decisão é robusta mesmo se algumas premissas estiverem erradas?',
    'Depois das revisões, a decisão ainda responde exatamente ao pedido?'
  ]}
];

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function isDecisionRequest(prompt:string){
  const p=normalize(prompt);
  if(!p)return false;
  return /\b(decid|escolh|vale a pena|devo|melhor opcao|melhor opção|tenho certeza|ter certeza|certeza|confirme|confirmar|verifique|verificar|posso confiar|confiavel|confiável|seguro|correto|certo|aprovar|aprovado|pronto|ship|deploy|recomenda|recomendacao|recomendação|qual escolher|qual usar|comparar|compare|risco|prioridade)\b/.test(p);
}

export function buildCentumQuestions(prompt:string):CentumQuestion[]{
  const subject=String(prompt||'').replace(/\s+/g,' ').trim().slice(0,220);
  let id=0;
  return CLUSTERS.flatMap(group=>group.questions.map(question=>({
    id:++id,
    cluster:group.cluster,
    question:question.replace(/esta decisão|a decisão|esta conclusão|a conclusão/gi,subject?'a decisão sobre "'+subject+'"':'esta decisão')
  })));
}

export function centumDecisionContext(prompt:string){
  if(!isDecisionRequest(prompt))return '';
  const questions=buildCentumQuestions(prompt);
  const groups=CLUSTERS.map(group=>{
    const rows=questions.filter(x=>x.cluster===group.cluster);
    return group.title.toUpperCase()+': '+rows.map(x=>'Q'+String(x.id).padStart(3,'0')+' '+x.question).join(' | ');
  });
  return [
    'CENTUM DECISION GATE — 100 checks',
    'Review all 100 checks internally against the actual user request and available evidence before committing to a conclusion.',
    'Do not ask the user these 100 questions unless the user explicitly asks to see them.',
    'For each check internally classify: supported, contradicted, unknown, not-applicable.',
    'Unknown must never be silently promoted to fact. Contradictions must survive into the final confidence/risk judgment.',
    ...groups,
    'After CENTUM, review through Council X10: 1 Product/North Star, 2 Architecture/Systems, 3 Builder/Implementation, 4 UX/Human Factors, 5 Research/Domain, 6 Security/Abuse, 7 Failure/QA, 8 Legal/Privacy, 9 Operations/Cost, 10 Devil\'s Advocate.',
    'Then Chair must reconcile agreements/disagreements before Third Brain PARALLAX.',
    'FINAL-ANSWER CONTRACT: answer only the requested deliverable. Do not narrate engines, fallback, skills, checklist, internal debate or chain-of-thought unless explicitly requested. If evidence is insufficient, state the specific uncertainty; do not substitute an unrelated generic fallback.'
  ].join('\n\n');
}

export function parallaxContext(prompt:string){
  if(!isDecisionRequest(prompt))return '';
  return [
    'THIRD BRAIN — PARALLAX',
    'FORGE asks how the requested direction can work. AEGIS asks how it can fail. PARALLAX must go beyond both.',
    'Inspect the decision for a third frame that neither side owns:',
    '1. Reframe the problem: what if the decision boundary is wrong?',
    '2. Find a hidden variable that changes both pro and con arguments.',
    '3. Find an option C, staged option, reversible experiment or hybrid.',
    '4. Check second-order and delayed effects.',
    '5. Check what becomes true only under another time horizon or stakeholder.',
    '6. Find the condition that would reverse the current recommendation.',
    '7. Find unknown-unknown proxies: what signal would reveal a missing category of risk?',
    '8. Prefer a robust decision that survives several plausible worlds over a fragile optimum.',
    'PARALLAX does not force novelty. If there is no defensible third frame, say internally that none adds value.',
    'Never expose private reasoning. Only let the third-frame findings improve the final answer.'
  ].join('\n');
}

export function centumStats(prompt:string){
  const questions=buildCentumQuestions(prompt);
  return {
    active:isDecisionRequest(prompt),
    questions:questions.length,
    clusters:new Set(questions.map(x=>x.cluster)).size,
    firstId:questions[0]?.id||0,
    lastId:questions.at(-1)?.id||0
  };
}
