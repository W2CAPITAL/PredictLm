import { queryLegalProcess } from '@/lib/legal/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

export async function GET(req:Request){
  const url=new URL(req.url);
  const number=url.searchParams.get('number')||url.searchParams.get('processo')||'';
  try{
    const result=await queryLegalProcess(number);
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const result=await queryLegalProcess(String(body?.number||body?.processo||''));
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||error)},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
