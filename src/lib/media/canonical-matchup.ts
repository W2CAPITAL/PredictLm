const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export function isNarutoKuramaVsSasukeSusanooPrompt(input:string){
  const p=normalize(input);
  return /\bnaruto\b/.test(p)&&/\b(kurama|kyuubi|kyubi|nove caudas|nine[- ]tails)\b/.test(p)
    &&/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p);
}

export function wantsKuramaChakraMode(input:string){
  const p=normalize(input);
  return /\b(modo kurama|kurama chakra mode|chakra mode|manto da kurama|kurama cloak|chakra da kurama|aura dourada[^.]{0,80}kurama)\b/.test(p);
}

export function wantsFullKuramaAvatar(input:string){
  const p=normalize(input);
  if(wantsKuramaChakraMode(input)&&!/\b(avatar (?:completo|gigante)|full kurama avatar|complete kurama avatar|kurama inteira|kurama inteiro|raposa gigante|nine[- ]tails fox|nove caudas completa|nove caudas completo)\b/.test(p))return false;
  return /\b(full kurama avatar|complete kurama avatar|avatar (?:completo|gigante) da kurama|kurama (?:inteira|inteiro|completa|completo)|raposa gigante[^.]{0,50}(?:kurama|nove caudas)|nine[- ]tails fox)\b/.test(p);
}
export function wantsTechData(input:string){
  return /\b(binario|binary|neural|dados|tech[- ]data|drone|circuitos?|holograma|cyberpunk)\b/.test(normalize(input));
}
export function requestsValleyOfTheEnd(input:string){
  return /\b(vale do fim|valley of the end|hashirama|madara|estatuas)\b/.test(normalize(input));
}
export function canonicalMatchupLock(input:string){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return '';
  const fullKurama=wantsFullKuramaAvatar(input);
  const narutoLock=fullKurama
    ? 'LEFT: Naruto Uzumaki must remain visibly Naruto — spiky BLOND hair, whisker cheek marks and requested shinobi cues — while associated with a gigantic complete golden-orange Kurama/Nine-Tails fox avatar. Kurama must read as a fox with nine distinct tails, never a dragon, wolf, flame monster or humanoid clone.'
    : 'LEFT: Naruto Uzumaki himself is in Kurama Chakra Mode: spiky BLOND hair, visible whisker cheek marks, requested Leaf/shinobi cues and a bright GOLDEN-ORANGE chakra cloak/aura wrapped around HIS BODY. A subtle fox/chakra silhouette may support the scene, but do NOT invent a separate giant Kurama beast unless the user explicitly asks for the full Kurama avatar.';
  return [
    'CANONICAL MATCHUP MASTER LOCK: Naruto in the requested Kurama form versus Sasuke with Perfect Susanoo. Render a premium anime battle key visual with a wide readable left-vs-right composition, strong silhouette separation and one clear central clash.',
    narutoLock,
    'RIGHT: Sasuke Uchiha must remain visibly Sasuke — BLACK hair and recognizable Uchiha/Sasuke face-silhouette — and is surrounded/associated with a gigantic complete VIOLET/PURPLE Perfect Susanoo. Susanoo must be a full armored humanoid chakra avatar, winged when framing permits, not purple smoke, generic demon, dragon, mecha or ordinary aura.',
    'CENTER: one controlled energy collision between the two sides. The clash is a focal connector, not the subject itself: it must occupy a minority of the frame and may not obscure Naruto, Sasuke or Perfect Susanoo.',
    'DEPTH: foreground debris/terrain, full readable combatants in the midground, environment/background behind them. Avoid thumbnail-like close crops, duplicated characters, random third fighters and unreadable energy clutter.',
    'COLOR DISCIPLINE: Naruto/Kurama mode is gold/orange; Sasuke/Perfect Susanoo is violet/purple/electric blue. Preserve clean color ownership instead of recoloring both fighters red/orange.',
    requestsValleyOfTheEnd(input)?'SETTING LOCK: Valley of the End, waterfall canyon, dramatic sky and the monumental Hashirama and Madara statues clearly readable behind the battle, without replacing the combatants.':''
  ].filter(Boolean).join('\n');
}
export const MATCHUP_NEGATIVES=[
  'generic anime explosion poster','two Narutos','duplicate Sasuke','missing Perfect Susanoo',
  'abstract purple energy instead of Susanoo','robotic armor unrelated to Susanoo',
  'cropped giant Susanoo','only close-up faces','chaotic unreadable composition',
  'photorealistic live action','central explosion hiding Naruto Sasuke or Susanoo',
  'Susanoo torso only','missing Susanoo wings','purple smoke instead of Susanoo','third random fighter',
  'mixed orange and purple palette on both sides','close-up crop hiding the requested combatants','energy effect larger than both combatants'
];

