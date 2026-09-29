import {buildPublisherManifest,type InfluencerContentItem} from '@/lib/social/influencer-studio';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const item=body?.item as InfluencerContentItem|undefined;
  const mediaUrl=String(body?.mediaUrl||'').trim();
  const caption=String(body?.caption||'').trim();
  const confirmed=body?.confirmPublish===true;
  if(!item||!mediaUrl){
    return Response.json({error:'Informe item e mediaUrl.'},{status:400});
  }
  if(!confirmed){
    return Response.json({
      published:false,
      status:'approval-required',
      error:'Publicação externa exige confirmação humana explícita.',
      required:{confirmPublish:true}
    },{status:409});
  }

  const manifest=buildPublisherManifest(item,mediaUrl,caption);
  const base=String(process.env.SOCIAL_PUBLISHER_BASE_URL||'').trim().replace(/\/$/,'');
  if(!base){
    return Response.json({
      published:false,
      status:'review-ready',
      manifest,
      error:'Nenhum publisher social externo está configurado.'
    },{status:503});
  }

  const path=String(process.env.SOCIAL_PUBLISHER_PATH||'/publish').trim()||'/publish';
  const key=String(process.env.SOCIAL_PUBLISHER_API_KEY||'').trim();
  try{
    const upstream=await fetch(base+(path.startsWith('/')?path:'/'+path),{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        ...(key?{'Authorization':'Bearer '+key}:{})
      },
      body:JSON.stringify(manifest),
      signal:AbortSignal.timeout(30000)
    });
    const data=await upstream.json().catch(async()=>({raw:await upstream.text().catch(()=> '')}));
    if(!upstream.ok){
      return Response.json({published:false,status:'publisher-error',manifest,upstream:data},{status:502});
    }
    return Response.json({published:true,status:'confirmed',manifest,upstream:data});
  }catch(error){
    console.error('social/publish failed',error);
    return Response.json({published:false,status:'publisher-error',manifest,error:'Falha no publisher social.'},{status:502});
  }
}
