import { createLegalDossier } from '@/lib/legal/dossier';
import type { LegalDossierMode } from '@/lib/legal/mode';
import { queryLegalProcess } from '@/lib/legal/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

function modeOf(value:any):LegalDossierMode{
  return value==='aggressive'?'aggressive':'standard';
}

async function generate(number:string,mode:LegalDossierMode){
  const bundle=await queryLegalProcess(number);
  const html=createLegalDossier(bundle,{mode});
  return new Response(html,{
    headers:{
      'Content-Type':'text/html; charset=utf-8',
      'Content-Disposition':'attachment; filename="dossie-'+bundle.digits+(mode==='aggressive'?'-aegis':'')+'.html"',
      'Cache-Control':'no-store'
    }
  });
}

export async function GET(req:Request){
  try{
    const url=new URL(req.url);
    return await generate(
      url.searchParams.get('number')||url.searchParams.get('processo')||'',
      modeOf(url.searchParams.get('mode'))
    );
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    return await generate(
      String(body?.number||body?.processo||''),
      modeOf(body?.mode)
    );
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