const FULL_KURAMA_NEGATIVES=[
  'missing Kurama','fox only in the background','dragon instead of Kurama','humanoid Kurama',
  'Naruto clone used as Kurama','wolf instead of Kurama','generic spirit beast instead of Kurama'
];

const KURAMA_MODE_NEGATIVES=[
  'red-haired Naruto','red cloak replacing golden Kurama chakra','generic red fighter instead of Naruto',
  'separate giant dragon behind Naruto','separate giant fox avatar not requested','orange monster replacing Naruto Kurama mode'
];

export function matchupNegativeConstraints(input:string){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return [];
  return [
    ...MATCHUP_NEGATIVES,
    ...(wantsFullKuramaAvatar(input)?FULL_KURAMA_NEGATIVES:KURAMA_MODE_NEGATIVES)
  ];
}
export function matchupReferenceQueries(input:string){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return [];
  return [
    wantsFullKuramaAvatar(input)
      ? 'Naruto Uzumaki with complete Kurama Nine-Tails fox avatar official anime reference'
      : 'Naruto Uzumaki Kurama Chakra Mode golden chakra cloak official anime reference',
    'Sasuke Uchiha Perfect Susanoo full body purple armored avatar official anime reference',
    ...(requestsValleyOfTheEnd(input)?['Valley of the End Hashirama Madara statues reference']:[])
  ];
}
export type SemanticImageReview={status:'passed'|'failed'|'unavailable';issues:string[];retryPrompt:string;reviewProvider?:string;reviewModel?:string};
const ISSUE_REPAIRS:Record<string,string>={
  'missing-kurama':'Show the complete golden nine-tailed Kurama avatar clearly on the Naruto side only when a full Kurama avatar was requested.',
  'wrong-kurama-mode':'Correct Naruto into Kurama Chakra Mode: preserve his blond hair and whisker marks and wrap his own body in a bright golden-orange chakra cloak/aura. Do not replace this with red clothing or a generic orange monster.',
  'missing-susanoo':'Show the complete purple armored winged Perfect Susanoo clearly on the Sasuke side.',
  'wrong-naruto-identity':'Correct Naruto Uzumaki: spiky blond hair, visible whisker cheek marks, Leaf shinobi identity cues and the requested golden Kurama chakra form. Do not recolor his hair red or replace him with a generic anime fighter.',
  'wrong-sasuke-identity':'Correct Sasuke Uchiha: black hair, recognizable Sasuke face/silhouette and requested Sasuke-era clothing cues. Keep him visually distinct from Naruto and generic red-cloaked fighters.',
  'wrong-kurama-form':'Correct Kurama into a recognizable fox/Nine-Tails chakra avatar with fox anatomy and multiple distinct tails. Do not use a dragon, wolf, flame monster or humanoid clone.',
  'wrong-susanoo-form':'Correct Perfect Susanoo into a gigantic complete violet/purple armored winged humanoid chakra avatar. Do not use smoke, ordinary aura, dragon, generic demon or mecha.',
  'wrong-color-ownership':'Restore color ownership: Naruto/Kurama = gold/orange; Sasuke/Perfect Susanoo = violet/purple/electric-blue accents. Do not make both sides orange/red.',
  'low-character-readability':'Increase separation and readability of Naruto, Sasuke, the requested Kurama form and Perfect Susanoo.',
  'central-explosion':'Reduce the central explosion so it does not cover Naruto, Sasuke or Perfect Susanoo.',
  'missing-statues':'Show the Valley of the End waterfall canyon and both Hashirama and Madara statues.'
};
export function parseSemanticImageReview(value:unknown,originalPrompt:string):SemanticImageReview{
  const v=value as {issues?:unknown};
  if(!v||!Array.isArray(v.issues)||v.issues.some(x=>typeof x!=='string'||!(x in ISSUE_REPAIRS)))return {status:'unavailable',issues:[],retryPrompt:''};
  const fullKurama=wantsFullKuramaAvatar(originalPrompt);
  const kuramaMode=wantsKuramaChakraMode(originalPrompt);
  const issues=[...new Set(v.issues as string[])].filter(issue=>{
    if(issue==='missing-statues'&&!requestsValleyOfTheEnd(originalPrompt))return false;
    if((issue==='missing-kurama'||issue==='wrong-kurama-form')&&!fullKurama)return false;
    if(issue==='wrong-kurama-mode'&&!kuramaMode)return false;
    return true;
  });
  return {status:issues.length?'failed':'passed',issues,retryPrompt:issues.map(x=>ISSUE_REPAIRS[x]).join(' ')};
}


export function recommendedMatchupAspect(input:string,current='1:1'){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return current;
  return current==='1:1'?'16:9':current;
}
