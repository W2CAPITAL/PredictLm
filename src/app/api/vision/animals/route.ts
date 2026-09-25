import { ANIMAL_BACKENDS, animalResult, validateAnimalFile, type AnimalBackend } from '@/lib/vision/animal-contract';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function config(){return {base:(process.env.ANIMAL_VISION_URL||'').replace(/\/$/,''),token:process.env.ANIMAL_VISION_TOKEN||''};}
export async function GET(){
  const {base,token}=config();
  let ready:string[]=[];
  if(base&&token)try{
    const r=await fetch(base+'/health',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(3000),cache:'no-store',redirect:'error'});
    if(r.ok){const d=await r.json();ready=Array.isArray(d.adapters)?d.adapters.filter((a:{available?:boolean})=>a.available).map((a:{id:string})=>a.id):[];}
  }catch{}
  return Response.json({adapters:ANIMAL_BACKENDS.map(id=>({id,available:id==='auto'||id==='browser'||ready.includes(id)}))},{headers});
}
export async function POST(req:Request){
  const origin=req.headers.get('origin');
  if(origin&&origin!==new URL(req.url).origin)return Response.json({error:'Origem inválida.'},{status:403,headers});
  const {base,token}=config();
  if(!base||!token)return Response.json({error:'Serviço especializado não configurado. Use a análise no navegador.'},{status:503,headers});
  try{
    // Bound even a chunked multipart body before asking the parser to allocate it.
    const limit=8*1024*1024+16384;
    if(Number(req.headers.get('content-length')||0)>limit)return Response.json({error:'Imagem muito grande.'},{status:413,headers});
    const reader=req.body?.getReader();if(!reader)throw new Error('Envie uma foto.');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();return Response.json({error:'Imagem muito grande.'},{status:413,headers});}chunks.push(value);}
    const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
    const file=form.get('file');const backend=String(form.get('backend')) as AnimalBackend;
    if(!(file instanceof File)||backend==='browser'||!ANIMAL_BACKENDS.includes(backend))throw new Error('Foto ou modelo inválido.');
    validateAnimalFile(file);
    const data=new FormData();data.set('file',file,'image');data.set('backend',backend);
    const r=await fetch(base+'/predict',{method:'POST',headers:{Authorization:'Bearer '+token},body:data,signal:AbortSignal.timeout(45000),redirect:'error'});
    if(!r.ok)return Response.json({error:'O modelo especializado não está disponível para esta análise.'},{status:502,headers});
    const output=await r.json();
    return Response.json(animalResult(backend,String(output.model||backend),output.predictions,output.elapsedMs),{headers});
  }catch(e){return Response.json({error:e instanceof Error&&/Foto|foto|imagem|JPEG|modelo inválido/.test(e.message)?e.message:'Não foi possível concluir a análise.'},{status:400,headers});}
}
