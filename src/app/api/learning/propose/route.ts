import { isGlobalLearningInstruction, sanitizeGlobalInstruction } from '@/lib/global-learning';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const raw=String(body?.instruction||body?.prompt||'').trim();
    if(!raw||!isGlobalLearningInstruction(raw)){
      return Response.json({queued:false,reason:'not-global-instruction'});
    }

    const instruction=sanitizeGlobalInstruction(raw);
    if(instruction.length<12)return Response.json({queued:false,reason:'too-short'});

    const token=String(process.env.PREDICTLM_GLOBAL_LEARNING_GITHUB_TOKEN||'').trim();
    const target=String(process.env.PREDICTLM_GLOBAL_LEARNING_REPO||'W2CAPITAL/PredictLm').trim();
    if(!token)return Response.json({queued:false,reason:'github-token-not-configured'});

    const title='[Learning Proposal] '+instruction.slice(0,90);
    const issueBody=[
      '<!-- predictlm-learning:start -->',
      'Lesson: '+instruction,
      'Surface: '+String(body?.surface||'chat').slice(0,40),
      'Policy: proposal-only; requires learning-approved label before global compilation.',
      '<!-- predictlm-learning:end -->'
    ].join('\n');

    const r=await fetch('https://api.github.com/repos/'+target+'/issues',{
      method:'POST',
      headers:{
        Accept:'application/vnd.github+json',
        Authorization:'Bearer '+token,
        'X-GitHub-Api-Version':'2022-11-28',
        'Content-Type':'application/json'
      },
      body:JSON.stringify({title,body:issueBody})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(String(data?.message||'GitHub '+r.status));
    return Response.json({queued:true,issue:Number(data?.number)||null,url:String(data?.html_url||'')});
  }catch(error:any){
    return Response.json({queued:false,error:String(error?.message||'Falha ao criar proposta de aprendizado.')},{status:502});
  }
}
