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
    'CANONICAL MATCHUP: Naruto with Kurama versus Sasuke with Perfect Susanoo. Use a wide, readable two-sided anime composition unless the user explicitly requests different framing.',
    'LEFT: Naruto linked to the complete golden-orange nine-tailed Kurama chakra fox avatar, visible fox head, body, nine distinct tails and canonical black chakra markings. Show the full avatar; do not reduce Kurama to a background fox or abstract aura.',
    'RIGHT: Sasuke linked to the complete purple/violet Perfect Susanoo, a giant armored winged humanoid chakra avatar with a glowing sword. Show the full body and wings, never generic purple energy, a robot or unrelated demon.',
    'Separate both silhouettes clearly. Keep Naruto and Sasuke distinct and associated with their respective avatars. A controlled central clash may connect them, but must not hide the bodies, fuse the opponents or dominate the frame.',
    requestsValleyOfTheEnd(input)?'SETTING: Valley of the End, waterfall canyon and the two monumental cliff statues of Hashirama and Madara visible behind the combatants.':''
  ].filter(Boolean).join('\n');
}
export const MATCHUP_NEGATIVES=[
  'generic anime explosion poster','two Narutos','duplicate Sasuke','missing Kurama','missing Perfect Susanoo',
  'abstract purple energy instead of Susanoo','fox only in the background','robotic armor unrelated to Susanoo',
  'dragon instead of Kurama','cropped giant avatar','only close-up faces','chaotic unreadable composition',
  'photorealistic live action','central explosion hiding both avatars'
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
