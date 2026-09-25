import {checkLegalSourceHealth} from '@/lib/legal/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='gru1';
export const maxDuration=30;

export async function GET(){
  try{
    const health=await checkLegalSourceHealth();
    return Response.json(health,{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error:any){
    return Response.json({
      fetchedAt:new Date().toISOString(),
      datajud:{ok:false,detail:'Falha ao verificar DataJud.'},
      djen:{ok:false,detail:'Falha ao verificar DJEN.'},
      error:String(error?.message||error)
    },{status:503,headers:{'Cache-Control':'no-store, max-age=0'}});
  }
}
