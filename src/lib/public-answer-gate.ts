import type { ConversationLanguage } from './language-policy';
import { answerMatchesConversationLanguage } from './language-policy';

const REASONING_PATTERNS=[
  /<think[\\s>]/i,
  /<\\/think>/i,
  /here'?s (?:a|the) thinking process/i,
  /(?:my|the) reasoning process/i,
  /chain of thought/i,
  /step[- ]by[- ]step reasoning/i,
  /pass\\s*\\d+\\s*:/i,
  /actually,? let me re[- ]?examine/i,
  /i need to (?:be careful|check|analy[sz]e|answer|consider)/i,
  /the policy says/i,
  /the user wants/i,
  /looking at the sources/i,
  /let me formulate the answer/i,
  /i should answer/i,
  /i'll answer/i,
  /analysis\\s*:/i
];

const INTERNAL_RUNTIME_PATTERNS=[
  /^\\s*(?:fallback|engine|provider|route|router|skill|council|forge|aegis|parallax|prompt os|token saver|knowledge fallback)\\s*[:·-]/im,
  /(?:provider mesh|fallback local|knowledge fallback|runtime local).*?(?:respondeu|falhou|indispon[ií]vel)/i
];

export function hasInternalReasoningLeak(text:string){
  const value=String(text||'');
  return REASONING_PATTERNS.some(re=>re.test(value));
}

export function hasInternalRuntimeLeak(text:string){
  const value=String(text||'');
  return INTERNAL_RUNTIME_PATTERNS.some(re=>re.test(value));
}

export function sanitizePublicAnswer(raw:string){
  let value=String(raw||'')
    .replace(/<thinking>[\\s\\S]*?<\\/thinking>/gi,'')
    .replace(/<think>[\\s\\S]*?<\\/think>/gi,'')
    .replace(/```(?:thinking|analysis)[\\s\\S]*?```/gi,'')
    .trim();

  if(hasInternalReasoningLeak(value))return '';

  value=value
    .split(/\\r?\\n/)
    .filter(line=>!/^\\s*(?:engine|provider|fallback|skill|route|router|trace|council|forge|aegis|parallax)\\s*[:·-]/i.test(line))
    .join('\\n')
    .replace(/\\n{3,}/g,'\\n\\n')
    .trim();

  return value;
}

export function publicAnswerGate(text:string,language:ConversationLanguage){
  const sanitized=sanitizePublicAnswer(text);
  if(!sanitized)return {ok:false,content:'',reason:'internal-reasoning'};
  if(hasInternalRuntimeLeak(sanitized))return {ok:false,content:'',reason:'internal-runtime'};
  if(!answerMatchesConversationLanguage(sanitized,language))return {ok:false,content:'',reason:'wrong-language'};
  if(sanitized.length<2)return {ok:false,content:'',reason:'empty'};
  return {ok:true,content:sanitized,reason:'ok'};
}
