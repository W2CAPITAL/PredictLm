import { compactText } from '@/lib/token-budget';
import { skills } from '@/lib/skills';
import type { WorkspaceFile } from '@/lib/types';

export type AgenticSurface='chat'|'build'|'media'|'research'|'simulation';
export type AgenticRole=
  | 'explorer'
  | 'architect'
  | 'implementer'
  | 'researcher'
  | 'reviewer'
  | 'test-analyst'
  | 'security-reviewer'
  | 'visual-director'
  | 'identity-reviewer'
  | 'game-producer'
  | 'game-designer'
  | 'game-technical-director'
  | 'game-art-director'
  | 'gameplay-specialist'
  | 'playtest-reviewer'
  | 'verifier';

export interface AgenticPlan{
  surface:AgenticSurface;
  staged:boolean;
  roles:AgenticRole[];
  maxPasses:number;
  reason:string;
}

const STOP=new Set([
  'para','com','uma','uns','das','dos','que','isso','este','esta','the','and','for','with','from','into',
  'criar','fazer','melhorar','usar','use','quero','preciso','app','chat','build'
]);

function toks(value:string){
  return String(value||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu,'')
    .split(/[^a-z0-9]+/)
    .filter(x=>x.length>=3&&!STOP.has(x));
}

function overlapScore(query:string,text:string){
  const q=new Set(toks(query));
  if(!q.size)return 0;
  let score=0;
  for(const token of toks(text))if(q.has(token))score++;
  return score;
}

function surfaceBoost(surface:AgenticSurface,id:string){
  const boosts:Record<AgenticSurface,Record<string,number>>={
    chat:{
      'predictlm-master':30,'provider-mesh':24,'human-presence':18,'prompt-os':18,'capability-fusion':10,
      'research-source-matrix':8,'deep-research':8,'centum-parallax':7
    },
    build:{
      'predictlm-master':30,'agent-fabric':28,'capability-fusion':27,'saas-builder-fabric':24,'build-review':24,
      'testing':22,'vibe-security':20,'design-system':18,'impeccable':16,'node-stack':13,'token-budget':10,'continuous-learning':7
    },
    media:{
      'predictlm-master':26,'grok-imagine-parity':30,'visual-reference-grounding':28,'capability-fusion':24,
      'media-director-deep':26,'image-skill':22,'media-pipelines':18,'research-source-matrix':10
    },
    research:{
      'predictlm-master':24,'research-source-matrix':30,'deep-research':28,'web-reach':26,'capability-fusion':24,
      'research-engine':22,'github-knowledge':12,'provider-mesh':10
    },
    simulation:{
      'predictlm-master':28,'game-studio-fabric':34,'mirofish-simulation':33,'capability-fusion':30,'neurocore':27,
      'life-simulation':30,'digital-brain':24,'agent-fabric':20,'centum-parallax':10
    }
  };
  return boosts[surface][id]||0;
}

export function selectSkillContracts(prompt:string,surface:AgenticSurface,limit=8){
  const ranked=skills.map(skill=>{
    const hay=[skill.id,skill.name,skill.category,skill.description,skill.source].join(' ');
    const lexical=overlapScore(prompt,hay);
    const boost=surfaceBoost(surface,skill.id);
    return {skill,score:boost+lexical*4};
  }).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||a.skill.id.localeCompare(b.skill.id))
    .slice(0,Math.max(1,limit));

  return ranked.map(({skill})=>({
    id:skill.id,
    name:skill.name,
    contract:compactText(skill.description,220)
  }));
}

export function skillContractContext(prompt:string,surface:AgenticSurface,limit=8){
  const selected=selectSkillContracts(prompt,surface,limit);
  return [
    'DEFERRED SKILL DISCOVERY: only these contracts are relevant for this task.',
    ...selected.map(x=>'SKILL '+x.id+' — '+x.contract)
  ].join('\n');
}

function complexitySignals(prompt:string){
  const q=String(prompt||'').toLowerCase();
  let score=0;
  if(prompt.length>700)score+=2;
  else if(prompt.length>300)score+=1;
  if(/\b(integr|arquitet|migration|refator|security|seguran|auth|database|banco|api|deploy|multi.?tenant|offline|sync)\b/.test(q))score+=2;
  if(/\b(compare|compar|pesquis|fontes|evid[eê]ncia|atual|recent|documenta[cç][aã]o)\b/.test(q))score+=1;
  if(/\b(imagem|image|video|vídeo|personagem|character|identidade|reference|refer[eê]ncia)\b/.test(q))score+=1;
  if(/\b(test|teste|e2e|qa|review|revis|bug|erro|falha)\b/.test(q))score+=1;
  return score;
}

