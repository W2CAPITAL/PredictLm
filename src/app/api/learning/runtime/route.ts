import { NextRequest } from 'next/server';
import { runtimeAutoLearningContext, runtimeAutoLearningStats } from '@/lib/server/auto-learning';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
  const q=String(req.nextUrl.searchParams.get('q')||'').slice(0,1600);
  const surface=String(req.nextUrl.searchParams.get('surface')||'chat').slice(0,40);
  const [context,stats]=await Promise.all([
    runtimeAutoLearningContext(q,5,surface),
    runtimeAutoLearningStats()
  ]);
  return Response.json({context,stats},{headers:{'Cache-Control':'no-store'}});
}
