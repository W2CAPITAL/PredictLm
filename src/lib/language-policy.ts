export type ConversationLanguage='pt-BR'|'en';

type HistoryMessage={role?:string;content?:string};

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

function explicitLanguageDirective(text:string):ConversationLanguage|null{
  const q=normalize(text);
  if(
    /\b(responda|responder|fale|escreva|continue|use|quero.*resposta)\b.{0,30}\b(ingles|english)\b/.test(q)||
    /\b(in english|english only|answer in english|reply in english)\b/.test(q)
  )return 'en';
  if(
    /\b(responda|responder|fale|escreva|continue|use|quero.*resposta)\b.{0,30}\b(portugues|pt-br|portuguese)\b/.test(q)||
    /\b(em portugues|portugues apenas|portuguese only|answer in portuguese|reply in portuguese)\b/.test(q)
  )return 'pt-BR';
  return null;
}

export function resolveConversationLanguage(currentPrompt:string,history:HistoryMessage[]=[]):ConversationLanguage{
  const userMessages=[
    ...history.filter(x=>x?.role==='user').map(x=>String(x.content||'')),
    currentPrompt
  ];
  let lang:ConversationLanguage='pt-BR';
  for(const message of userMessages){
    const directive=explicitLanguageDirective(message);
    if(directive)lang=directive;
  }
  return lang;
}

export function languageSystemInstruction(language:ConversationLanguage){
  return language==='en'
    ? 'LANGUAGE CONTRACT: answer the user in English until the user explicitly asks to return to Portuguese. Source language never overrides this.'
    : 'CONTRATO DE IDIOMA: responda em português do Brasil. Não mude para inglês só porque fontes, código, modelos ou documentos estão em inglês. Só use inglês como idioma principal se o usuário tiver pedido isso explicitamente nesta conversa.';
}

const PT_WORDS=new Set(['de','da','do','das','dos','que','para','como','com','uma','um','você','voce','se','não','nao','por','mais','pode','deve','isso','este','esta','criar','fazer','usar','ser','são','sao','em']);
const EN_WORDS=new Set(['the','and','that','for','with','this','you','your','from','how','can','should','would','are','is','to','of','in','on','create','make','use','here','actually','sources','user']);

function wordScores(text:string){
  const words=normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  let pt=0,en=0;
  for(const w of words){
    if(PT_WORDS.has(w))pt++;
    if(EN_WORDS.has(w))en++;
  }
  return {pt,en,total:words.length};
}

export function answerMatchesConversationLanguage(text:string,language:ConversationLanguage){
  const value=String(text||'').trim();
  if(value.length<80)return true;
  const {pt,en}=wordScores(value);
  if(language==='en')return !(pt>=8&&pt>en*1.8);
  return !(en>=8&&en>pt*1.6);
}
