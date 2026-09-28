import {compactText} from '@/lib/token-budget';

export type ImageEntityKind='person'|'character'|'franchise'|'brand'|'product'|'place'|'style'|'object'|'named-subject';

export interface ImageIntentEntity{
  id:string;
  label:string;
  kind:ImageEntityKind;
  franchise?:string;
  form?:string;
  confidence:number;
  source:'catalog'|'quoted'|'proper-noun'|'lead-subject'|'style';
}

export interface ImageIntentAnalysis{
  version:1;
  raw:string;
  normalized:string;
  specific:boolean;
  specificityScore:number;
  identitySensitive:boolean;
  requiresReferences:boolean;
  requiresLiteral:boolean;
  continuation:boolean;
  styleSensitive:boolean;
  entities:ImageIntentEntity[];
  styleHints:string[];
  reasons:string[];
  identityKey:string;
  referenceQueries:string[];
}

type CatalogEntry={
  id:string;
  label:string;
  kind:ImageEntityKind;
  aliases:string[];
  franchise?:string;
};

const CATALOG:CatalogEntry[]=[
  {id:'naruto-uzumaki',label:'Naruto Uzumaki',kind:'character',franchise:'Naruto',aliases:['naruto','naruto uzumaki']},
  {id:'sasuke-uchiha',label:'Sasuke Uchiha',kind:'character',franchise:'Naruto',aliases:['sasuke','sasuke uchiha']},
  {id:'kurama-nine-tails',label:'Kurama / Nine-Tails',kind:'character',franchise:'Naruto',aliases:['kurama','kyuubi','kyubi','nine tails','nove caudas']},
  {id:'perfect-susanoo',label:'Perfect Susanoo',kind:'character',franchise:'Naruto',aliases:['perfect susanoo','susanoo perfeito','susanoo']},
  {id:'goku',label:'Son Goku',kind:'character',franchise:'Dragon Ball',aliases:['goku','son goku']},
  {id:'vegeta',label:'Vegeta',kind:'character',franchise:'Dragon Ball',aliases:['vegeta']},
  {id:'frieza',label:'Frieza',kind:'character',franchise:'Dragon Ball',aliases:['frieza','freeza']},
  {id:'broly',label:'Broly',kind:'character',franchise:'Dragon Ball',aliases:['broly']},
  {id:'gojo-satoru',label:'Satoru Gojo',kind:'character',franchise:'Jujutsu Kaisen',aliases:['gojo','satoru gojo','gojo satoru']},
  {id:'luffy',label:'Monkey D. Luffy',kind:'character',franchise:'One Piece',aliases:['luffy','monkey d luffy','monkey d. luffy']},
  {id:'ichigo',label:'Ichigo Kurosaki',kind:'character',franchise:'Bleach',aliases:['ichigo','ichigo kurosaki']},
  {id:'pikachu',label:'Pikachu',kind:'character',franchise:'Pokémon',aliases:['pikachu']},
  {id:'sonic',label:'Sonic the Hedgehog',kind:'character',franchise:'Sonic',aliases:['sonic','sonic the hedgehog']},
  {id:'mario',label:'Mario',kind:'character',franchise:'Super Mario',aliases:['super mario','mario']},
  {id:'link-zelda',label:'Link',kind:'character',franchise:'The Legend of Zelda',aliases:['link de zelda','link zelda']},
  {id:'batman',label:'Batman',kind:'character',franchise:'DC',aliases:['batman']},
  {id:'superman',label:'Superman',kind:'character',franchise:'DC',aliases:['superman']},
  {id:'spider-man',label:'Spider-Man',kind:'character',franchise:'Marvel',aliases:['spider-man','spider man','homem aranha','homem-aranha']},
  {id:'minecraft',label:'Minecraft',kind:'franchise',aliases:['minecraft']},
  {id:'tesla',label:'Tesla',kind:'brand',aliases:['tesla']},
  {id:'playstation',label:'PlayStation',kind:'brand',aliases:['playstation','ps5','playstation 5']},
  {id:'alanzoka',label:'Alanzoka',kind:'person',aliases:['alanzoka','alan ferreira']}
];