export function planAgenticRun(prompt:string,surface:AgenticSurface,deep=false):AgenticPlan{
  const score=complexitySignals(prompt)+(deep?2:0);
  const staged=surface==='build'||surface==='media'||surface==='simulation'||deep||score>=3;
  let roles:AgenticRole[];
  if(surface==='build'){
    roles=['explorer','architect','implementer','reviewer','test-analyst','security-reviewer','verifier'];
  }else if(surface==='simulation'){
    roles=[
      'game-producer',
      'game-designer',
      'game-technical-director',
      'game-art-director',
      'gameplay-specialist',
      'playtest-reviewer',
      'verifier'
    ];
  }else if(surface==='media'){
    roles=['researcher','visual-director','identity-reviewer','reviewer','verifier'];
  }else if(surface==='research'){
    roles=['researcher','reviewer','verifier'];
  }else{
    roles=staged?['researcher','reviewer','verifier']:['verifier'];
  }
  return {
    surface,
    staged,
    roles,
    maxPasses:staged?(deep?4:3):1,
    reason:staged?'task benefits from staged explore/execute/review':'simple turn should stay direct'
  };
}

function pathDir(path:string){
  const clean=path.replace(/\\/g,'/').replace(/^\.\//,'');
  const idx=clean.lastIndexOf('/');
  return idx<0?'':clean.slice(0,idx);
}

function isInstructionFile(path:string){
  const clean=path.replace(/\\/g,'/').toLowerCase();
  return clean==='agents.md'
    || clean==='claude.md'
    || clean.endsWith('/agents.md')
    || clean.endsWith('/claude.md')
    || clean.endsWith('/predict.instructions.md')
    || clean==='.predict/instructions.md';
}

function scopeDistance(instructionPath:string,targetPath:string){
  const dir=pathDir(instructionPath).replace(/^\.claude$/,'');
  if(!dir)return 0;
  const target=targetPath.replace(/\\/g,'/');
  return target.startsWith(dir+'/')?dir.split('/').length:-1;
}

export function projectInstructionContext(files:WorkspaceFile[],targetPaths:string[]=[]){
  const instructionFiles=files
    .filter(file=>isInstructionFile(file.path)&&String(file.content||'').trim())
    .map(file=>({path:file.path,content:compactText(file.content,900)}));

  if(!instructionFiles.length)return '';

  const selected=instructionFiles.filter(file=>{
    if(!targetPaths.length)return pathDir(file.path)===''||file.path.startsWith('.claude/')||file.path.startsWith('.predict/');
    return targetPaths.some(target=>scopeDistance(file.path,target)>=0);
  }).sort((a,b)=>{
    const da=pathDir(a.path).split('/').filter(Boolean).length;
    const db=pathDir(b.path).split('/').filter(Boolean).length;
    return da-db||a.path.localeCompare(b.path);
  }).slice(0,8);

  if(!selected.length)return '';
  return [
    'PROJECT INSTRUCTIONS (workspace-owned; later/more specific files override broader guidance only inside their directory):',
    ...selected.map(file=>'FILE '+file.path+'\n'+file.content)
  ].join('\n\n');
}

export function compactWorkspaceManifest(files:WorkspaceFile[],maxFiles=80){
  return files.slice(0,maxFiles).map(file=>{
    const lines=String(file.content||'').split(/\r?\n/).length;
    return file.path+' · '+lines+' lines · '+String(file.language||'text');
  }).join('\n');
}

export function buildReviewContract(surface:AgenticSurface){
  if(surface==='build')return [
    'Review only the proposed changes, not unrelated pre-existing code.',
    'Validate each reported defect before treating it as blocking.',
    'Check requirement coverage, regressions, type/runtime errors, error states, security boundaries, tests and mobile UX.',
    'For player-visible or highly interactive changes, a successful compile/parse is not visual verification; require run-and-observe evidence when the host can render the surface, otherwise mark that verification gap explicitly.',
    'Prefer a few high-confidence defects over speculative findings.'
  ].join(' ');
  if(surface==='simulation')return [
    'Review world-state consistency, action feasibility, persistent memory, agent autonomy boundaries and whether the requested scenario changed the simulated world rather than only the narration.',
    'Treat the simulation as a persistent interactive world: local perception and deterministic state transitions outrank free-form storytelling.',
    'For visible world/UI changes, render/observe when possible; otherwise mark the visual result as not verified.',
    'Playtest findings are evidence about the simulated experience, not factual predictions about real people.'
  ].join(' ');
  if(surface==='media')return [
    'Review semantic fidelity separately from technical image quality.',
    'Check named-subject identity, count, action, composition, canonical attributes, exclusions and reference adherence.',
    'Do not claim identity passed when no semantic evidence is available.'
  ].join(' ');
  return [
    'Review factual/intent alignment, unsupported claims, missing constraints and whether the answer actually resolves the request.',
    'Reject confident but weakly grounded claims.'
  ].join(' ');
}
