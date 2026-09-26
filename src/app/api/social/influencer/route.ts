import {createInfluencerCampaignPlan,isInfluencerStudioRequest} from '@/lib/social/influencer-studio';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const prompt=String(body?.prompt||'').trim();
  if(prompt&&!isInfluencerStudioRequest(prompt)&&body?.force!==true){
    return Response.json({
      error:'O pedido não parece ser uma campanha de influenciadora/social. Use force=true para gerar mesmo assim.'
    },{status:400});
  }
  const plan=createInfluencerCampaignPlan({
    prompt,
    days:Number(body?.days)||7,
    locale:String(body?.locale||'pt-BR'),
    referenceImageCount:Array.isArray(body?.referenceImages)?body.referenceImages.length:Number(body?.referenceImageCount)||0
  });
  return Response.json(plan,{headers:{'Cache-Control':'no-store'}});
}
