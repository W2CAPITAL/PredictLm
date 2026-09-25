export const runtime='nodejs';
export const dynamic='force-dynamic';

/**
 * Legacy compatibility endpoint.
 * Media Library persistence moved to browser LocalStorage so PredictLM does not
 * depend on Supabase for Imagine history.
 */
export async function GET(){
  return Response.json({
    items:[],
    persisted:false,
    mode:'browser-local',
    message:'A Media Library agora é persistida localmente no navegador.'
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(){
  return Response.json({
    item:null,
    persisted:false,
    mode:'browser-local',
    message:'Persistência server-side desativada. Use a biblioteca local do navegador.'
  },{headers:{'Cache-Control':'no-store'}});
}

export async function DELETE(){
  return Response.json({
    deleted:false,
    persisted:false,
    mode:'browser-local',
    message:'Exclusão server-side desativada. A UI remove itens do armazenamento local.'
  },{headers:{'Cache-Control':'no-store'}});
}
