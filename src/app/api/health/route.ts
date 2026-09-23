export const runtime = 'nodejs';
export async function GET(){return Response.json({ok:true,service:'predictlm-studio',mode:'hybrid',time:new Date().toISOString()})}
