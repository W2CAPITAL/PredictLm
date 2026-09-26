import { predictLMMasterContext } from '@/lib/predictlm-master';
import {
  buildReviewContract,
  compactWorkspaceManifest,
  planAgenticRun,
  projectInstructionContext,
  skillContractContext
} from '@/lib/agent-runtime/agentic-fabric';
import { callProviderText, parseJsonObject, rankProviders, type ProviderMessage, type ProviderSpec } from '@/lib/server/provider-mesh';
import { compactText } from '@/lib/token-budget';
import { capabilityFusionContext } from '@/lib/fusion/capability-fabric';
import { gameStudioContext } from '@/lib/game-studio-fabric';
import { buildAgentRunLedger } from '@/lib/agent-runtime/run-ledger';
import type { WorkspaceFile } from '@/lib/types';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type BuildPayload={
  explanation:string;
  plan:string[];
  files:WorkspaceFile[];
};

type BuildReview={
  approved?:boolean;
  confidence?:number;
  issues?:Array<{severity?:string;file?:string;issue?:string;fix?:string}>;
  missingRequirements?:string[];
};

const BUILD_SYSTEM=[
  'You are the Build execution surface of PredictLM.',
  'Return only valid JSON: {"explanation":"...","plan":["..."],"files":[{"path":"...","content":"...","language":"..."}]}.',
  'The remote API is the primary implementer. Skills and agents are server-selected context, not user-visible personalities.',
  'Preserve an existing project unless the user explicitly asks for a new project/from scratch.',
  'Inspect the current architecture before changing it. Reuse existing patterns and dependencies when they are sound.',
  'Build complete, responsive, maintainable behavior rather than demos or placeholders.',
  'Never expose or place secrets in client code.',
  'Do not invent a connected integration. If credentials or a handshake are missing, implement the adapter/config boundary and state the limitation in explanation.',
  'For complex business apps include real navigation, domain validation, loading/empty/error/success states, persistence boundary, integration adapters and tests.',
  'Only return files that should actually be changed or created.',
  'Never output private chain-of-thought. Structured summaries, plans and verified findings are allowed.'
].join('\n');

function normalizeFiles(input:any):WorkspaceFile[]{
  if(!Array.isArray(input))return [];
  const seen=new Set<string>();
  const out:WorkspaceFile[]=[];
  for(const raw of input){
    const path=String(raw?.path||'').replace(/\\/g,'/').replace(/^\.\//,'').trim();
    if(!path||path.startsWith('/')||path.includes('../')||seen.has(path))continue;
    const content=String(raw?.content||'');
    if(content.length>120000)continue;
    seen.add(path);
    out.push({path,content,language:String(raw?.language||'text')});
    if(out.length>=120)break;
  }
  return out;
}

function validateBuildPayload(raw:any):BuildPayload|null{
  if(!raw||typeof raw!=='object')return null;
  const files=normalizeFiles(raw.files).slice(0,45);
  const explanation=compactText(String(raw.explanation||'').trim(),900);
  const plan=(Array.isArray(raw.plan)?raw.plan:[])
    .map((x:any)=>compactText(String(x||'').trim(),180))
    .filter(Boolean)
    .slice(0,16);
  if(!files.length)return null;
  return {
    explanation:explanation||'Implementação produzida pelo provider e validada pelo pipeline do Build.',
    plan:plan.length?plan:['Implementar a solicitação preservando a arquitetura atual.','Validar comportamento, segurança, testes e responsividade.'],
    files
  };
}

async function callWithFallback(
  providers:ProviderSpec[],
  messages:ProviderMessage[],
  options:{deep?:boolean;timeoutMs?:number;maxTokens?:number;temperature?:number;startAt?:number}={}
){
  const errors:string[]=[];
  if(!providers.length)throw new Error('Nenhum provider server-side configurado.');
  const start=Math.max(0,options.startAt||0)%providers.length;
  for(let offset=0;offset<Math.min(3,providers.length);offset++){
    const provider=providers[(start+offset)%providers.length];
    try{
      const text=await callProviderText(provider,messages,{
        deep:options.deep,
        timeoutMs:options.timeoutMs,
        maxTokens:options.maxTokens,
        temperature:options.temperature
      });
      return {text,provider};
    }catch(error:any){
      errors.push(provider.name+': '+String(error?.message||error).slice(0,220));
    }
  }
  throw new Error(errors.join(' | ')||'Provider unavailable');
}

function pickRelevantFiles(files:WorkspaceFile[],requested:string[],task:string){
  const exact=new Set(requested.map(x=>String(x||'').replace(/\\/g,'/')));
  const rootPriority=/^(package\.json|tsconfig\.json|next\.config\.|vite\.config\.|src\/app\/layout\.|src\/app\/page\.|src\/App\.|README|AGENTS\.md|CLAUDE\.md)/i;
  const terms=task.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>=4);
  const scored=files.map(file=>{
    const p=file.path.toLowerCase();
    let score=exact.has(file.path)?100:0;
    if(rootPriority.test(file.path))score+=18;
    for(const t of terms)if(p.includes(t))score+=3;
    return {file,score};
  }).sort((a,b)=>b.score-a.score||a.file.path.localeCompare(b.file.path));
  const selected=scored.filter(x=>x.score>0).slice(0,22).map(x=>x.file);
  return selected.length?selected:files.slice(0,18);
}

