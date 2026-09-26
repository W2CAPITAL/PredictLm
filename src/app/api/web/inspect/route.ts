import {diffWebInspection,inspectHtml} from '@/lib/web-intelligence';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;

function safeUrl(raw:string){
  try{
    const url=new URL(raw);
    if(!['http:','https:'].includes(url.protocol))return null;
    const h=url.hostname.toLowerCase();
    if(h==='localhost'||h==='127.0.0.1'||h==='0.0.0.0'||h==='::1')return null;
    if(/^10\.|^192\.168\.|^169\.254\./.test(h))return null;
    const m=h.match(/^172\.(\d+)\./);
    if(m&&Number(m[1])>=16&&Number(m[1])<=31)return null;
    return url;
  }catch{return null}
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const url=safeUrl(String(body?.url||'').trim());
    if(!url)return Response.json({error:'URL pública inválida.'},{status:400});

    const response=await fetch(url.toString(),{
      cache:'no-store',
      redirect:'follow',
      headers:{
        'User-Agent':'Mozilla/5.0 PredictLM-WebInspector/1.0',
        'Accept':'text/html,application/xhtml+xml'
      },
      signal:AbortSignal.timeout(25000)
    });
    if(!response.ok)return Response.json({error:'Website HTTP '+response.status},{status:502});

    const type=String(response.headers.get('content-type')||'');
    if(!/text\/html|application\/xhtml\+xml/i.test(type)){
      return Response.json({error:'A URL não retornou HTML.'},{status:415});
    }

    const html=(await response.text()).slice(0,2_500_000);
    const inspection=inspectHtml(response.url||url.toString(),html);
    const previous=body?.previous&&typeof body.previous==='object'?body.previous:null;

    return Response.json({
      inspection,
      diff:diffWebInspection(previous,inspection),
      capabilities:{
        seoAudit:true,
        structuralCloneInput:true,
        changeDetection:true,
        browserAutomation:false,
        note:'Para console/rede/JS interativo use um adapter de navegador/DevTools configurado.'
      }
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha ao inspecionar website.')},{status:500});
  }
}
