export type MediaLibraryLike={
  prompt?:string|null;
  enhanced_prompt?:string|null;
  style?:string|null;
  aspect_ratio?:string|null;
  seed?:number|null;
  kind?:string|null;
  meta?:Record<string,any>|null;
};

function normalize(input:string){
  return String(input||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function compact(input:string,max=180){
  const text=String(input||'').replace(/\s+/g,' ').trim();
  if(text.length<=max)return text;
  return text.slice(0,Math.max(0,max-1)).trimEnd()+'…';
}

export function mediaOriginalPrompt(item:MediaLibraryLike){
  const meta=item?.meta&&typeof item.meta==='object'?item.meta:{};
  return String(
    meta?.promptOriginal ||
    meta?.originalPrompt ||
    meta?.prompt_original ||
    item?.prompt ||
    ''
  ).trim();
}

export function extractRequestedNamedSubject(input:string){
  const raw=String(input||'').trim();
  const cleaned=raw
    .replace(/^\s*(?:faça|faca|crie|gere|desenhe|mostre|quero|create|make|generate|draw|show)\s+(?:uma?\s+imagem\s+de\s+|um\s+retrato\s+de\s+|retrato\s+de\s+|o\s+|a\s+|do\s+|da\s+)?/i,'')
    .replace(/\s+(?:em|no|na|com)\s+(?:estilo|style)\b.*$/i,'')
    .replace(/[.!?]+$/,'')
    .trim();
  const words=cleaned.split(/\s+/).filter(Boolean);
  if(words.length<2||words.length>5)return '';
  if(/^(?:um|uma|o|a)\s+/i.test(cleaned))return '';
  const generic=/^(?:drag[aã]o|lobo|raposa|gato|cachorro|macaco|homem|mulher|menino|menina|cidade|paisagem|carro|rob[oô]|monstro|animal|personagem)\b/i;
  if(generic.test(cleaned))return '';
  return cleaned;
}

export function isLikelyNamedPersonPrompt(input:string){
  const raw=String(input||'').trim();
  const p=normalize(raw);
  if(/\b(elon musk|taylor swift|cristiano ronaldo|lionel messi|beyonce|rihanna|lady gaga|brad pitt|tom cruise|zendaya|keanu reeves)\b/.test(p))return true;
  const subject=extractRequestedNamedSubject(raw);
  if(!subject)return false;
  return /^(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’-]+\s+){1,4}[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’-]+$/u.test(subject);
}

export function isConcreteCreaturePrompt(input:string){
  const p=normalize(input);
  return /\b(dragao|dragon|fenix|phoenix|grifo|griffin|unicorno|unicorn)\b/.test(p);
}

export function isSpecificFranchisePrompt(input:string){
  const p=normalize(input);
  if(/\b(naruto|sasuke|kurama|susanoo|sharingan|rinnegan|uzumaki|uchiha|bijuu|besta de caudas|quatro caudas|four tails|son goku bijuu|dragon ball|goku|vegeta|gohan|freeza|frieza|cell|majin boo|majin buu|broly|oozaru|great ape|pikachu|pokemon|sonic|mario|zelda|batman|superman|spider man|homem aranha|kuromi|hello kitty)\b/.test(p))return true;
  if(/\b(personagem|character|anime|manga|franquia|franchise|jogo|game|filme|movie|serie|series|marca|brand)\b/.test(p))return true;
  return false;
}

export function shouldForceLiteralMode(input:string){
  return isSpecificFranchisePrompt(input)||isLikelyNamedPersonPrompt(input)||isConcreteCreaturePrompt(input);
}

export function isAnimeFranchisePrompt(input:string){
  const p=normalize(input);
  return /\b(naruto|sasuke|kurama|susanoo|sharingan|rinnegan|uzumaki|uchiha|bijuu|besta de caudas|quatro caudas|four tails|son goku bijuu|dragon ball|goku|vegeta|gohan|freeza|frieza|cell|majin boo|majin buu|broly|oozaru|great ape|pikachu|pokemon|anime|manga|shonen)\b/.test(p);
}

export function recommendedImageStyle(input:string,currentStyle='Cinematic'){
  const current=String(currentStyle||'Cinematic').trim()||'Cinematic';
  if(isAnimeFranchisePrompt(input)&&/^cinematic$/i.test(current))return 'Anime';
  if(isLikelyNamedPersonPrompt(input)&&/^cinematic$/i.test(current))return 'Photoreal';
  return current;
}

export function buildSpecificNegativePrompt(originalPrompt:string,userNegative=''){
  const p=normalize(originalPrompt);
  const values=[
    userNegative.trim(),
    'wrong character identity',
    'generic lookalike',
    'unrequested extra character',
    'duplicate main character',
    'fused opponents',
    'wrong costume',
    'wrong hair color',
    'wrong franchise',
    'missing requested transformation',
    'missing requested power form',
    'random text',
    'watermark',
    'fake UI',
    'deformed hands',
    'extra limbs',
    'duplicated face',
    'blurry focal subject',
    'muddy textures'
  ];

  if(isLikelyNamedPersonPrompt(originalPrompt)){
    values.push(
      'robot face',
      'cyborg',
      'android',
      'alien',
      'helmet covering the face',
      'armored mask',
      'mechanical skin',
      'fantasy creature',
      'altered facial identity',
      'different person'
    );
  }

  if(/\b(dragao|dragon)\b/.test(p)){
    values.push(
      'lizard',
      'gecko',
      'iguana',
      'small reptile',
      'ordinary reptile',
      'snake',
      'dinosaur',
      'tiny creature',
      'bat without dragon anatomy',
      'missing dragon head',
      'missing draconic body',
      'reptile close-up'
    );
  }

  if(/\b(naruto|kurama|uzumaki)\b/.test(p)){
    values.push(
      'Goku from Dragon Ball',
      'Vegeta',
      'Dragon Ball character',
      'wrong tailed beast',
      'missing Kurama',
      'dragon instead of Kurama',
      'lion instead of Kurama',
      'generic blond warrior instead of Naruto'
    );
  }
  if(/\b(sasuke|susanoo|uchiha)\b/.test(p)){
    values.push(
      'missing Perfect Susanoo',
      'generic purple robot',
      'generic purple demon',
      'wrong armored avatar',
      'Naruto duplicated as Sasuke'
    );
  }
  if(/\b(freeza|frieza)\b/.test(p)){
    values.push(
      'armored demon',
      'dragon',
      'red black monster',
      'wrong alien',
      'wrong purple placement',
      'Saiyan hair',
      'Goku face'
    );
  }
  if(/\b(oozaru|great ape|macaco de dragon ball|macaco do dragon ball)\b/.test(p)){
    values.push(
      'robot ape',
      'armored demon',
      'small monkey',
      'ordinary monkey portrait',
      'missing Saiyan tail',
      'wrong franchise'
    );
  }
  if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/\b(naruto|anime naruto)\b/.test(p)){
    values.push(
      'Dragon Ball Goku',
      'human Goku',
      'ordinary monkey',
      'wrong tailed beast',
      'missing four tails',
      'blue beast',
      'purple beast'
    );
  }
  return Array.from(new Set(values.filter(Boolean))).join(', ');
}

