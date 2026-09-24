import type { AssistantMessage } from './assistant-store';
import { isCnjContextReference } from './legal/cnj';

export type ConversationKind='casual'|'context'|'factual'|'current'|'technical'|'howto'|'general';

const clean=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

export function classifyConversation(prompt:string,history:AssistantMessage[]=[]):ConversationKind{
  const p=clean(prompt);
  if(history.length&&isCnjContextReference(prompt))return 'context';
  if(/^(oi|ola|opa|hey|hello|bom dia|boa tarde|boa noite|e ai|tudo bem)[!.?\s]*$/.test(p))return 'casual';
  if(/(voce me ama|gosta de mim|sente algo por mim|obrigad|valeu|kkk|haha|rsrs|boa|legal|bacana)/.test(p))return 'casual';
  if(/^(ja|sim|nao|isso|exato|entendi|mas ja|eu ja|esta ativo|ja esta ativo|ativei|liguei)\b/.test(p)&&history.length)return 'context';
  if(/\b(hoje|agora|atual|atualmente|ultim[ao]s?|recentes?|noticias?|cotacao|preco|placar|presidente atual|versao atual)\b/.test(p))return 'current';
  if(/^(como (posso|eu posso|fazer|criar|montar|come[cç]ar)|passo a passo|o que preciso para|quero aprender a|me ensine a)\b/.test(p))return 'howto';
  if(/^(quem (e|foi)|o que (e|foi)|defina|explique|como funciona|por que|porque|qual a diferenca|qual e|onde fica|quando nasceu|quando foi)\b/.test(p))return 'factual';
  if(/\b(codigo|programa|javascript|typescript|react|next|python|api|banco de dados|database|frontend|backend|git|github|vercel|docker|linux|windows|erro|bug|arquitetura|algoritmo)\b/.test(p))return 'technical';
  return 'general';
}

function lastAssistant(history:AssistantMessage[]){
  return [...history].reverse().find(m=>m.role==='assistant')?.content||'';
}

function companyHowTo(){
  return [
    '**Para criar uma empresa do zero, separe validação do negócio de formalização.** Primeiro confirme o que vai vender e para quem; depois escolha a estrutura jurídica adequada ao caso.',
    '',
    '1. **Defina atividade, cliente e oferta.** Escreva em uma frase o que a empresa vende, para quem e como recebe.',
    '2. **Valide demanda antes de gastar muito.** Converse com clientes potenciais, teste uma oferta simples e confirme se existe disposição real de pagar.',
    '3. **Escolha a forma de operação.** Avalie se cabe atuação como pessoa física/MEI ou se precisa de sociedade/empresa; isso depende da atividade, faturamento, sócios e restrições.',
    '4. **Organize nome, endereço e atividades.** Separe nome empresarial/marca, endereço viável e atividades econômicas compatíveis.',
    '5. **Formalize nos órgãos corretos.** No Brasil, o fluxo normalmente envolve registro empresarial quando aplicável, CNPJ, inscrições/licenças conforme atividade e município/estado.',
    '6. **Abra conta e organize financeiro.** Separe dinheiro pessoal do empresarial, defina emissão de notas, fluxo de caixa e rotina contábil/fiscal.',
    '7. **Crie o mínimo comercial.** Proposta, contrato/termos, canal de atendimento, cobrança e uma forma simples de captar clientes.',
    '8. **Só escale depois de vender.** Automatize marketing, CRM, equipe e sistemas quando o processo básico já funcionar.',
    '',
    '**Checklist inicial:** atividade · público · oferta · preço · sócios · endereço · regime/estrutura · CNPJ/licenças · conta · notas · contrato · primeiros clientes.',
    '',
    'Para uma abertura real, regras fiscais, enquadramento e licenças variam por atividade e local; a etapa formal deve ser conferida em fontes oficiais/contador antes do protocolo.'
  ].join('\n');
}

