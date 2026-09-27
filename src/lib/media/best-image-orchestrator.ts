import { isAnimeFranchisePrompt, isSpecificFranchisePrompt, shouldForceLiteralMode, extractRequestedNamedSubject } from './media-fidelity';
import { isNarutoKuramaVsSasukeSusanooPrompt, wantsFullKuramaAvatar, wantsKuramaChakraMode } from './canonical-matchup';

export type CandidateSemanticStatus='passed'|'failed'|'unavailable'|''

export interface VisualSubjectSlot{
  id:string;
  label:string;
  role:'character'|'avatar'|'creature'|'object';
  form:string;
  palette:string[];
  mustShow:string[];
  reject:string[];
}

export interface BestImagePlan{
  version:1;
  identitySensitive:boolean;
  anime:boolean;
  candidateCount:number;
  identityKey:string;
  subjects:VisualSubjectSlot[];
  action:string;
  composition:string;
  style:string;
  promptContract:string;
}

const normalize=(value:string)=>String(value||'')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/\s+/g,' ')
  .trim();

function unique(values:string[]){
  return Array.from(new Set(values.map(x=>x.trim()).filter(Boolean)));
}

function knownSubjects(prompt:string):VisualSubjectSlot[]{
  const p=normalize(prompt);
  const slots:VisualSubjectSlot[]=[];
  const push=(slot:VisualSubjectSlot)=>{
    if(!slots.some(x=>x.id===slot.id))slots.push(slot);
  };

  if(/\bnaruto\b/.test(p)){
    const kuramaMode=wantsKuramaChakraMode(prompt)||/\b(kurama|kyuubi|kyubi|chakra mode|modo kurama)\b/.test(p);
    push({
      id:'naruto-uzumaki',label:'Naruto Uzumaki',role:'character',
      form:kuramaMode?'Kurama Chakra Mode':'requested Naruto form',
      palette:kuramaMode?['gold','orange','black accents']:['canonical Naruto palette'],
      mustShow:kuramaMode
        ? ['spiky blond hair','Naruto whisker cheek marks','recognizable Naruto face/silhouette','golden-orange chakra cloak/aura wrapped around Naruto body','requested Naruto costume/form cues']
        : ['spiky blond hair','Naruto whisker cheek marks','recognizable Naruto face/silhouette','requested Naruto costume/form cues'],
      reject:['red-haired Naruto','generic shonen hero','Goku','Vegeta','wrong franchise costume','Naruto duplicated as another subject']
    });
  }
  if(wantsFullKuramaAvatar(prompt)){
    push({
      id:'kurama-nine-tails',label:'Kurama / Nine-Tails',role:'creature',
      form:'complete nine-tailed fox / chakra avatar',
      palette:['gold','orange','black markings'],
      mustShow:['fox anatomy','recognizable Nine-Tails head/body','multiple distinct tails with full nine-tail readability when framing permits'],
      reject:['dragon','wolf','lion','humanoid Naruto clone','generic spirit beast']
    });
  }
  if(/\bsasuke\b/.test(p)){
    push({
      id:'sasuke-uchiha',label:'Sasuke Uchiha',role:'character',
      form:/\bsusanoo\b/.test(p)?'associated with requested Susanoo form':'requested Sasuke form',
      palette:['black','indigo','violet accents'],
      mustShow:['recognizable Sasuke/Uchiha face and hair','distinct identity from Naruto','requested costume/form cues'],
      reject:['generic black-haired ninja','Naruto clone','wrong franchise character']
    });
  }
  if(/\bsusanoo\b/.test(p)){
    push({
      id:'perfect-susanoo',label:'Perfect Susanoo',role:'avatar',
      form:/\b(perfeito|perfect|completo|complete)\b/.test(p)?'complete Perfect Susanoo':'requested Susanoo form',
      palette:['violet','purple','electric blue highlights'],
      mustShow:['large armored humanoid chakra avatar','complete readable silhouette','wings when Perfect Susanoo is requested','separate readable Sasuke identity'],
      reject:['purple smoke','generic robot','generic demon','cropped torso only','animal spirit']
    });
  }
  if(/\b(freeza|frieza)\b/.test(p)){
    push({
      id:'frieza',label:'Frieza',role:'character',
      form:'requested Frieza form',
      palette:['white','purple'],
      mustShow:['smooth mostly white alien bio-armor/body','purple dome/plates','recognizable Frieza face/silhouette'],
      reject:['Saiyan','orange gi','generic demon','dragon','armored human']
    });
  }
  if(/\bgoku\b/.test(p)&&!/\bson goku bijuu|four tails|quatro caudas\b/.test(p)){
    push({
      id:'son-goku-db',label:'Son Goku',role:'character',
      form:'requested Dragon Ball form',
      palette:['orange','blue'],
      mustShow:['recognizable Goku face/hair','requested gi/form cues'],
      reject:['Naruto','generic black-haired anime fighter','wrong franchise costume']
    });
  }
  if(/\bvegeta\b/.test(p)){
    push({
      id:'vegeta',label:'Vegeta',role:'character',
      form:'requested Vegeta form',
      palette:['blue','white','gold accents'],
      mustShow:['recognizable Vegeta widow-peak hairline','requested armor/form cues'],
      reject:['Goku face','generic Saiyan substitute']
    });
  }
  if(/\bpikachu\b/.test(p)){
    push({
      id:'pikachu',label:'Pikachu',role:'creature',
      form:'canonical Pikachu',
      palette:['yellow','red cheeks','black ear tips'],
      mustShow:['mouse-like Pokémon proportions','long ears with black tips','red cheeks','lightning-bolt tail when visible'],
      reject:['generic yellow rabbit','cat','wrong Pokémon']
    });
  }
  return slots;
}

