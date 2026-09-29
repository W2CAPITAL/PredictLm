import {diffWebInspection,inspectHtml} from '@/lib/web-intelligence';
import {assertPublicUrl,fetchPublicUrl} from '@/lib/server/public-url';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=45;

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const rawUrl=String(body?.url||'').trim();
    let url:URL;
    try{url=await assertPublicUrl(rawUrl)}
    catch{return Response.json({error:'URL pública inválida.'},{status:400})}

    const response=await fetchPublicUrl(url,{
      cache:'no-store',
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

    const length=Number(response.headers.get('content-length')||0);
    if(length>2_500_000)return Response.json({error:'HTML acima do limite permitido.'},{status:413});
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
  }catch(error){
    console.error('web/inspect failed',error);
    return Response.json({error:'Falha ao inspecionar website.'},{status:500});
  }
}