function stripTechnicalNoise(input:string){
  return String(input||'')
    .replace(/^\s*\[(?:ESTILO|STYLE|PROMPT|CINEMATIC|ANIME)\]\s*/i,'')
    .replace(/\b(?:cinematic|photoreal(?:istic)?|editorial|anime key visual|premium anime key visual|masterpiece|highly detailed|sharp focus|volumetric lighting|dramatic lighting|8k|4k|uhd|ultra hd|seed\s*[:#]?\s*\d+)\b/gi,' ')
    .replace(/\s*[·|]{1,2}\s*/g,' · ')
    .replace(/\s+/g,' ')
    .trim();
}

function technicalLeak(input:string){
  const p=normalize(input);
  return /\b(prompt|negative prompt|visual direction|camera lens|volumetric|masterpiece|highly detailed|sharp focus|render|style|seed|aspect ratio|identity lock|reference grounding|media director brief)\b/.test(p);
}

export function buildDisplayTitle(input:string){
  const source=String(input||'');
  const hadTechnicalPrefix=/^\s*\[(?:ESTILO|STYLE|PROMPT|CINEMATIC|ANIME)\]/i.test(source);
  const raw=stripTechnicalNoise(source);
  const p=normalize(raw);

  if(/naruto/.test(p)&&/sasuke/.test(p)&&/kurama/.test(p)&&/susanoo/.test(p))return 'Naruto Kurama vs Sasuke Susanoo';
  if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/naruto/.test(p))return 'Bijuu de Quatro Caudas';
  if(/\b(freeza|frieza)\b/.test(p))return 'Freeza';
  if(/\b(oozaru|great ape|macaco de dragon ball|macaco do dragon ball)\b/.test(p))return 'Oozaru de Dragon Ball';
  if(/\bgoku\b/.test(p)&&/dragon ball/.test(p))return 'Goku';
  if(/\bnaruto\b/.test(p)&&/\bsasuke\b/.test(p))return 'Naruto vs Sasuke';
  if(/\bnaruto\b/.test(p))return 'Naruto';
  if(/\bsasuke\b/.test(p))return 'Sasuke';
  if(/\b(?:macaco|monkey)\b/.test(p))return 'Retrato de macaco';
  if(/\b(dragao|dragon)\b/.test(p))return /\bbranco|white\b/.test(p)?'Dragão branco':'Dragão';
  const named=extractRequestedNamedSubject(raw);
  if(named)return compact(named,60);

  if(hadTechnicalPrefix||technicalLeak(raw))return 'Geração visual';
  const cleaned=raw
    .replace(/^\s*(?:faça|faca|crie|gere|desenhe|mostre|create|make|generate)\s+(?:um|uma|o|a)?\s*/i,'')
    .replace(/[.!?;:,]+$/g,'')
    .trim();
  if(!cleaned)return 'Geração visual';
  return compact(cleaned.charAt(0).toUpperCase()+cleaned.slice(1),60);
}

export function sanitizeLibraryCaption(input:string,fallback=''){
  let text=stripTechnicalNoise(input);
  text=text
    .replace(/^\s*(?:faça|faca|crie|gere|desenhe|mostre|create|make|generate)\s+/i,'')
    .replace(/^\s*epic anime battle key visual[,;:]?\s*/i,'')
    .trim();

  if(!text||text.length<12||technicalLeak(text))return fallback;
  if(/^\[/.test(text))return fallback;
  return compact(text,180);
}

export function buildSafeCaptionPtBr(promptOriginal:string,existingCaption=''){
  const source=String(promptOriginal||'').trim();
  const p=normalize(source);

  const existing=sanitizeLibraryCaption(existingCaption,'');
  if(existing)return existing;

  if(/naruto/.test(p)&&/sasuke/.test(p)&&/kurama/.test(p)&&/susanoo/.test(p)){
    return 'Naruto em modo Kurama enfrenta Sasuke com o Susanoo perfeito em um choque direto de energia.';
  }
  if(/\b(bijuu|besta de caudas|quatro caudas|four tails)\b/.test(p)&&/naruto/.test(p)){
    return 'A Bijuu de Quatro Caudas de Naruto aparece em destaque, preservando sua forma e identidade canônicas.';
  }
  if(/\b(freeza|frieza)\b/.test(p)){
    return 'Freeza aparece em destaque com sua identidade clássica de Dragon Ball preservada.';
  }
  if(/\b(oozaru|great ape|macaco de dragon ball|macaco do dragon ball)\b/.test(p)){
    return 'O Oozaru de Dragon Ball aparece como o Grande Macaco Saiyajin, mantendo a identidade da franquia.';
  }
  if(/\bnaruto\b/.test(p)&&/\bsasuke\b/.test(p)){
    return 'Naruto e Sasuke aparecem em confronto, mantendo suas identidades e elementos visuais característicos.';
  }
  if(/\bnaruto\b/.test(p)){
    return 'Naruto aparece como o personagem central da cena, com sua identidade visual preservada.';
  }
  if(/\bsasuke\b/.test(p)){
    return 'Sasuke aparece como o personagem central da cena, com sua identidade visual preservada.';
  }
  if(/\b(?:macaco|monkey)\b/.test(p)){
    return 'Retrato de um macaco em destaque, com foco no rosto e na expressão.';
  }
  if(/\b(dragao|dragon)\b/.test(p)){
    if(/\bbranco|white\b/.test(p)&&/\bolhos azuis|blue eyes\b/.test(p)){
      return 'Um grande dragão branco de olhos azuis aparece como a criatura central da cena.';
    }
    return 'Um dragão de anatomia claramente fantástica aparece como a criatura central da cena.';
  }
  if(isLikelyNamedPersonPrompt(source)){
    const named=extractRequestedNamedSubject(source)||buildDisplayTitle(source);
    return 'Retrato de '+named+', preservando aparência humana e identidade facial.';
  }

  const title=buildDisplayTitle(source);
  return title==='Geração visual'?'Imagem gerada.':compact('Cena gerada a partir do pedido: '+title+'.',180);
}

export function normalizeMediaLibraryItem<T extends MediaLibraryLike>(item:T):T{
  const meta=item?.meta&&typeof item.meta==='object'?item.meta:{};
  const original=mediaOriginalPrompt(item);
  const title=buildDisplayTitle(original||String(item?.prompt||''));
  const caption=buildSafeCaptionPtBr(original||String(item?.prompt||''),String(meta?.caption||''));
  return {
    ...item,
    meta:{
      ...meta,
      promptOriginal:original||String(item?.prompt||''),
      displayTitle:title,
      caption
    }
  };
}