function inferAction(prompt:string){
  const raw=String(prompt||'').replace(/\s+/g,' ').trim();
  const match=raw.match(/\b(lutando|enfrentando|batalhando|correndo|voando|segurando|comendo|abraçando|abracando|fighting|facing|running|flying|holding|eating|hugging)\b[^,.!?;]*/i);
  return match?.[0]?.trim()||'perform exactly the action/relationship explicitly requested by the user';
}

function inferComposition(prompt:string,subjectCount:number){
  const p=normalize(prompt);
  if(/\b(close[- ]?up|close|retrato|portrait)\b/.test(p))return 'close framing with identity-defining facial and costume cues unobstructed';
  if(/\b(poster|poster|pôster)\b/.test(p))return 'poster/key-visual hierarchy with clear subject separation and readable silhouettes';
  if(/\b(lutando|enfrentando|batalha|fight|battle|versus|vs\.?|contra)\b/.test(p)||subjectCount>1){
    return 'wide dynamic composition with distinct subject zones, readable full/three-quarter silhouettes, one controlled focal clash and no identity fusion';
  }
  return 'strong single focal hierarchy, readable silhouette, uncluttered subject separation and camera chosen to show requested defining attributes';
}

export function visualIdentityKey(prompt:string){
  const slots=knownSubjects(prompt);
  if(slots.length)return slots.map(x=>x.id+':'+normalize(x.form)).sort().join('|');
  const named=extractRequestedNamedSubject(String(prompt||''));
  return named?'named:'+normalize(named):'';
}

export function candidateCountForImage(prompt:string){
  if(isAnimeFranchisePrompt(prompt)&&shouldForceLiteralMode(prompt))return 3;
  if(shouldForceLiteralMode(prompt)||isSpecificFranchisePrompt(prompt))return 2;
  return 1;
}

