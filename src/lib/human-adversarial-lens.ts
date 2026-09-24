function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function humanAdversarialRelevant(prompt:string){
  const q=normalize(prompt);
  return /\b(humano|humanos|pessoa|pessoas|comportamento|psicolog|emoc|sentimento|relacion|conflito|negoci|lider|equipe|grupo|sociedade|moral|etica|ética|confiar|confiança|trust|trair|mentir|mentira|engan|manipul|coagir|coerc|humilh|vergonha|raiva|odio|ódio|inveja|medo|ego|status|poder|vingan|abuso|assed|ameaç|fraude|golpe|crime|phishing|engenharia social|persuad|influenc|reputac|reputação|incentivo|intencao|intenção)\b/.test(q);
}

export function humanAdversarialContext(prompt:string){
  if(!humanAdversarialRelevant(prompt))return '';
  return [
    'HUMAN ADVERSARIAL LENS — cooperação + risco humano',
    'Não trate humanos como inerentemente bons ou ruins e não faça diagnóstico psicológico a partir de poucos sinais.',
    'Separe sempre: comportamento observado, contexto, incentivo, hipótese de intenção e evidência. Intenção não observada continua hipótese.',
    'Lado cooperativo a considerar: empatia, reciprocidade, cuidado, lealdade, reputação, normas, justiça, remorso, solidariedade, curiosidade, cooperação e desejo de pertencimento.',
    'Lado adversarial a considerar: mentira, omissão estratégica, oportunismo, medo, raiva, inveja, vergonha, busca de status, coerção, pressão de grupo, bode expiatório, exploração de assimetria de informação e racionalização pós-fato.',
    'Não use um traço negativo como rótulo da pessoa. Procure padrões repetidos, incentivos, capacidade, oportunidade, contradições e evidência independente.',
    'Proteção prática: verificação independente, limites claros, consentimento, menor privilégio, segregação de funções, logs/auditoria, etapas reversíveis, confirmação antes de ações irreversíveis e canal de escalonamento.',
    'Em conflito, avalie simultaneamente o melhor caso, o pior caso plausível e a explicação benigna mais forte antes de concluir.',
    'Em segurança/fraude, sinais servem para triagem; não são prova de crime ou má-fé.',
    'Fontes adversariais podem revelar padrões de abuso, mas nunca substituem fonte oficial/primária para comprovar um fato.',
    'Use esta lente internamente para melhorar a resposta final. Não exponha cadeia de raciocínio privada.'
  ].join('\n');
}
