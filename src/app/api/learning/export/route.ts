import {exportLearningPack} from '@/lib/training/learning-pack';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  const pack=await exportLearningPack();
  return Response.json(pack,{headers:{'Cache-Control':'no-store'}});
}