const GENERIC_LEAD=new Set([
  'homem','mulher','garota','garoto','menina','menino','pessoa','personagem','animal','gato','cachorro','cao','cão',
  'macaco','mosca','camundongo','dragao','dragão','lobo','raposa','monstro','robo','robô','cidade','paisagem','carro',
  'casa','produto','imagem','foto','retrato','video','vídeo','cena','criatura','heroi','herói','guerreiro','influenciadora',
  'castelo','floresta','montanha','praia','nave','espada','planeta','quarto','sala','escritorio','escritório'
]);

const ACTION_BOUNDARY=/\b(?:lutando|enfrentando|batalhando|assistindo|olhando|correndo|andando|caminhando|sorrindo|voando|segurando|comendo|abracando|abraçando|dancando|dançando|posando|sentado|sentada|em pe|em pé|usando|vestindo|dirigindo|jogando|contra|fighting|facing|watching|running|walking|smiling|flying|holding|eating|hugging|dancing|wearing|driving|playing)\b/i;
const CONTINUATION=/\b(?:essa mesma|esse mesmo|a mesma|o mesmo|mesma garota|mesmo rosto|mesmo personagem|mesma pessoa|mesmo visual|mesmo padrao|mesmo padrão|continue com|continua com|como antes|igual a anterior|igual à anterior|same girl|same person|same face|same character|same identity|same look|same design|same as before)\b/i;
const EXACTNESS=/\b(?:exatamente|fiel|fidelidade|identico|idêntico|igual ao|igual a|parecido com|sem mudar|mesmo jeito|do jeito de|canonical|canonico|canônico|accurate|faithful|exact|same)\b/i;
const STYLE_PATTERN=/\b(?:estilo|style|jeito|visual|estetica|estética|aesthetic)\s+(?:de|do|da|of)?\s*([^,.;\n]{2,90})/ig;

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ').replace(/[^\p{L}\p{N}@._'’" -]+/gu,' ').replace(/\s+/g,' ').trim();
}

function slug(input:string){
  return normalize(input).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'subject';
}

function titleCase(input:string){
  return String(input||'').trim().replace(/\s+/g,' ').split(' ').map((w,i)=>i&&/^(?:de|da|do|dos|das|e|the|of)$/i.test(w)?w:(w.charAt(0).toUpperCase()+w.slice(1))).join(' ');
}

function addEntity(list:ImageIntentEntity[],entity:ImageIntentEntity){
  const key=normalize(entity.label);
  if(!key)return;
  const existing=list.find(x=>x.id===entity.id||normalize(x.label)===key);
  if(existing){
    existing.confidence=Math.max(existing.confidence,entity.confidence);
    existing.form=existing.form||entity.form;
    existing.franchise=existing.franchise||entity.franchise;
    return;
  }
  list.push(entity);
}

function formFor(entry:CatalogEntry,norm:string){
  if(entry.id==='naruto-uzumaki'&&/\b(kurama|kyuubi|kyubi|chakra mode|modo kurama)\b/.test(norm))return 'Kurama Chakra Mode';
  if(entry.id==='sasuke-uchiha'&&/\bsusanoo\b/.test(norm))return /\b(perfeito|perfect|completo|complete)\b/.test(norm)?'Perfect Susanoo':'Susanoo';
  if(entry.id==='goku'){
    if(/\b(super saiyajin blue|super saiyan blue|ssj blue|ssb)\b/.test(norm))return 'Super Saiyan Blue';
    if(/\b(instinto superior|ultra instinct)\b/.test(norm))return 'Ultra Instinct';
  }
  if(entry.id==='luffy'&&/\bgear\s*5\b/.test(norm))return 'Gear 5';
  if(entry.id==='ichigo'&&/\bbankai\b/.test(norm))return 'Bankai';
  return '';
}