export function buildBestImagePlan(prompt:string,style='Cinematic'):BestImagePlan{
  const subjects=knownSubjects(prompt);
  const identitySensitive=shouldForceLiteralMode(prompt);
  const anime=isAnimeFranchisePrompt(prompt);
  const identityKey=visualIdentityKey(prompt);
  const action=inferAction(prompt);
  const composition=inferComposition(prompt,subjects.length);
  const candidateCount=candidateCountForImage(prompt);
  const subjectLines=subjects.length
    ? subjects.flatMap((slot,index)=>[
        'SUBJECT['+(index+1)+'] '+slot.label+' · role='+slot.role+' · form='+slot.form,
        '  MUST SHOW: '+slot.mustShow.join('; '),
        '  COLOR/FORM OWNERSHIP: '+slot.palette.join(', '),
        '  REJECT SUBSTITUTIONS: '+slot.reject.join('; ')
      ])
    : ['SUBJECT LOCK: preserve the exact named/specific subject, count, form, costume/materials, silhouette and user-requested attributes.'];

  const matchup=isNarutoKuramaVsSasukeSusanooPrompt(prompt)
    ? [
        'MATCHUP RELATIONSHIP: Naruto in the requested Kurama form and Sasuke/Perfect Susanoo are two distinct sides. Never merge them.',
        wantsFullKuramaAvatar(prompt)
          ? 'Kurama is a separate fox/Nine-Tails avatar because the user explicitly requested the full avatar; Perfect Susanoo remains a complete armored humanoid chakra avatar.'
          : 'Kurama is a chakra MODE on Naruto for this request: keep the golden chakra cloak on Naruto himself and do not invent a separate giant fox/dragon. Perfect Susanoo remains a complete armored humanoid chakra avatar.',
        'Gold/orange belongs to Naruto/Kurama mode; violet/purple belongs to Sasuke/Susanoo. Keep ownership readable.'
      ]
    : [];

  const promptContract=[
    'PREDICTLM BEST-IMAGE CONTRACT v1:',
    'ORIGINAL USER INTENT: '+String(prompt||'').trim(),
    'STYLE TARGET: '+style,
    'ACTION LOCK: '+action,
    'COMPOSITION: '+composition,
    ...subjectLines,
    ...matchup,
    'REFERENCE POLICY: user-uploaded references outrank approved identity-memory references; both outrank searched/catalog references; references control identity/form, not copied composition.',
    'GENERATION POLICY: obey subject count and forms before aesthetic embellishment. Do not invent extra protagonists or substitute generic lookalikes.',
    'QUALITY POLICY: clean anatomy/geometry, coherent perspective, readable faces/silhouettes, controlled effects, intentional lighting, crisp focal detail, no accidental text/watermarks.',
    'REVIEW POLICY: generated pixels must be independently checked against the ORIGINAL USER INTENT; prompt similarity is not evidence of visual fidelity.'
  ].join('\n');

  return {version:1,identitySensitive,anime,candidateCount,identityKey,subjects,action,composition,style,promptContract};
}

export function candidateVariationDirective(index:number,total:number){
  const variants=[
    'Candidate A: prioritize canonical identity readability, clear silhouettes and balanced composition.',
    'Candidate B: use a more dynamic camera angle and stronger motion while preserving every identity/form lock.',
    'Candidate C: use a premium poster/key-visual composition with dramatic depth and controlled effects; never sacrifice identity readability.'
  ];
  if(total<=1)return '';
  return variants[Math.max(0,index)%variants.length]+' This is candidate '+(index+1)+' of '+total+'.';
}

export interface ImageCandidateScoreInput{
  semanticStatus:CandidateSemanticStatus;
  technicalScore?:number|null;
  referencesPassed?:number;
  fidelityLimited?:boolean;
  issues?:string[];
}

export function scoreImageCandidate(input:ImageCandidateScoreInput){
  const technical=Math.max(0,Math.min(100,Number(input.technicalScore)||0));
  let score=technical*.30;
  if(input.semanticStatus==='passed')score+=55;
  else if(input.semanticStatus==='failed')score-=35;
  else score+=5;
  score+=Math.min(10,Math.max(0,Number(input.referencesPassed)||0)*3);
  if(input.fidelityLimited)score-=8;
  score-=Math.min(12,(input.issues?.length||0)*3);
  return Math.max(0,Math.min(100,Math.round(score)));
}

export function bestCandidateIndex<T extends ImageCandidateScoreInput>(candidates:T[]){
  if(!candidates.length)return -1;
  let best=0;
  let bestScore=scoreImageCandidate(candidates[0]);
  for(let i=1;i<candidates.length;i++){
    const score=scoreImageCandidate(candidates[i]);
    if(score>bestScore){best=i;bestScore=score}
  }
  return best;
}

export function buildTargetedEditRepair(input:{
  prompt:string;
  issues?:string[];
  technicalHints?:string[];
  subjectLabels?:string[];
}){
  const issues=unique(input.issues||[]);
  const technical=unique(input.technicalHints||[]);
  const subjects=unique(input.subjectLabels||[]);
  return [
    'EDIT/REPAIR THE CURRENT BEST CANDIDATE — do not restart the scene unless absolutely necessary.',
    'ORIGINAL REQUEST: '+input.prompt,
    subjects.length?'LOCK CORRECT IDENTITIES: '+subjects.join(', '):'',
    issues.length?'FIX ONLY THESE VISIBLE SEMANTIC ERRORS: '+issues.join('; '):'',
    technical.length?'TECHNICAL FIXES: '+technical.join('; '):'',
    'Preserve every region/identity/pose/composition element that is already correct.',
    'Do not introduce new characters, change franchise, merge subjects or remove requested forms.',
    'After repair, the image must still satisfy the original request exactly.'
  ].filter(Boolean).join('\n');
}