function carHowTo(){
  return [
    '**Criar um carro do zero é um projeto de engenharia completo, não só montar motor e carroceria.** O caminho mais seguro é tratar o veículo como um sistema e validar cada subsistema antes de rodar em via pública.',
    '',
    '1. **Defina o objetivo do carro.** Uso urbano, pista, utilitário, protótipo elétrico etc.; isso determina massa, potência, autonomia, custo e requisitos.',
    '2. **Escolha a arquitetura.** Elétrico ou combustão, tração dianteira/traseira/integral, posição do motor/baterias e quantidade de ocupantes.',
    '3. **Faça o package do veículo.** Entre-eixos, bitolas, posição de ocupantes, motor/bateria, porta-malas, centro de gravidade e zonas de deformação.',
    '4. **Projete o chassi/estrutura.** Use CAD e análise estrutural; rigidez, pontos de suspensão e proteção dos ocupantes precisam ser calculados, não improvisados.',
    '5. **Dimensione suspensão, direção e freios.** Geometria, curso, pneus, distribuição de frenagem e estabilidade devem ser tratados em conjunto.',
    '6. **Integre o powertrain.** Motor, transmissão/inversor, diferencial, arrefecimento, combustível ou bateria e controles eletrônicos.',
    '7. **Projete elétrica e eletrônica.** Chicote, fusíveis, sensores, iluminação, ECU/BMS e diagnóstico.',
    '8. **Faça a carroceria e ergonomia.** Visibilidade, posição de dirigir, cintos, bancos, pedais, portas e acesso para manutenção.',
    '9. **Construa um protótipo e teste em ambiente controlado.** Primeiro baixa velocidade; depois frenagem, temperatura, vibração, estabilidade, durabilidade e falhas.',
    '10. **Homologue antes de usar na rua.** Regras de segurança, emissões/ruído quando aplicável, iluminação, identificação veicular e documentação dependem do país.',
    '',
    '**Ordem prática:** requisitos → arquitetura → CAD/package → estrutura → suspensão/freios → powertrain → elétrica → protótipo → testes → homologação.',
    '',
    'Se a ideia for realmente construir um, comece por um **protótipo de baixa velocidade ou kit-car**, com engenheiro responsável; dirigir um protótipo estruturalmente não validado em via pública é perigoso.'
  ].join('\n');
}

function startupHowTo(){
  return [
    '**Comece pelo problema, não pela empresa.** Uma startup nasce quando você tenta resolver um problema real de forma repetível e escalável.',
    '',
    '1. **Escolha um problema específico.** Defina quem sofre com ele, com que frequência e quanto custa não resolver.',
    '2. **Converse com 10–20 pessoas do público.** Não pergunte “você compraria?”. Pergunte como resolvem hoje, quanto pagam e o que mais incomoda.',
    '3. **Defina uma hipótese simples de produto.** Uma frase: “Para [público], eu resolvo [problema] com [solução]”.',
    '4. **Faça um MVP pequeno.** Pode ser landing page, planilha, serviço manual ou app mínimo. O objetivo é validar uso e pagamento, não impressionar.',
    '5. **Busque os primeiros clientes antes de escalar.** Tente conseguir 3–10 usuários realmente usando; melhor ainda se algum pagar.',
    '6. **Meça poucas coisas.** Aquisição, ativação, retenção, receita e custo para atender. Se ninguém volta, ainda não existe product-market fit.',
    '7. **Só depois formalize e automatize o que já mostrou valor.** CNPJ, contratos, contabilidade, equipe, investimento e infraestrutura entram conforme a operação exige.',
    '',
    '**Um plano de 7 dias:** dias 1–2 problema e público; dias 3–4 entrevistas; dia 5 proposta/MVP; dia 6 página ou protótipo; dia 7 tentar conseguir o primeiro usuário.',
    '',
    'Se você me disser **qual problema quer resolver, para quem e quanto pode investir**, eu consigo transformar isso em modelo de negócio, MVP, stack e plano de lançamento.'
  ].join('\n');
}