function leadSubject(raw:string){
  let value=String(raw||'').trim()
    .replace(/^\s*(?:faça|faca|crie|gere|desenhe|mostre|quero|criar|gerar|create|make|generate|draw|show)\s+(?:uma?\s+imagem\s+(?:de|do|da)\s+|uma?\s+foto\s+(?:de|do|da)\s+|um\s+retrato\s+(?:de|do|da)\s+|retrato\s+(?:de|do|da)\s+|o\s+|a\s+|um\s+|uma\s+)?/i,'')
    .replace(/^[\s"'“”'‘’]+|[\s"'“”'‘’]+$/g,'');
  const boundary=value.search(ACTION_BOUNDARY);
  if(boundary>0)value=value.slice(0,boundary);
  value=value.split(/[,.;!?\n]/)[0].trim();
  value=value.replace(/\b(?:em|no|na)\s+(?:estilo|style)\b.*$/i,'').trim();
  value=value.split(/\s+(?:em|no|na|num|numa|sobre|dentro\s+de|ao\s+lado\s+de|ao|à|com)\s+/i)[0].trim();
  const words=value.split(/\s+/).filter(Boolean);
  if(!words.length||words.length>5)return '';
  const n=normalize(value);
  if(GENERIC_LEAD.has(n)||GENERIC_LEAD.has(n.split(' ')[0]))return '';
  if(/^(?:um|uma|o|a|the|an?)\b/.test(n))return '';
  if(/\b(?:realista|cinematico|cinemático|anime|manga|3d|fotorealista|photorealistic|gotico|gótico|luxo|cyberpunk)\b/.test(n)&&words.length<=3)return '';
  return value;
}

function quotedEntities(raw:string){
  const matches=[...String(raw||'').matchAll(/[“"'‘’]([^”"'‘’]{2,80})[”"'‘’]/g)];
  return matches.map(x=>x[1].trim()).filter(Boolean);
}

function properNouns(raw:string){
  const matches=String(raw||'').match(/\b(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\d'’.-]+(?:\s+(?:de|da|do|dos|das|D\.|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\d'’.-]+)){0,4})\b/gu)||[];
  return matches.filter(x=>!/^PredictLM$/i.test(x)&&!GENERIC_LEAD.has(normalize(x))).slice(0,8);
}

function styleHints(raw:string){
  const hints:string[]=[];
  STYLE_PATTERN.lastIndex=0;
  let m:RegExpExecArray|null;
  while((m=STYLE_PATTERN.exec(String(raw||'')))){
    const cleaned=m[1].replace(ACTION_BOUNDARY,'').trim().slice(0,90);
    if(cleaned)hints.push(cleaned);
    if(hints.length>=4)break;
  }
  if(/\b(gotico|gótico|gothic)\b/i.test(raw))hints.push('gótico');
  if(/\b(luxo|luxury)\b/i.test(raw))hints.push('luxo');
  if(/\b(cyberpunk|steampunk|dark fantasy|dark fofo|kawaii)\b/i.test(raw))hints.push((raw.match(/\b(cyberpunk|steampunk|dark fantasy|dark fofo|kawaii)\b/i)||[])[1]||'');
  return Array.from(new Set(hints.map(x=>x.trim()).filter(Boolean))).slice(0,5);
}

function looksLikeHandleOrName(value:string){
  const raw=String(value||'').trim();
  const n=normalize(raw);
  if(!n||GENERIC_LEAD.has(n))return false;
  if(/^@?[a-z][a-z0-9_.-]{2,24}$/i.test(raw)&&!GENERIC_LEAD.has(n))return true;
  if(/^(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}\d'’._-]+\s+){1,4}[A-ZÁÉÍÓÚÂÊÔÃÕÇ\d][\p{L}\d'’._-]*$/u.test(raw))return true;
  return /^[\p{L}\d][\p{L}\d'’._-]{1,}(?:\s+[\p{L}\d][\p{L}\d'’._-]{1,}){1,4}$/u.test(raw)&&!GENERIC_LEAD.has(n.split(' ')[0]);
}

