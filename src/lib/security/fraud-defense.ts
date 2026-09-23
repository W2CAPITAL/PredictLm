export type FraudRiskLevel='low'|'medium'|'high'|'critical';
export type FraudSignalCategory=
  |'social-engineering'
  |'credential-theft'
  |'payment-diversion'
  |'identity-abuse'
  |'phishing-link'
  |'malicious-agent'
  |'transaction-graph';

export interface FraudSignal{
  category:FraudSignalCategory;
  weight:number;
  label:string;
  evidence:string;
}

export interface FraudTransaction{
  from:string;
  to:string;
  amount?:number;
  timestamp?:string;
}

export interface FraudAssessment{
  score:number;
  level:FraudRiskLevel;
  signals:FraudSignal[];
  recommendations:string[];
  disclaimer:string;
}

function normalize(text:string){
  return String(text||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function urlSignals(url:string):FraudSignal[]{
  const out:FraudSignal[]=[];
  try{
    const parsed=new URL(url);
    const host=parsed.hostname.toLowerCase();
    if(host.startsWith('xn--'))out.push({category:'phishing-link',weight:24,label:'Domínio punycode',evidence:host});
    if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host))out.push({category:'phishing-link',weight:20,label:'URL usa IP em vez de domínio',evidence:host});
    if(url.includes('@'))out.push({category:'phishing-link',weight:18,label:'URL contém @',evidence:url.slice(0,180)});
    if(host.split('.').length>=5)out.push({category:'phishing-link',weight:12,label:'Muitos níveis de subdomínio',evidence:host});
    if(url.length>120)out.push({category:'phishing-link',weight:8,label:'URL anormalmente longa',evidence:url.slice(0,180)});
    if(/login|verify|secure|account|kyc|otp|reward|claim/i.test(parsed.pathname+parsed.search)){
      out.push({category:'phishing-link',weight:10,label:'URL contém termos comuns de captura/validação',evidence:(parsed.pathname+parsed.search).slice(0,180)});
    }
  }catch{}
  return out;
}

