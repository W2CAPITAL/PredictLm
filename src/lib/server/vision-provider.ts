import {rankProviders,type ProviderSpec} from './provider-mesh';
import {recordProviderFailure,recordProviderSuccess} from './provider-health';

export interface VisionProviderResult{
  provider:string;
  model:string;
  text:string;
}

function parseDataUrl(dataUrl:string){
  const match=String(dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!match)throw new Error('Imagem multimodal inválida.');
  if(match[2].length>3_000_000)throw new Error('Imagem multimodal muito grande.');
  return {mime:match[1],data:match[2]};
}

async function callOne(provider:ProviderSpec,instruction:string,dataUrl:string,timeoutMs:number){
  const {mime,data}=parseDataUrl(dataUrl);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.max(3000,timeoutMs));
  try{
    if(provider.protocol==='anthropic'){
      const response=await fetch(provider.base.replace(/\/$/,'')+'/messages',{
        method:'POST',
        signal:controller.signal,
        headers:{
          'Content-Type':'application/json',
          'x-api-key':provider.key,
          'anthropic-version':'2023-06-01',
          ...(provider.headers||{})
        },
        body:JSON.stringify({
          model:provider.model,
          max_tokens:1000,
          temperature:0,
          messages:[{
            role:'user',
            content:[
              {type:'image',source:{type:'base64',media_type:mime,data}},
              {type:'text',text:instruction}
            ]
          }]
        })
      });
      const raw=await response.text();
      if(!response.ok)throw new Error(provider.name+' '+response.status+' '+raw.slice(0,240));
      let body:any={};try{body=JSON.parse(raw)}catch{}
      const text=Array.isArray(body?.content)
        ? body.content.filter((x:any)=>x?.type==='text'&&x?.text).map((x:any)=>x.text).join('\n').trim()
        : '';
      if(!text)throw new Error(provider.name+' empty vision response');
      recordProviderSuccess(provider);
      return {provider:provider.name,model:provider.model,text};
    }

    const response=await fetch(provider.base.replace(/\/$/,'')+'/chat/completions',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+provider.key,
        ...(provider.headers||{})
      },
      body:JSON.stringify({
        model:provider.model,
        temperature:0,
        max_tokens:1000,
        stream:false,
        messages:[{
          role:'user',
          content:[
            {type:'text',text:instruction},
            {type:'image_url',image_url:{url:dataUrl}}
          ]
        }]
      })
    });
    const raw=await response.text();
    if(!response.ok)throw new Error(provider.name+' '+response.status+' '+raw.slice(0,240));
    let body:any={};try{body=JSON.parse(raw)}catch{}
    const text=String(body?.choices?.[0]?.message?.content||body?.response||'').trim();
    if(!text)throw new Error(provider.name+' empty vision response');
    recordProviderSuccess(provider);
    return {provider:provider.name,model:provider.model,text};
  }catch(error){
    recordProviderFailure(provider,error);
    throw error;
  }finally{
    clearTimeout(timer);
  }
}

export async function callVisionProviders(
  instruction:string,
  dataUrl:string,
  options:{timeoutMs?:number;maxProviders?:number}={}
):Promise<VisionProviderResult>{
  parseDataUrl(dataUrl);
  const candidates=rankProviders('análise visual multimodal imagem reconhecimento '+instruction,false)
    .filter(provider=>!['deepseek','nvidia','opencode','freellmapi','ollama'].includes(provider.name))
    .slice(0,Math.max(1,Math.min(5,options.maxProviders||4)));
  if(!candidates.length)throw new Error('Nenhum provider multimodal está configurado.');
  const errors:string[]=[];
  for(const provider of candidates){
    try{
      return await callOne(provider,instruction,dataUrl,options.timeoutMs||22000);
    }catch(error:any){
      errors.push(provider.name+': '+String(error?.message||error).slice(0,180));
    }
  }
  throw new Error('Nenhum provider multimodal analisou a imagem. '+errors.slice(0,3).join(' | '));
}

export function parseVisionJson<T=any>(raw:string):T|null{
  const fenced=String(raw||'').match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate=fenced||String(raw||'').match(/\{[\s\S]*\}/)?.[0]||'';
  if(!candidate)return null;
  try{return JSON.parse(candidate) as T}catch{return null}
}
