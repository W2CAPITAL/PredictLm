export interface ComfyInlineImage{
  mimeType:string;
  data:string;
}

export interface ComfyImageResult{
  dataUrl:string;
  promptId:string;
  filename:string;
  mimeType:string;
}

function loopbackBase(base:string){
  try{
    const host=new URL(base).hostname.toLowerCase();
    return host==='127.0.0.1'||host==='localhost'||host==='0.0.0.0'||host==='::1';
  }catch{return false}
}

export function comfyServerReachable(base:string){
  return Boolean(base)&&!(process.env.VERCEL&&loopbackBase(base));
}

export function comfyImageConfig(){
  const base=String(process.env.COMFYUI_IMAGE_BASE_URL||process.env.COMFYUI_BASE_URL||'').trim().replace(/\/$/,'');
  const workflow=String(process.env.COMFYUI_IMAGE_WORKFLOW_JSON||'').trim();
  return {
    base,
    workflow,
    enabled:!!base&&!!workflow&&comfyServerReachable(base)
  };
}

function replaceTokens(value:any,tokens:Record<string,string|number>):any{
  if(Array.isArray(value))return value.map(x=>replaceTokens(x,tokens));
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceTokens(v,tokens)]));
  }
  if(typeof value!=='string')return value;
  for(const [token,replacement] of Object.entries(tokens)){
    if(value===token)return replacement;
  }
  let out=value;
  for(const [token,replacement] of Object.entries(tokens)){
    out=out.split(token).join(String(replacement));
  }
  return out;
}

async function uploadImage(base:string,image:ComfyInlineImage,index:number){
  const bytes=Buffer.from(image.data,'base64');
  const ext=image.mimeType==='image/jpeg'?'jpg':image.mimeType.split('/')[1]||'png';
  const form=new FormData();
  form.append('image',new Blob([bytes],{type:image.mimeType}),'predictlm-ref-'+index+'.'+ext);
  form.append('overwrite','true');
  const r=await fetch(base+'/upload/image',{
    method:'POST',
    body:form,
    signal:AbortSignal.timeout(20000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('ComfyUI upload HTTP '+r.status);
  const name=String(data?.name||data?.filename||'').trim();
  if(!name)throw new Error('ComfyUI não retornou o nome da referência enviada.');
  return name;
}

function imageOutput(history:any,promptId:string){
  const root=history?.[promptId]||history?.[Object.keys(history||{})[0]]||null;
  if(!root)return null;
  for(const output of Object.values(root?.outputs||{}) as any[]){
    const images=Array.isArray(output?.images)?output.images:[];
    for(const file of images){
      const filename=String(file?.filename||file?.name||'').trim();
      if(!filename)continue;
      return {
        filename,
        subfolder:String(file?.subfolder||''),
        type:String(file?.type||'output')
      };
    }
  }
  return null;
}

async function waitForImage(base:string,promptId:string,timeoutMs:number){
  const started=Date.now();
  while(Date.now()-started<timeoutMs){
    const r=await fetch(base+'/history/'+encodeURIComponent(promptId),{
      cache:'no-store',
      signal:AbortSignal.timeout(10000)
    });
    const data=await r.json().catch(()=>({}));
    if(r.ok){
      const file=imageOutput(data,promptId);
      if(file)return file;
      const root=data?.[promptId]||data?.[Object.keys(data||{})[0]]||null;
      const status=String(root?.status?.status_str||root?.status?.status||'');
      if(/error|fail|cancel/i.test(status))throw new Error('Workflow ComfyUI falhou: '+status);
    }
    await new Promise(resolve=>setTimeout(resolve,900));
  }
  throw new Error('ComfyUI excedeu o tempo de geração da imagem.');
}

export async function runComfyImageWorkflow(input:{
  prompt:string;
  negativePrompt?:string;
  width:number;
  height:number;
  seed:number;
  references?:ComfyInlineImage[];
  timeoutMs?:number;
}):Promise<ComfyImageResult>{
  const cfg=comfyImageConfig();
  if(!cfg.enabled)throw new Error('ComfyUI de imagem não configurado ou não alcançável pelo servidor.');

  let parsed:any;
  try{parsed=JSON.parse(cfg.workflow)}
  catch{throw new Error('COMFYUI_IMAGE_WORKFLOW_JSON não contém JSON válido.');}

  const refs=(input.references||[]).slice(0,3);
  const filenames:string[]=[];
  for(let i=0;i<refs.length;i++)filenames.push(await uploadImage(cfg.base,refs[i],i+1));

  const tokens:Record<string,string|number>={
    '{{PROMPT}}':input.prompt,
    '{{NEGATIVE_PROMPT}}':input.negativePrompt||'low quality, deformed anatomy, duplicate subjects, watermark, text artifacts',
    '{{WIDTH}}':Math.max(256,Math.min(2048,Math.round(input.width))),
    '{{HEIGHT}}':Math.max(256,Math.min(2048,Math.round(input.height))),
    '{{SEED}}':Math.max(1,Math.min(2147483646,Math.floor(input.seed))),
    '{{REFERENCE_1_FILENAME}}':filenames[0]||'',
    '{{REFERENCE_2_FILENAME}}':filenames[1]||'',
    '{{REFERENCE_3_FILENAME}}':filenames[2]||'',
    '{{IMAGE_FILENAME}}':filenames[0]||''
  };
  const workflow=replaceTokens(parsed,tokens);
  const queued=await fetch(cfg.base+'/prompt',{
    method:'POST',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({prompt:workflow,client_id:'predictlm-image-'+input.seed}),
    signal:AbortSignal.timeout(20000)
  });
  const queuedData=await queued.json().catch(()=>({}));
  if(!queued.ok)throw new Error('ComfyUI queue HTTP '+queued.status);
  const promptId=String(queuedData?.prompt_id||queuedData?.promptId||'').trim();
  if(!promptId)throw new Error('ComfyUI não retornou prompt_id.');

  const file=await waitForImage(cfg.base,promptId,Math.max(5000,Math.min(50000,input.timeoutMs||42000)));
  const params=new URLSearchParams(file);
  const media=await fetch(cfg.base+'/view?'+params.toString(),{
    cache:'no-store',
    signal:AbortSignal.timeout(20000)
  });
  if(!media.ok)throw new Error('ComfyUI view HTTP '+media.status);
  const mimeType=String(media.headers.get('content-type')||'image/png').split(';')[0];
  if(!mimeType.startsWith('image/'))throw new Error('ComfyUI retornou um arquivo que não é imagem.');
  const bytes=Buffer.from(await media.arrayBuffer()).toString('base64');
  return {
    dataUrl:'data:'+mimeType+';base64,'+bytes,
    promptId,
    filename:file.filename,
    mimeType
  };
}
