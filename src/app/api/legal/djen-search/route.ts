import {searchDjenCommunications} from '@/lib/legal/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=60;

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const result=await searchDjenCommunications({
      oab:String(body?.oab||''),
      uf:String(body?.uf||''),
      processNumber:String(body?.processNumber||''),
      from:String(body?.from||''),
      to:String(body?.to||''),
      keyword:String(body?.keyword||''),
      tribunal:String(body?.tribunal||''),
      page:Number(body?.page)||1,
      size:Number(body?.size)||100
    });
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha na busca DJEN.')},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
