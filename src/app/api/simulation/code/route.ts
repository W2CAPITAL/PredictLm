import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const ALLOWED=[
  'src/lib/cognitive/frank-core.ts',
  'src/lib/cognitive/frank-emotion.ts',
  'src/lib/cognitive/frank-hippocampus.ts',
  'src/lib/cognitive/frank-neurons.ts',
  'src/lib/cognitive/cognitive-workspace.ts',
  'src/lib/cognitive/fly-core.ts',
  'src/lib/cognitive/fly-simulation.ts',
  'src/lib/life-simulation-agent.ts',
  'src/lib/life-agent-mind.ts',
  'src/lib/life-world-open.ts',
  'src/lib/life-simulation-engine.ts'
];

function safePath(value:any){
  const p=String(value||'').replace(/\\/g,'/').replace(/^\/+/, '');
  return ALLOWED.includes(p)?p:'';
}

export async function GET(req:Request){
  const url=new URL(req.url);
  const requested=safePath(url.searchParams.get('path'));
  const path=requested||ALLOWED[Math.abs(Number(url.searchParams.get('pick')||0))%ALLOWED.length];
  try{
    const api='https://api.github.com/repos/W2CAPITAL/PredictLm/contents/'+path+'?ref=main';
    const r=await fetch(api,{
      headers:{
        Accept:'application/vnd.github+json',
        'User-Agent':'PredictLM-Frank-Simulation'
      },
      cache:'no-store',
      signal:AbortSignal.timeout(12000)
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)return NextResponse.json({error:'Código indisponível.',path},{status:502});
    const encoded=String(data?.content||'').replace(/\s+/g,'');
    const decoded=encoded?Buffer.from(encoded,'base64').toString('utf8'):'';
    if(!decoded)return NextResponse.json({error:'Arquivo vazio ou não textual.',path},{status:404});
    const text=decoded.slice(0,14000);
    const symbols=Array.from(text.matchAll(/(?:export\s+)?(?:function|class|interface|type|const)\s+([A-Za-z0-9_]+)/g))
      .map(x=>x[1]).filter(Boolean).slice(0,40);
    return NextResponse.json({
      repository:'W2CAPITAL/PredictLm',
      path,
      sha:String(data?.sha||''),
      symbols,
      excerpt:text,
      truncated:decoded.length>text.length
    });
  }catch{
    return NextResponse.json({error:'Falha ao inspecionar o próprio código.',path},{status:500});
  }
}

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const path=safePath(body?.path);
  const pick=Math.max(0,Number(body?.pick)||0);
  const url=new URL(req.url);
  if(path)url.searchParams.set('path',path);
  else url.searchParams.set('pick',String(pick));
  return GET(new Request(url.toString()));
}