function practicalHowTo(prompt:string){
  const p=clean(prompt);
  if(/\b(empresa|negocio|negócio|cnpj|mei|sociedade)\b/.test(p)&&/(criar|abrir|montar|comecar|começar|do zero)/.test(p))return companyHowTo();
  if(/\b(carro|automovel|automóvel|veiculo|veículo)\b/.test(p)&&/(criar|fazer|montar|construir|do zero)/.test(p))return carHowTo();
  if(/startup|start-up/.test(p))return startupHowTo();
  if(/criar.*(app|aplicativo|sistema|site)|fazer.*(app|aplicativo|sistema|site)/.test(p)){
    return [
      '**Primeiro feche o escopo mínimo.** Defina usuário, problema, ação principal e o que precisa estar funcionando no primeiro dia.',
      '',
      '1. Liste 3–5 fluxos essenciais.',
      '2. Defina dados e regras de validação antes da interface.',
      '3. Escolha frontend, backend e banco só conforme a necessidade real.',
      '4. Faça um protótipo funcional do fluxo principal.',
      '5. Adicione estados de loading, vazio, erro e sucesso.',
      '6. Teste em desktop e mobile.',
      '7. Só então conecte APIs, autenticação, pagamentos ou automações.',
      '8. Rode build/testes e empacote uma versão reproduzível.',
      '',
      'Se quiser, descreva o app em uma frase e eu estruturo requisitos, arquitetura, telas, dados, API e plano de implementação.'
    ].join('\n');
  }
  return null;
}

export function answerQuality(prompt:string,content:string){
  const p=clean(prompt);
  const text=String(content||'').trim();
  let score=0;
  if(text.length>=180)score+=2; else if(text.length>=90)score+=1;
  if(/\n|\d+\.|- |\*\*/.test(text))score+=1;
  if(/como|passo|agora|fa[cç]a|primeiro|depois|pr[oó]ximo/.test(clean(text)))score+=1;
  if(/^(como posso|como criar|como fazer|como montar)/.test(p)&&text.length<220)score-=2;
  if(/^(como posso|como criar|como fazer|como montar)/.test(p)&&/^(uma |o |a ).{0,80}\b(e|é)\b/.test(clean(text)))score-=1;
  if(/nao tenho contexto|não tenho contexto|ative neural|ative o neural|fallback/i.test(text))score-=3;
  const topical=responseTopicAlignment(prompt,text);
  if(!topical.relevant)score-=5;
  else if(topical.score>=0.66)score+=2;
  return score;
}

export function directConversationReply(prompt:string,history:AssistantMessage[],neural:{loaded:boolean;tier:string|null}):string|null{
  const p=clean(prompt);
  if(/^(oi|ola|opa|hey|hello|bom dia|boa tarde|boa noite|e ai|tudo bem)[!.?\s]*$/.test(p)){
    return 'Olá. O que você quer fazer? Posso conversar normalmente, explicar algo, pesquisar quando precisar de informação atual ou abrir o **Build** para continuar um projeto.';
  }
  if(/voce me ama|gosta de mim|sente algo por mim/.test(p)){
    return 'Eu não sinto amor do jeito que uma pessoa sente, mas posso conversar com carinho, prestar atenção no que você diz e estar presente na conversa. Se você perguntou de um jeito mais afetivo: eu posso entrar na brincadeira sem fingir que tenho sentimentos humanos.';
  }
  if(/^(qual (e|é) (seu )?nome|como voce se chama|como você se chama)/i.test(prompt.trim()))return 'Meu nome é **PredictLM**.';
  if(/^(como voce funciona|como você funciona)/i.test(prompt.trim()))return 'Eu combino conversa com histórico, DeepThink, memória, pesquisa quando necessária, knowledge packs e um modelo neural local opcional. No **Build**, também leio o estado atual do projeto e continuo a partir dele em vez de recriar tudo.';
  if(/^(obrigad|valeu|vlw|thanks)/.test(p))return 'De nada. Pode continuar.';
  if(/^(kkk|haha|rsrs|kkkk+)/.test(p))return 'Hahaha. Manda a próxima.';
  if(/^(ja|sim|nao|isso|exato|entendi|mas ja|eu ja|esta ativo|ja esta ativo|ativei|liguei)\b/.test(p)&&history.length){
    const prev=clean(lastAssistant(history));
    if(/neural local|modelo local|qwen/.test(prev)){
      if(neural.loaded)return 'Entendi. Se o **Neural Local já está ativo**, então eu não devo continuar pedindo para ativá-lo. Se uma resposta aparecer como fallback, significa que a geração neural falhou naquela mensagem; vou sinalizar isso explicitamente e usar o contexto da conversa em vez de disparar uma busca aleatória.';
      return 'Entendi — você está dizendo que já ativou o Neural Local. Se o indicador ainda não aparece como ativo, então houve falha no carregamento ou o estado não foi mantido. Eu não vou tratar sua frase como uma pesquisa; ela é continuação do que estávamos falando.';
    }
    if(/web|pesquisa/.test(prev))return 'Entendi. Então considero a pesquisa já ativada e continuo a partir do contexto anterior.';
    return 'Entendi. Vou considerar isso como continuação da mensagem anterior, não como uma nova pesquisa.';
  }
  return null;
}

