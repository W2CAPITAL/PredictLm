import {searchLegalCases} from '@/lib/legal/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const result=await searchLegalCases({
      tribunal:String(body?.tribunal||''),
      size:Number(body?.size)||50,
      offset:Number(body?.offset)||0,
      processNumber:String(body?.processNumber||''),
      degree:String(body?.degree||''),
      classCode:body?.classCode,
      subjectCode:body?.subjectCode,
      municipalityCode:body?.municipalityCode,
      filedFrom:String(body?.filedFrom||''),
      filedTo:String(body?.filedTo||'')
    });
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha na busca DataJud.')},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
