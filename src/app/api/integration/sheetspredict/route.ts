import {timingSafeEqual} from 'node:crypto';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function keys(){
  const single=String(process.env.PREDICTLM_API_KEY||'').trim();
  const many=String(process.env.PREDICTLM_API_KEYS||'').split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
  return [...new Set([single,...many].filter(Boolean))];
}
function bearer(req:Request){
  const raw=String(req.headers.get('authorization')||'');
  return raw.toLowerCase().startsWith('bearer ')?raw.slice(7).trim():'';
}
function sameSecret(a:string,b:string){
  if(!a||!b)return false;
  const aa=Buffer.from(a),bb=Buffer.from(b);
  return aa.length===bb.length&&timingSafeEqual(aa,bb);
}

export async function GET(req:Request){
  const configured=keys();
  const supplied=bearer(req);
  const authorized=!!supplied&&configured.some(key=>sameSecret(supplied,key));
  return Response.json({
    ok:true,
    service:'predictlm',
    version:process.env.npm_package_version||'unknown',
    configured:configured.length>0,
    authorized,
    capabilities:{chat:true,legal:true,dossiers:true,imagine:true},
    ts:new Date().toISOString()
  },{status:200,headers:{'Cache-Control':'no-store, max-age=0'}});
}