function compactFilePayload(files:WorkspaceFile[]){
  return files.map(file=>({
    path:file.path,
    language:file.language,
    content:compactText(file.content,2600)
  }));
}

function reviewNeedsRepair(review:BuildReview|null){
  if(!review)return false;
  if(review.approved===false)return true;
  return (review.issues||[]).some(issue=>/^(blocker|critical|high)$/i.test(String(issue.severity||'')));
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const task=String(body?.prompt||'').trim();
    if(!task)return Response.json({error:'prompt is required'},{status:400});

    const files=normalizeFiles(body?.files);
    const mode=String(body?.mode||'deep');
    const deep=mode!=='fast';
    const providers=rankProviders('software build code architecture '+task,deep);
    if(!providers.length){
      return Response.json({error:'Nenhum provider server-side configurado para o Build.',code:'NO_PROVIDER'},{status:503});
    }

    const runPlan=planAgenticRun(task,'build',deep);
    const skillContext=skillContractContext(task,'build',10);
    const projectInstructions=projectInstructionContext(files);
    const manifest=compactWorkspaceManifest(files);
    const master=predictLMMasterContext(task,deep);
    const fusion=capabilityFusionContext(task,'build');
    const gameStudio=gameStudioContext(task);

    const explorerSystem=[
      'You are a codebase explorer. Inspect before proposing changes.',
      'Return concise JSON only: {"summary":"...","keyFiles":["..."],"patterns":["..."],"constraints":["..."],"risks":["..."],"acceptance":["..."]}.',
      'Do not implement yet. Do not reveal private reasoning.',
      projectInstructions,
      skillContext,
      fusion,
      gameStudio
    ].filter(Boolean).join('\n\n');

    const explorerUser=[
      'TASK:\n'+task,
      'WORKSPACE MANIFEST:\n'+manifest
    ].join('\n\n');

    const explorerProviders=providers.slice(0,Math.min(2,providers.length));
    const explorerResults=await Promise.allSettled(explorerProviders.map((_,index)=>
      callWithFallback(providers,[
        {role:'system',content:explorerSystem},
        {role:'user',content:explorerUser}
      ],{deep:false,timeoutMs:8500,maxTokens:900,temperature:0.15,startAt:index})
    ));
    const explorations=explorerResults
      .filter((x):x is PromiseFulfilledResult<{text:string;provider:ProviderSpec}>=>x.status==='fulfilled')
      .map(x=>({provider:x.value.provider.name,text:compactText(x.value.text,1200)}));

    const architectSystem=[
      'You are the architecture/planning agent for an existing codebase.',
      'Return JSON only: {"plan":["..."],"filesToChange":["..."],"tests":["..."],"risks":["..."],"acceptance":["..."]}.',
      'Reconcile explorer reports. Prefer existing project patterns. Keep the plan executable and scoped.',
      'Do not output chain-of-thought.',
      projectInstructions,
      skillContext,
      fusion,
      gameStudio
    ].filter(Boolean).join('\n\n');
    const architect=await callWithFallback(providers,[
      {role:'system',content:architectSystem},
      {role:'user',content:[
        'TASK:\n'+task,
        'EXPLORER REPORTS:\n'+(explorations.map(x=>'['+x.provider+'] '+x.text).join('\n\n')||'No explorer report available; infer conservatively from manifest.'),
        'WORKSPACE MANIFEST:\n'+manifest
      ].join('\n\n')}
    ],{deep,timeoutMs:10000,maxTokens:1200,temperature:0.12,startAt:0});

    const architecture=parseJsonObject<any>(architect.text)||{
      plan:['Preserve the current architecture','Implement the requested behavior','Validate changed files'],
      filesToChange:[],
      tests:[]
    };
    const filesToChange=(Array.isArray(architecture?.filesToChange)?architecture.filesToChange:[]).map((x:any)=>String(x));
    const relevant=pickRelevantFiles(files,filesToChange,task);

    const implementerSystem=[
      BUILD_SYSTEM,
      master,
      skillContext,
      projectInstructions,
      fusion,
      gameStudio,
      'AGENTIC RUN: '+runPlan.roles.join(' → ')+'.',
      'ARCHITECT PLAN:\n'+compactText(JSON.stringify(architecture),1800)
    ].filter(Boolean).join('\n\n');

    const implementation=await callWithFallback(providers,[
      {role:'system',content:implementerSystem},
      {role:'user',content:[
        'Mode: '+mode,
        'Task: '+task,
        'Relevant current files: '+JSON.stringify(compactFilePayload(relevant))
      ].join('\n\n')}
    ],{deep,timeoutMs:18000,maxTokens:deep?5200:3600,temperature:0.18,startAt:0});

    let payload=validateBuildPayload(parseJsonObject(implementation.text));
    if(!payload)throw new Error('Provider returned invalid structured build output');

    const reviewerSystem=[
      'You are an independent changed-code reviewer.',
      buildReviewContract('build'),
      'Return JSON only: {"approved":true,"confidence":0,"issues":[{"severity":"blocker|high|medium|low","file":"...","issue":"...","fix":"..."}],"missingRequirements":["..."]}.',
      'Do not redesign the whole product. Validate findings before reporting them. No chain-of-thought.',
      projectInstructions,
      fusion,
      gameStudio
    ].filter(Boolean).join('\n\n');

    const reviewCall=await callWithFallback(providers,[
      {role:'system',content:reviewerSystem},
      {role:'user',content:[
        'ORIGINAL TASK:\n'+task,
        'ARCHITECT PLAN:\n'+compactText(JSON.stringify(architecture),1500),
        'PROPOSED CHANGES:\n'+compactText(JSON.stringify(payload),5200)
      ].join('\n\n')}
    ],{deep:false,timeoutMs:9000,maxTokens:1300,temperature:0.05,startAt:providers.length>1?1:0});

    const review=parseJsonObject<BuildReview>(reviewCall.text);
    let repairProvider:string|null=null;
    if(reviewNeedsRepair(review)){
      const repairSystem=[
        BUILD_SYSTEM,
        master,
        skillContext,
        projectInstructions,
        fusion,
        gameStudio,
        'You are the repair/finalizer. Fix only validated review findings and missing requirements.',
        'Return the full corrected BuildPayload JSON. Do not explain the review process.'
      ].filter(Boolean).join('\n\n');

      const repaired=await callWithFallback(providers,[
        {role:'system',content:repairSystem},
        {role:'user',content:[
          'TASK:\n'+task,
          'ARCHITECT PLAN:\n'+compactText(JSON.stringify(architecture),1300),
          'CURRENT CANDIDATE:\n'+compactText(JSON.stringify(payload),5200),
          'VALIDATED REVIEW:\n'+compactText(JSON.stringify(review),2200),
          'RELEVANT ORIGINAL FILES:\n'+compactText(JSON.stringify(compactFilePayload(relevant)),5200)
        ].join('\n\n')}
      ],{deep,timeoutMs:17000,maxTokens:deep?5200:3600,temperature:0.12,startAt:providers.length>2?2:0});
      const fixed=validateBuildPayload(parseJsonObject(repaired.text));
      if(fixed){
        payload=fixed;
        repairProvider=repaired.provider.name;
      }
    }

    const plan=[
      ...(payload.plan||[]),
      'VERIFY · independent API review '+(review?.approved===false?'requested repair':'completed'),
      ...(review?.missingRequirements?.length?['CHECK · '+review.missingRequirements.slice(0,3).join(' · ')]:[])
    ].slice(0,20);

    const runLedger=buildAgentRunLedger({
      task,
      explorations,
      architecture,
      files:payload.files,
      review,
      repaired:!!repairProvider,
      providers:[
        ...explorations.map(x=>x.provider),
        architect.provider.name,
        implementation.provider.name,
        reviewCall.provider.name,
        ...(repairProvider?[repairProvider]:[])
      ]
    });

    return Response.json({
      ...payload,
      plan,
      runLedger,
      agentic:{
        mode:runPlan.staged?'staged':'direct',
        roles:runPlan.roles,
        skills:skillContractContext(task,'build',10).split('\n').slice(1).map(x=>x.split(' — ')[0].replace('SKILL ','')),
        providers:{
          explorers:explorations.map(x=>x.provider),
          architect:architect.provider.name,
          implementer:implementation.provider.name,
          reviewer:reviewCall.provider.name,
          repair:repairProvider
        },
        review:{
          approved:review?.approved??null,
          confidence:Number(review?.confidence||0),
          issues:(review?.issues||[]).slice(0,8),
          missingRequirements:(review?.missingRequirements||[]).slice(0,8)
        }
      }
    },{headers:{'Cache-Control':'no-store'}});
  }catch(err:any){
    return Response.json({error:err?.message||'Agent route failed'},{status:500,headers:{'Cache-Control':'no-store'}});
  }
}