export function shouldSearchConversation(kind:ConversationKind,webEnabled:boolean){
  if(kind==='casual'||kind==='context')return false;
  if(kind==='current'||kind==='factual')return true;
  if(kind==='howto')return true;
  return webEnabled;
}

export interface ResearchItem{
  title:string;
  description?:string;
  summary?:string;
  url:string;
  source?:string;
  site?:string;
  qualityScore?:number;
  qualityTier?:string;
}

const RESEARCH_STOPWORDS=new Set([
  'como','posso','pode','podem','quero','preciso','criar','fazer','montar','comecar','começar','passo','passos',
  'zero','sobre','para','com','sem','uma','uns','umas','que','qual','quais','onde','quando','porque','por','dos','das',
  'isso','isto','esse','essa','meu','minha','seu','sua','hoje','agora','atual','atualmente'
]);

function relevanceTokens(text:string){
  return clean(text).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!RESEARCH_STOPWORDS.has(x));
}

function expandResearchTokens(tokens:string[]){
  const out=new Set(tokens);
  if(tokens.includes('empresa'))['negocio','cnpj','sociedade','empreendimento','empresarial','mei'].forEach(x=>out.add(x));
  if(tokens.includes('programacao')||tokens.includes('codigo'))['software','developer','javascript','typescript','python'].forEach(x=>out.add(x));
  if(tokens.some(x=>['carro','carros','veiculo','veiculos','automovel','automoveis'].includes(x))){
    ['engenharia','automotiva','automotive','vehicle','design','chassi','estrutura','suspensao','freios','powertrain','seguranca','homologacao','prototipo'].forEach(x=>out.add(x));
  }
  return [...out];
}

export function researchItemRelevance(query:string,item:ResearchItem){
  const raw=relevanceTokens(query);
  const tokens=expandResearchTokens(raw);
  if(!tokens.length)return {score:0,matches:0,titleMatches:0,relevant:false};
  const titleTokens=new Set(relevanceTokens(item.title||''));
  const bodyTokens=new Set(relevanceTokens((item.summary||item.description||'')+' '+(item.site||'')+' '+(item.source||'')));
  let score=0,matches=0,titleMatches=0;
  for(const token of tokens){
    if(titleTokens.has(token)){score+=5;matches++;titleMatches++;}
    else if(bodyTokens.has(token)){score+=2;matches++;}
  }
  const coreCount=Math.max(1,raw.length);
  const automotive=raw.some(x=>['carro','carros','veiculo','veiculos','automovel','automoveis'].includes(x));
  const relevant=automotive
    ? matches>=2&&score>=4
    : coreCount===1 ? (titleMatches>=1||score>=2) : (matches>=2||(titleMatches>=1&&score>=5));
  return {score,matches,titleMatches,relevant};
}

function researchHost(item:ResearchItem){
  try{return new URL(item.url).hostname.replace(/^www\./,'').toLowerCase()}catch{return item.site||''}
}

