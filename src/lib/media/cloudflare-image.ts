export interface CloudflareImageConfig{
  accountId:string;
  token:string;
  model:string;
  steps:number;
  timeoutMs:number;
  enabled:boolean;
}

export function cloudflareImageConfig():CloudflareImageConfig{
  const accountId=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
  const token=String(process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_AI_API_TOKEN||'').trim();
  const model=String(process.env.CLOUDFLARE_IMAGE_MODEL||'@cf/black-forest-labs/flux-1-schnell').trim();
  const steps=Math.max(1,Math.min(8,Math.floor(Number(process.env.CLOUDFLARE_IMAGE_STEPS)||4)));
  const timeoutMs=Math.max(1500,Math.min(30000,Number(process.env.CLOUDFLARE_IMAGE_TIMEOUT_MS)||15000));
  return {accountId,token,model,steps,timeoutMs,enabled:Boolean(accountId&&token&&model)};
}

function imageMimeFromHeader(header:string){
  const type=String(header||'').split(';')[0].trim().toLowerCase();
  return /^image\/(?:png|jpeg|webp|avif)$/.test(type)?type:'image/jpeg';
}

export async function generateCloudflareImage(input:{
  prompt:string;
  seed:number;
  timeoutMs?:number;
  config?:CloudflareImageConfig;
}){
  const config=input.config||cloudflareImageConfig();
  if(!config.enabled)throw new Error('Cloudflare Workers AI image provider is not configured.');
  if(!/^@cf\/[a-z0-9._/-]+$/i.test(config.model))throw new Error('Invalid Cloudflare image model.');

  const endpoint='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(config.accountId)+'/ai/run/'+config.model;
  const response=await fetch(endpoint,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+config.token
    },
    body:JSON.stringify({
      prompt:String(input.prompt||'').trim().slice(0,2048),
      seed:Math.max(1,Math.min(2147483646,Math.floor(Number(input.seed)||1))),
      steps:config.steps
    }),
    signal:AbortSignal.timeout(Math.max(1200,Math.min(config.timeoutMs,input.timeoutMs||config.timeoutMs)))
  });

  const contentType=String(response.headers.get('content-type')||'').toLowerCase();
  if(!response.ok){
    const detail=(await response.text().catch(()=>'')).slice(0,300);
    throw new Error('Cloudflare image '+response.status+(detail?' '+detail:''));
  }

  if(contentType.startsWith('image/')){
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.byteLength<1024)throw new Error('Cloudflare image payload is too small.');
    return {
      dataUrl:'data:'+imageMimeFromHeader(contentType)+';base64,'+Buffer.from(bytes).toString('base64'),
      provider:'cloudflare-workers-ai',
      model:config.model
    };
  }

  const data=await response.json().catch(()=>({}));
  const b64=String(data?.result?.image||data?.image||data?.result?.b64_json||data?.b64_json||'').trim();
  if(!b64)throw new Error('Cloudflare image response did not contain image bytes.');
  return {
    dataUrl:'data:image/jpeg;base64,'+b64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i,''),
    provider:'cloudflare-workers-ai',
    model:config.model
  };
}
