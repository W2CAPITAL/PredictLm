import { compactText } from '@/lib/token-budget';

export interface VisualReference{
  id:string;
  title:string;
  imageUrl:string;
  thumbnailUrl?:string;
  pageUrl?:string;
  source:'google-images'|'pinterest-via-google'|'pinterest-provider'|'conversation'|'canonical-self';
  width?:number;
  height?:number;
  snippet?:string;
}

function norm(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export function isCanonicalSelfVisualRequest(input:string){
  const q=norm(input);
  const self=/\b(voce|você|predict|predictlm|ia|inteligencia artificial|inteligência artificial)\b/.test(q);
  const identity=/\b(como voce e|como você é|como voce se ve|como você se vê|na vida real|sua aparencia|sua aparência|seu rosto|seu corpo|retrato seu|foto sua|self portrait|what do you look like|how do you see yourself)\b/.test(q);
  const visual=/\b(imagem|foto|retrato|desenhe|desenha|gere|gerar|crie|criar|mostre|mostrar|visual|aparencia|aparência|look like)\b/.test(q);
  return self&&(identity||visual&&/\b(voce|você|predict|predictlm)\b/.test(q));
}

export function needsExternalVisualReferences(input:string){
  const q=norm(input);
  if(isCanonicalSelfVisualRequest(input))return false;
  const character=/\b(personagem|character|anime|cosplay|roupa|outfit|rosto|face|cabelo|hair|armadura|armor|criatura|dragon|dragao|dragão)\b/.test(q);
  const product=/\b(carro|car|moto|produto|product|arquitetura|interior|fachada|objeto|escultura|metal|maquina|máquina)\b/.test(q);
  const exact=/\b(exato|exata|especifico|específico|fiel|igual|identico|idêntico|referencia|referência|detalhado|detalhada|modelo|versao|versão)\b/.test(q);
  return input.trim().length>=28&&(character||product||exact);
}

export function visualReferenceQuery(input:string){
  const cleaned=norm(input)
    .replace(/\b(crie|criar|gere|gerar|faca|faça|imagem|foto|desenhe|desenha|quero|por favor)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  return compactText(cleaned||input,180);
}

export function visualReferenceContext(refs:VisualReference[]){
  if(!refs.length)return '';
  return refs.slice(0,8).map((ref,i)=>[
    'REF'+(i+1),
    ref.title,
    ref.snippet||'',
    ref.source
  ].filter(Boolean).join(' · ')).join('\n');
}

export function buildReferenceAwareVisualPrompt(input:{
  prompt:string;
  style:string;
  visualBrief?:string;
  localAdvisory?:string;
  references?:VisualReference[];
}){
  const refs=input.references||[];
  const referenceSummary=refs.slice(0,8).map((r,i)=>
    'R'+(i+1)+': '+compactText([r.title,r.snippet].filter(Boolean).join(' — '),140)
  ).join('; ');
  return compactText([
    input.prompt,
    input.visualBrief?'VISUAL BRIEF: '+input.visualBrief:'',
    input.localAdvisory?'LOCAL VISUAL REVIEW: '+input.localAdvisory:'',
    referenceSummary?'REFERENCE DOSSIER: '+referenceSummary:'',
    'Preserve every explicit identity, material, wardrobe, color, silhouette, era, object and composition constraint from the user.',
    refs.length?'Use web references only to resolve visual ambiguity and factual appearance. Do not randomly substitute another character/object just because it is visually similar.':'',
    'When references conflict, the user prompt has priority.',
    'Style direction: '+input.style
  ].filter(Boolean).join('\n'),1800);
}
