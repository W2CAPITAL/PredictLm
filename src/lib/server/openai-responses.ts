import type {ProviderMessage,ProviderSpec} from './provider-mesh';

export type OpenAIReasoningEffort='none'|'low'|'medium'|'high'|'xhigh'|'max';

function normalizedEffort(value:unknown,deep=false):OpenAIReasoningEffort{
  const v=String(value||'').toLowerCase();
  if(v==='none'||v==='low'||v==='medium'||v==='high'||v==='xhigh'||v==='max')return v;
  return deep?'high':'medium';
}

function responseInput(messages:ProviderMessage[]){
  return messages.map(message=>({
    role:message.role,
    content:[{type:'input_text',text:message.content}]
  }));
}

function extractOutputText(data:any){
  const direct=String(data?.output_text||'').trim();
  if(direct)return direct;
  const chunks=Array.isArray(data?.output)
    ?data.output.flatMap((item:any)=>Array.isArray(item?.content)?item.content:[])
      .filter((part:any)=>part?.type==='output_text'&&typeof part?.text==='string')
      .map((part:any)=>String(part.text).trim())
      .filter(Boolean)
    :[];
  return chunks.join('\n').trim();
}

export async function callOpenAIResponses(
  provider:ProviderSpec,
  messages:ProviderMessage[],
  options:{deep?:boolean;timeoutMs?:number;maxTokens?:number}={}
){
  const controller=new AbortController();
  const timeoutMs=Math.max(1000,Number(options.timeoutMs)||16000);
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const reasoning=normalizedEffort(process.env.OPENAI_REASONING_EFFORT,Boolean(options.deep));
    const response=await fetch(provider.base.replace(/\/$/,'')+'/responses',{
      method:'POST',
      signal:controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+provider.key,
        ...(provider.headers||{})
      },
      body:JSON.stringify({
        model:provider.model,
        input:responseInput(messages),
        reasoning:{effort:reasoning},
        max_output_tokens:Math.max(256,Number(options.maxTokens)||(options.deep?2200:1400)),
        store:false
      })
    });
    const raw=await response.text();
    if(!response.ok)throw new Error(provider.name+' '+response.status+' '+raw.slice(0,300));
    let data:any={};
    try{data=JSON.parse(raw)}catch{}
    const text=extractOutputText(data);
    if(!text)throw new Error(provider.name+' empty Responses API output');
    return text;
  }finally{
    clearTimeout(timer);
  }
}