export function analyzeImageIntent(input:string):ImageIntentAnalysis{
  const raw=compactText(String(input||'').trim(),1400);
  const norm=normalize(raw);
  const entities:ImageIntentEntity[]=[];
  const reasons:string[]=[];
  const continuation=CONTINUATION.test(raw);
  const exactness=EXACTNESS.test(raw);
  const styles=styleHints(raw);

  for(const entry of CATALOG){
    const hit=entry.aliases.find(alias=>new RegExp('(?:^|\\b)'+alias.replace(/[.*+?^$(){}|[\]\\]/g,'\\  for(const entry of CATALOG){
    const hit=entry.aliases.find(alias=>new RegExp('(?:^|\\b)'+alias.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')+'(?:\\b|$)','i').test(norm));
    if(!hit)continue;
    addEntity(entities,{').replace(/\s+/g,'\\s+')+'(?:\\b|$)','i').test(norm));
    if(!hit)continue;
    if(entry.id==='kurama-nine-tails'&&/\b(modo kurama|kurama chakra mode|chakra mode|manto da kurama|kurama cloak)\b/.test(norm)&&!/\b(avatar (?:completo|gigante)|full kurama avatar|complete kurama avatar|kurama inteira|kurama inteiro|raposa gigante|nine tails fox|nove caudas completa|nove caudas completo)\b/.test(norm))continue;
    addEntity(entities,{
      id:entry.id,label:entry.label,kind:entry.kind,franchise:entry.franchise,
      form:formFor(entry,norm)||undefined,confidence:.98,source:'catalog'
    });
  }

  for(const quoted of quotedEntities(raw)){
    const n=normalize(quoted);
    if(!n||n.length<3)continue;
    addEntity(entities,{id:'quoted:'+slug(quoted),label:quoted,kind:/\b(?:style|estilo|visual)\b/i.test(raw)?'style':'named-subject',confidence:.86,source:'quoted'});
  }

  const lead=leadSubject(raw);
  const deicticContinuationLead=continuation&&/^(?:essa|esse|a mesma|o mesmo|mesma|mesmo)\b/i.test(String(lead||''));
  if(lead&&!deicticContinuationLead&&looksLikeHandleOrName(lead)){
    const leadWords=normalize(lead).split(' ').filter(Boolean);
    const catalogWords=new Set(
      entities.filter(x=>x.source==='catalog').flatMap(x=>normalize(x.label).split(' ')).filter(Boolean)
    );
    const fullyCoveredByCatalog=leadWords.length>0&&leadWords.every(word=>catalogWords.has(word));
    if(!fullyCoveredByCatalog){
      const personContext=/\b(?:pessoa|homem|mulher|celebridade|famos[oa]|ator|atriz|cantor|cantora|streamer|youtuber|influenciador|influenciadora|retrato|portrait|foto|photo)\b/i.test(raw);
      const productContext=/\b(?:produto|product|modelo|model|celular|smartphone|telefone|phone|notebook|laptop|console|carro|vehicle|veiculo|veículo)\b/i.test(raw)||/\d/.test(lead);
      addEntity(entities,{id:'lead:'+slug(lead),label:titleCase(lead.replace(/^@/,'')),kind:personContext?'person':productContext?'product':'named-subject',confidence:.84,source:'lead-subject'});
    }
  }

  for(const style of styles){
    if(style.length<3)continue;
    if(/^(?:gotico|gótico|luxo|cyberpunk|steampunk|kawaii|dark fantasy|dark fofo)$/i.test(style))continue;
    addEntity(entities,{id:'style:'+slug(style),label:style,kind:'style',confidence:.68,source:'style'});
  }

  for(const name of properNouns(raw)){
    const n=normalize(name);
    const coveredByCatalog=CATALOG.some(entry=>entry.aliases.some(alias=>{
      const a=normalize(alias);
      return a===n||a.includes(n)||n.includes(a);
    }));
    if(coveredByCatalog)continue;
    if(entities.some(x=>normalize(x.label).includes(n)||n.includes(normalize(x.label))))continue;
    addEntity(entities,{id:'proper:'+slug(name),label:name,kind:'named-subject',confidence:.72,source:'proper-noun'});
  }

  const namedEntities=entities.filter(x=>x.kind!=='style'&&x.kind!=='franchise');
  const namedFranchise=entities.some(x=>x.kind==='franchise'||x.franchise);
  const styleSensitive=styles.length>0||entities.some(x=>x.kind==='style');
  const explicitReference=/\b(?:referencia|referência|foto de referencia|imagem de referencia|igual a essa|igual esta|igual à essa|como essa|como esta|based on|reference image)\b/i.test(raw);
  const visualSpecificNoun=/\b(?:marca|brand|modelo|model|produto|product|personagem|character|franquia|franchise|celebridade|famos[oa]|ator|atriz|cantor|cantora|streamer|youtuber|influenciador|influenciadora|landmark|monumento)\b/i.test(raw);

  let score=0;
  if(namedEntities.length)score+=.42;
  if(namedFranchise)score+=.18;
  if(continuation)score+=.26;
  if(exactness)score+=.16;
  if(explicitReference)score+=.22;
  if(styleSensitive)score+=.10;
  if(visualSpecificNoun)score+=.12;
  if(entities.some(x=>x.confidence>=.95))score+=.12;
  score=Math.max(0,Math.min(1,score));

  const identitySensitive=continuation||namedEntities.length>0||explicitReference||visualSpecificNoun;
  const requiresReferences=identitySensitive&&(score>=.38||exactness)||explicitReference;
  const requiresLiteral=identitySensitive||exactness||continuation;
  const specific=score>=.32||requiresLiteral||styleSensitive;

  if(namedEntities.length)reasons.push('named visual subject');
  if(namedFranchise)reasons.push('known franchise/canonical entity');
  if(continuation)reasons.push('identity continuation');
  if(exactness)reasons.push('explicit fidelity/likeness');
  if(explicitReference)reasons.push('reference requested');
  if(styleSensitive)reasons.push('specific visual style');

  const identityParts=entities
    .filter(x=>x.kind!=='style'&&x.kind!=='franchise')
    .map(x=>x.id+(x.form?':'+slug(x.form):''))
    .sort();
  const identityKey=continuation&&!identityParts.length?'continuation:previous-approved':identityParts.join('|');

  const referenceQueries:string[]=[];
  for(const entity of entities.filter(x=>x.kind!=='style'&&x.kind!=='franchise').slice(0,5)){
    const form=entity.form?' '+entity.form:'';
    const franchise=entity.franchise?' '+entity.franchise:'';
    const kindHint=entity.kind==='person'?' recent portrait face appearance':entity.kind==='brand'||entity.kind==='product'?' official product design':' canonical official visual reference';
    referenceQueries.push(compactText(entity.label+form+franchise+kindHint,300));
  }
  if(styleSensitive&&styles.length)referenceQueries.push(compactText(styles.join(' ')+' visual style reference',300));

  return {
    version:1,raw,normalized:norm,specific,specificityScore:Number(score.toFixed(2)),
    identitySensitive,requiresReferences,requiresLiteral,continuation,styleSensitive,
    entities,styleHints:styles,reasons,identityKey,
    referenceQueries:Array.from(new Set(referenceQueries)).slice(0,8)
  };
}

export function imageIntentSummary(intent:ImageIntentAnalysis){
  return [
    'specific='+intent.specific,
    'score='+intent.specificityScore,
    'identity='+intent.identitySensitive,
    'references='+intent.requiresReferences,
    'literal='+intent.requiresLiteral,
    'entities='+(intent.entities.map(x=>x.label+(x.form?' ['+x.form+']':'')).join(', ')||'none'),
    'styles='+(intent.styleHints.join(', ')||'none')
  ].join(' · ');
}