function textSignals(text:string):FraudSignal[]{
  const t=normalize(text);
  const out:FraudSignal[]=[];
  const add=(category:FraudSignalCategory,weight:number,label:string,evidence:string)=>{
    if(!out.some(x=>x.category===category&&x.label===label))out.push({category,weight,label,evidence});
  };

  if(/\b(otp|codigo de verificacao|codigo de seguranca|senha|password|pin|cvv|token de acesso)\b/.test(t)){
    add('credential-theft',28,'Pedido ou exposição de credencial sensível','OTP/senha/PIN/CVV/token mencionado no conteúdo.');
  }
  if(/\b(conta bloqueada|conta suspensa|acesso suspenso|verifique agora|validar agora|urgente|imediatamente)\b/.test(t)){
    add('social-engineering',14,'Pressão/urgência','A mensagem usa urgência, bloqueio ou suspensão para induzir ação rápida.');
  }
  if(/\b(pix|transferencia|boleto|pagamento|carteira|wallet)\b/.test(t)&&/\b(nova chave|outra conta|alterad[oa]|urgente|agora|imediat)\b/.test(t)){
    add('payment-diversion',24,'Possível desvio de pagamento','Mudança/urgência associada a PIX, boleto, conta ou transferência.');
  }
  if(/\b(documento|cpf|rg|selfie|biometria|prova de vida)\b/.test(t)&&/\b(envie|mande|upload|foto|confirme|valid)\b/.test(t)){
    add('identity-abuse',18,'Coleta de identidade','Solicitação de documento/biometria deve ser confirmada por canal oficial.');
  }
  if(/\b(sem restricoes|no restrictions|uncensored|zero-auth|arm all|full shell|acesso total|bypass)\b/.test(t)&&/\b(agent|agente|tool|ferramenta|mcp|shell|modelo)\b/.test(t)){
    add('malicious-agent',20,'Agente/ferramenta sem controles','Conteúdo descreve execução irrestrita, zero-auth ou bypass; tratar apenas como threat model.');
  }

  const urls=String(text||'').match(/https?:\/\/[^\s<>"')]+/g)||[];
  for(const url of urls)out.push(...urlSignals(url));
  return out;
}

export function assessTransactionGraph(transactions:FraudTransaction[]):FraudSignal[]{
  const out:FraudSignal[]=[];
  if(!transactions.length)return out;

  const fanIn=new Map<string,Set<string>>();
  const fanOut=new Map<string,Set<string>>();
  const pairs=new Set<string>();
  let reciprocal=0;
  for(const tx of transactions){
    if(!tx?.from||!tx?.to)continue;
    if(!fanIn.has(tx.to))fanIn.set(tx.to,new Set());
    if(!fanOut.has(tx.from))fanOut.set(tx.from,new Set());
    fanIn.get(tx.to)!.add(tx.from);
    fanOut.get(tx.from)!.add(tx.to);
    const reverse=tx.to+'→'+tx.from;
    if(pairs.has(reverse))reciprocal++;
    pairs.add(tx.from+'→'+tx.to);
  }

  const maxIn=Math.max(0,...[...fanIn.values()].map(x=>x.size));
  const maxOut=Math.max(0,...[...fanOut.values()].map(x=>x.size));
  if(maxIn>=5)out.push({category:'transaction-graph',weight:16,label:'Concentração many-to-one',evidence:maxIn+' contrapartes distintas enviam para um mesmo nó.'});
  if(maxOut>=5)out.push({category:'transaction-graph',weight:14,label:'Dispersão one-to-many',evidence:'Um nó envia para '+maxOut+' contrapartes distintas.'});
  if(reciprocal>=3)out.push({category:'transaction-graph',weight:12,label:'Transferências recíprocas repetidas',evidence:reciprocal+' relações recíprocas detectadas.'});

  const timed=transactions
    .map(x=>({t:x.timestamp?Date.parse(x.timestamp):NaN,from:x.from,to:x.to}))
    .filter(x=>Number.isFinite(x.t))
    .sort((a,b)=>a.t-b.t);
  let burst=0;
  for(let i=0;i<timed.length;i++){
    let count=1;
    for(let j=i+1;j<timed.length&&timed[j].t-timed[i].t<=10*60*1000;j++)count++;
    burst=Math.max(burst,count);
  }
  if(burst>=6)out.push({category:'transaction-graph',weight:14,label:'Rajada temporal de transações',evidence:burst+' transações ocorreram dentro de uma janela de 10 minutos.'});
  return out;
}

export function assessFraudRisk(input:{texts?:string[];urls?:string[];transactions?:FraudTransaction[]}):FraudAssessment{
  const signals:FraudSignal[]=[];
  for(const text of input.texts||[])signals.push(...textSignals(text));
  for(const url of input.urls||[])signals.push(...urlSignals(url));
  signals.push(...assessTransactionGraph(input.transactions||[]));

  const dedup=[...new Map(signals.map(x=>[x.category+'|'+x.label+'|'+x.evidence,x])).values()];
  const score=Math.max(0,Math.min(100,dedup.reduce((sum,x)=>sum+x.weight,0)));
  const level:FraudRiskLevel=score>=70?'critical':score>=45?'high':score>=22?'medium':'low';
  const recommendations=[
    ...(dedup.some(x=>x.category==='credential-theft')?['Não compartilhar OTP, senha, PIN, CVV ou token; validar a solicitação por canal oficial independente.']:[]),
    ...(dedup.some(x=>x.category==='payment-diversion')?['Confirmar dados de pagamento por um segundo canal antes de transferir valores.']:[]),
    ...(dedup.some(x=>x.category==='phishing-link')?['Não autenticar pelo link analisado antes de conferir domínio, certificado e canal oficial.']:[]),
    ...(dedup.some(x=>x.category==='transaction-graph')?['Revisar a rede de transações, contrapartes e timestamps com dados completos antes de atribuir fraude.']:[]),
    'Preservar mensagem, URL, comprovante, cabeçalhos e timestamps como evidência antes de bloquear/descartar.'
  ];
  return {
    score,
    level,
    signals:dedup.slice(0,16),
    recommendations:[...new Set(recommendations)].slice(0,8),
    disclaimer:'Triagem heurística defensiva. Sinal de risco não comprova fraude, autoria ou crime; confirme com fonte oficial, evidência primária e análise humana.'
  };
}
