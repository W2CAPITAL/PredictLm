import {blocksFromText,normalizeOcrPayload} from '@/lib/documents/pipeline';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function safeExternalUrl(raw:string){
  try{
    const url=new URL(raw);
    if(!['http:','https:'].includes(url.protocol))return false;
    const host=url.hostname.toLowerCase();
    if(host==='localhost'||host==='127.0.0.1'||host==='0.0.0.0'||host==='::1')return false;
    if(/^10\.|^192\.168\.|^169\.254\./.test(host))return false;
    const m=host.match(/^172\.(\d+)\./);
    if(m&&Number(m[1])>=16&&Number(m[1])<=31)return false;
    return true;
  }catch{return false}
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const sourceText=String(body?.text||'').trim();
    const sourceUrl=String(body?.sourceUrl||'').trim();

    if(sourceText){
      const blocks=blocksFromText(sourceText);
      return Response.json({
        markdown:sourceText,
        blocks,
        engine:'predict-structured-text',
        warnings:[],
        source:'inline-text'
      },{headers:{'Cache-Control':'no-store'}});
    }

    if(!sourceUrl||!safeExternalUrl(sourceUrl)){
      return Response.json({error:'Informe texto ou uma URL pública válida.'},{status:400});
    }

    const base=String(process.env.PADDLEOCR_BASE_URL||process.env.DOCUMENT_OCR_BASE_URL||'').trim().replace(/\/$/,'');
    const key=String(process.env.PADDLEOCR_API_KEY||process.env.DOCUMENT_OCR_API_KEY||'').trim();
    if(!base){
      return Response.json({
        error:'OCR estruturado não configurado no servidor.',
        code:'OCR_NOT_CONFIGURED',
        adapter:'PaddleOCR/PP-Structure compatible',
        required:['PADDLEOCR_BASE_URL'],
        sourceUrl
      },{status:503});
    }

    const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
    if(key)headers.Authorization='Bearer '+key;
    const upstream=await fetch(base,{
      method:'POST',
      headers,
      body:JSON.stringify({
        url:sourceUrl,
        sourceUrl,
        output:['markdown','json'],
        layout:true,
        tables:true,
        formulas:true
      }),
      signal:AbortSignal.timeout(55000),
      cache:'no-store'
    });
    const raw=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      return Response.json({error:'OCR upstream HTTP '+upstream.status,detail:raw?.error||raw?.message||null},{status:502});
    }
    const parsed=normalizeOcrPayload({...raw,engine:raw?.engine||raw?.model||'PaddleOCR adapter'});
    return Response.json({...parsed,sourceUrl},{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha ao analisar documento.')},{status:500});
  }
}
