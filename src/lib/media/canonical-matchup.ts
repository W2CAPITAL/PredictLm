const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export function isNarutoKuramaVsSasukeSusanooPrompt(input:string){
  const p=normalize(input);
  return /\bnaruto\b/.test(p)&&/\b(kurama|kyuubi|kyubi|nove caudas|nine[- ]tails)\b/.test(p)
    &&/\bsasuke\b/.test(p)&&/\bsusanoo\b/.test(p);
}
export function wantsTechData(input:string){
  return /\b(binario|binary|neural|dados|tech[- ]data|drone|circuitos?|holograma|cyberpunk)\b/.test(normalize(input));
}
export function requestsValleyOfTheEnd(input:string){
  return /\b(vale do fim|valley of the end|hashirama|madara|estatuas)\b/.test(normalize(input));
}
export function canonicalMatchupLock(input:string){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return '';
  return [
    'CANONICAL MATCHUP MASTER LOCK: Naruto/Kurama versus Sasuke/Perfect Susanoo. Render a premium anime battle key visual with a wide readable left-vs-right composition, strong silhouette separation and one clear central clash.',
    'LEFT: Naruto Uzumaki is visibly associated with a gigantic complete golden-orange Kurama chakra fox avatar. Kurama must read as a fox/beast with a clear draconic-NOT-allowed fox head, powerful torso, canonical black chakra markings and nine distinct tails, all individually readable and flowing. Keep Naruto recognizable and separate from Kurama rather than turning Kurama into a humanoid Naruto clone.',
    'RIGHT: Sasuke Uchiha is visibly associated with a gigantic complete violet Perfect Susanoo. Susanoo must be a full armored winged humanoid chakra avatar with recognizable helmet/face structure, broad armor plates, BOTH wings visible when framing permits and a luminous sword. Never reduce it to purple smoke, a generic demon, mecha or cropped torso.',
    'CENTER: one controlled energy collision between the two sides. The clash is a focal connector, not the subject itself: it must occupy a minority of the frame and may not obscure Kurama, Naruto, Sasuke or Susanoo.',
    'DEPTH: foreground debris/terrain, full combatants in the midground, environment/background behind them. Avoid thumbnail-like close crops, duplicated characters, random third fighters and unreadable energy clutter.',
    'COLOR DISCIPLINE: Naruto/Kurama side is gold/orange/fire; Sasuke/Susanoo side is violet/purple/electric blue. Preserve clean color ownership instead of mixing both palettes over every subject.',
    requestsValleyOfTheEnd(input)?'SETTING LOCK: Valley of the End, waterfall canyon, dramatic sky and the monumental Hashirama and Madara statues clearly readable behind the battle, without replacing the combatants.':''
  ].filter(Boolean).join('\n');
}
export const MATCHUP_NEGATIVES=[
  'generic anime explosion poster','two Narutos','duplicate Sasuke','missing Kurama','missing Perfect Susanoo',
  'abstract purple energy instead of Susanoo','fox only in the background','robotic armor unrelated to Susanoo',
  'dragon instead of Kurama','cropped giant avatar','only close-up faces','chaotic unreadable composition',
  'photorealistic live action','central explosion hiding both avatars','humanoid Kurama','Naruto clone used as Kurama',
  'Susanoo torso only','missing Susanoo wings','purple smoke instead of Susanoo','third random fighter',
  'mixed orange and purple palette on both sides','close-up crop hiding full avatars','energy effect larger than both combatants'
];
export function matchupReferenceQueries(input:string){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return [];
  return ['Naruto Kurama full chakra avatar reference','Sasuke Perfect Susanoo full body reference',
    ...(requestsValleyOfTheEnd(input)?['Valley of the End Hashirama Madara statues reference']:[])];
}
export type SemanticImageReview={status:'passed'|'failed'|'unavailable';issues:string[];retryPrompt:string};
const ISSUE_REPAIRS:Record<string,string>={
  'missing-kurama':'Show the complete golden nine-tailed Kurama avatar clearly on the left.',
  'missing-susanoo':'Show the complete purple armored winged Perfect Susanoo clearly on the right.',
  'low-character-readability':'Increase separation and readability of both full avatars.',
  'central-explosion':'Reduce the central explosion so it does not cover either avatar.',
  'missing-statues':'Show the Valley of the End waterfall canyon and both Hashirama and Madara statues.'
};
export function parseSemanticImageReview(value:unknown,originalPrompt:string):SemanticImageReview{
  const v=value as {issues?:unknown};
  if(!v||!Array.isArray(v.issues)||v.issues.some(x=>typeof x!=='string'||!(x in ISSUE_REPAIRS)))return {status:'unavailable',issues:[],retryPrompt:''};
  const issues=[...new Set(v.issues as string[])].filter(x=>x!=='missing-statues'||requestsValleyOfTheEnd(originalPrompt));
  return {status:issues.length?'failed':'passed',issues,retryPrompt:issues.map(x=>ISSUE_REPAIRS[x]).join(' ')};
}


export function recommendedMatchupAspect(input:string,current='1:1'){
  if(!isNarutoKuramaVsSasukeSusanooPrompt(input))return current;
  return current==='1:1'?'16:9':current;
}
