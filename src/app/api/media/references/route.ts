import { isPersistentSelfPortraitRequest, resolveVisualReferences } from '@/lib/media/visual-reference';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const query=String(body?.query||'').trim();
    if(!query)return Response.json({error:'Informe o que precisa de referência visual.'},{status:400});
    if(isPersistentSelfPortraitRequest(query)){
      return Response.json({
        identityLocked:true,
        exactReference:true,
        provider:'entity-self-reference',
        query,
        references:[]
      });
    }
    const plan=await resolveVisualReferences(query,Number(body?.limit)||undefined);
    return Response.json({identityLocked:true,...plan});
  }catch(error:any){
    return Response.json({error:error?.message||'Falha ao preparar referências visuais.'},{status:500});
  }
}