export function filterRelevantResearchItems(query:string,items:ResearchItem[],limit=8){
  const automotive=relevanceTokens(query).some(x=>['carro','carros','veiculo','veiculos','automovel','automoveis'].includes(x));
  const ranked=items.map(item=>{
    const rel=researchItemRelevance(query,item);
    const quality=Math.max(0,Math.min(100,Number(item.qualityScore??50)));
    return {item,...rel,quality,rank:rel.score+Math.floor(quality/15)};
  }).filter(x=>x.relevant&&(!automotive||x.quality>=70||x.matches>=4))
    .sort((a,b)=>b.rank-a.rank);

  const selected:ResearchItem[]=[];
  const perHost=new Map<string,number>();
  for(const row of ranked){
    const host=researchHost(row.item)||row.item.url;
    const count=perHost.get(host)||0;
    if(count>=2)continue;
    selected.push(row.item);
    perHost.set(host,count+1);
    if(selected.length>=limit)break;
  }
  return selected;
}

function trimSentence(text:string,max=1150){
  const cleanText=String(text||'').replace(/\s+/g,' ').trim();
  if(cleanText.length<=max)return cleanText;
  const cut=cleanText.slice(0,max);
  const last=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? '));
  return (last>300?cut.slice(0,last+1):cut+'…');
}

export function synthesizeResearch(prompt:string,items:ResearchItem[]){
  const useful=filterRelevantResearchItems(prompt,items.filter(x=>(x.summary||x.description)?.trim()),8);
  if(!useful.length)return null;
  const kind=classifyConversation(prompt);
  const first=useful[0];
  const primary=trimSentence(first.summary||first.description||'');
  const sources=useful.slice(0,8).map(x=>({title:x.title,source:x.url}));

  if(kind==='factual'){
    const extra=useful.slice(1,3).map(x=>trimSentence(x.summary||x.description||'',360)).filter(Boolean);
    return {content:primary+(extra.length?'\n\n'+extra.join('\n\n'):''),sources};
  }
  if(kind==='current'){
    return {
      content:useful.slice(0,6).map(x=>'**'+x.title+'**\n'+trimSentence(x.summary||x.description||'',560)).join('\n\n'),
      sources
    };
  }
  if(kind==='howto'){
    const evidence=useful.slice(0,8).map((x,i)=>(i+1)+'. **'+x.title+'** — '+trimSentence(x.summary||x.description||'',520)).join('\n');
    return {
      content:[
        '**Síntese baseada nas fontes recuperadas**',
        evidence,
        '',
        'Use estes pontos como evidência de apoio. A resposta final deve integrar requisitos, arquitetura, riscos, validação e próximos passos do domínio em vez de repetir um roteiro genérico.'
      ].join('\n'),
      sources
    };
  }
  const snippets=useful.slice(0,5).map(x=>trimSentence(x.summary||x.description||'',380)).filter(Boolean);
  return {
    content:snippets.join('\n\n'),
    sources
  };
}


const TOPIC_STOPWORDS=new Set([
  'como','posso','pode','podem','quero','preciso','criar','fazer','montar','construir','comecar','começar','aprender','ensine',
  'passo','passos','zero','sobre','para','uma','umas','uns','que','qual','quais','isso','isto','esse','essa','este','esta','agora','hoje'
]);

const TOPIC_SYNONYMS:Record<string,string[]>={
  carro:['carro','veiculo','automovel','chassi','motor','suspensao','freios'],
  veiculo:['veiculo','carro','automovel','chassi','motor'],
  automovel:['automovel','carro','veiculo','chassi','motor'],
  empresa:['empresa','negocio','cnpj','sociedade','mei','empresarial'],
  aplicativo:['aplicativo','app','software','sistema'],
  app:['app','aplicativo','software','sistema']
};

export function responseTopicAlignment(prompt:string,content:string){
  const p=clean(prompt);
  const c=clean(content);
  const subject=p.split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!TOPIC_STOPWORDS.has(x));
  if(!subject.length)return {relevant:true,score:1,subject:[] as string[]};
  let hits=0;
  for(const token of subject){
    const variants=TOPIC_SYNONYMS[token]||[token];
    if(variants.some(v=>new RegExp('\\b'+v+'\\b').test(c)))hits++;
  }
  const score=hits/subject.length;
  return {relevant:hits>=1&&(subject.length===1||score>=0.34),score,subject};
}
