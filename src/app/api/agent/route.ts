export const runtime = 'nodejs';

const SYSTEM = `You are PredictLM Studio. Return only JSON: {"explanation":"...","plan":["..."],"files":[{"path":"...","content":"...","language":"..."}]}. Build complete, responsive, maintainable apps. Never expose secrets.`;

export async function POST(req:Request){
  try{
    const {prompt,files,mode}=await req.json();
    const base=process.env.AI_BASE_URL;
    const key=process.env.AI_API_KEY;
    const model=process.env.AI_MODEL;
    if(!base||!key||!model)return Response.json({error:'Server provider não configurado. Defina AI_BASE_URL, AI_API_KEY e AI_MODEL no Vercel.'},{status:503});
    const url=`${String(base).replace(/\/$/,'')}/chat/completions`;
    const upstream=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model,temperature:0.25,messages:[{role:'system',content:SYSTEM},{role:'user',content:`Mode: ${mode}\nTask: ${prompt}\nFiles: ${JSON.stringify((files||[]).slice(0,15).map((f:any)=>({path:f.path,content:String(f.content||'').slice(0,9000)})))}`}]})});
    if(!upstream.ok)return Response.json({error:`Provider error ${upstream.status}`},{status:502});
    const data=await upstream.json();
    const text=data?.choices?.[0]?.message?.content||'';
    const match=text.match(/\{[\s\S]*\}/); if(!match)throw new Error('Provider returned invalid structured output');
    return Response.json(JSON.parse(match[0]));
  }catch(err:any){return Response.json({error:err?.message||'Agent route failed'},{status:500})}
}
