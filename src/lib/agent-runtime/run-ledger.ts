export type RunPhase='explore'|'architect'|'implement'|'review'|'repair'|'verify';

export interface AgentCheckpoint{
  id:string;
  phase:RunPhase;
  label:string;
  status:'done'|'warn'|'failed'|'skipped';
  summary:string;
  artifacts:string[];
}

export interface AgentRunLedger{
  version:1;
  runId:string;
  taskDigest:string;
  createdAt:string;
  checkpoints:AgentCheckpoint[];
  providers:string[];
  replay:{
    canReplay:boolean;
    requirements:string[];
  };
}

function stableHash(input:string){
  let h=2166136261;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function clean(value:any,max=260){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max)}

export function buildAgentRunLedger(input:{
  task:string;
  explorations?:Array<{provider:string;text:string}>;
  architecture?:any;
  files?:Array<{path:string}>;
  review?:any;
  repaired?:boolean;
  providers?:string[];
}):AgentRunLedger{
  const now=new Date().toISOString();
  const reviewIssues=Array.isArray(input.review?.issues)?input.review.issues:[];
  const missing=Array.isArray(input.review?.missingRequirements)?input.review.missingRequirements:[];
  const checkpoints:AgentCheckpoint[]=[
    {
      id:'cp-explore',phase:'explore',label:'Codebase discovery',
      status:input.explorations?.length?'done':'warn',
      summary:input.explorations?.length?input.explorations.map(x=>x.provider).join(', ')+' inspected the workspace.':'No independent explorer report was produced.',
      artifacts:(input.explorations||[]).map(x=>clean(x.text,120)).slice(0,3)
    },
    {
      id:'cp-architect',phase:'architect',label:'Architecture plan',
      status:input.architecture?'done':'warn',
      summary:clean((input.architecture?.plan||[]).join(' · ')||'Architecture inferred from current files.',300),
      artifacts:(input.architecture?.filesToChange||[]).map((x:any)=>String(x)).slice(0,12)
    },
    {
      id:'cp-implement',phase:'implement',label:'Implementation',
      status:input.files?.length?'done':'failed',
      summary:input.files?.length?input.files.length+' file(s) proposed.':'No changed files were produced.',
      artifacts:(input.files||[]).map(x=>x.path).slice(0,40)
    },
    {
      id:'cp-review',phase:'review',label:'Independent review',
      status:input.review?.approved===false||reviewIssues.some((x:any)=>/blocker|critical|high/i.test(String(x?.severity||'')))?'warn':'done',
      summary:reviewIssues.length?reviewIssues.length+' issue(s) reviewed.':'No blocking review issue reported.',
      artifacts:reviewIssues.map((x:any)=>clean((x.file?x.file+': ':'')+(x.issue||''),180)).slice(0,8)
    },
    {
      id:'cp-repair',phase:'repair',label:'Repair pass',
      status:input.repaired?'done':'skipped',
      summary:input.repaired?'Validated issues were repaired in a final pass.':'Repair was not required or did not produce a replacement.',
      artifacts:[]
    },
    {
      id:'cp-verify',phase:'verify',label:'Verification contract',
      status:missing.length?'warn':'done',
      summary:missing.length?'Outstanding acceptance items remain.':'Requirement coverage and regression review completed.',
      artifacts:missing.map((x:any)=>clean(x,180)).slice(0,8)
    }
  ];
  return {
    version:1,
    runId:'run_'+stableHash(input.task+'|'+now),
    taskDigest:clean(input.task,220),
    createdAt:now,
    checkpoints,
    providers:Array.from(new Set((input.providers||[]).filter(Boolean))),
    replay:{
      canReplay:true,
      requirements:[
        'same task prompt',
        'same relevant workspace snapshot',
        'same project instructions',
        'provider/model availability may change output'
      ]
    }
  };
}
