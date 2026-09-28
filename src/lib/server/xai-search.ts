import {providerEndpointAllowed} from '@/lib/chat-trust-boundary';
import {circuitReadyProviders,recordProviderFailure,recordProviderSuccess} from '@/lib/server/provider-health';

export type XaiSearchMode='auto'|'web'|'x';

export interface XaiSearchOptions{
  query:string;
  mode?:XaiSearchMode;
  maxTurns?:number;
  model?:string;
  allowDomains?:string[];
  excludeDomains?:string[];
  allowHandles?:string[];
  excludeHandles?:string[];
  from?:string;
  to?:string;
  linksOnly?:boolean;
}

export interface XaiSearchResult{
  provider:'xai-search';
  model:string;
  mode:XaiSearchMode;
  answer:string;
  citations:string[];
  toolUsage:{
    toolCalls:any[];
    serverSide:any[];
  };
  web:Array<{
    type:'web';
    url:string;
    title:string;
    description:string;
    site:string;
    source:'xAI Search';
    citationIndex:number;
  }>;
}

function uniqueStrings(values:unknown){
  return [...new Set((Array.isArray(values)?values:[])
    .map(value=>String(value||'').trim())
    .filter(Boolean))];
}

function normalizeDomains(values:unknown){
  return uniqueStrings(values).filter(value=>/^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(value)).slice(0,10);
}

function normalizeHandles(values:unknown){
  return uniqueStrings(values)
    .map(value=>value.replace(/^@/,''))
    .filter(value=>/^[A-Za-z0-9_]{1,15}$/.test(value))
    .slice(0,10);
}

function validDate(value:unknown){
  const text=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return '';
  const parsed=new Date(text+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===text?text:'';
}

export function inferXaiSearchMode(query:string):XaiSearchMode{
  const q=String(query||'').toLowerCase();
  if(/\b(?:twitter|tweet|tweets|post(?:s)? no x|x\.com|@\w{1,15})\b/.test(q))return'x';
  return'auto';
}

export function buildXaiSearchTools(options:XaiSearchOptions){
  const allowDomains=normalizeDomains(options.allowDomains);
  const excludeDomains=normalizeDomains(options.excludeDomains);
  const allowHandles=normalizeHandles(options.allowHandles);
  const excludeHandles=normalizeHandles(options.excludeHandles);
  const from=validDate(options.from);
  const to=validDate(options.to);

  const webTool={
    type:'web_search',
    web_search:{
      enable_image_understanding:true,
      ...(allowDomains.length?{allowed_domains:allowDomains}:{}),
      ...(!allowDomains.length&&excludeDomains.length?{excluded_domains:excludeDomains}:{})
    }
  };
  const xTool={
    type:'x_search',
    x_search:{
      enable_image_understanding:true,
      enable_video_understanding:true,
      ...(from?{from_date:from}:{}),
      ...(to?{to_date:to}:{}),
      ...(allowHandles.length?{allowed_x_handles:allowHandles}:{}),
      ...(!allowHandles.length&&excludeHandles.length?{excluded_x_handles:excludeHandles}:{})
    }
  };

  const mode=options.mode||inferXaiSearchMode(options.query);
  if(mode==='web')return[webTool];
  if(mode==='x')return[xTool];
  return[webTool,xTool];
}

function extractAnswer(data:any){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  for(const output of Array.isArray(data?.output)?data.output:[]){
    for(const content of Array.isArray(output?.content)?output.content:[]){
      if(typeof content?.text==='string'&&content.text.trim())return content.text.trim();
    }
  }
  return'';
}

function extractCitations(data:any){
  const urls:string[]=[];
  for(const entry of Array.isArray(data?.citations)?data.citations:[]){
    if(typeof entry==='string')urls.push(entry);
    else if(typeof entry?.url==='string')urls.push(entry.url);
  }
  for(const output of Array.isArray(data?.output)?data.output:[]){
    for(const content of Array.isArray(output?.content)?output.content:[]){
      for(const annotation of Array.isArray(content?.annotations)?content.annotations:[]){
        if(annotation?.type==='url_citation'&&typeof annotation?.url==='string')urls.push(annotation.url);
      }
    }
  }
  return[...new Set(urls)].filter(url=>{
    try{
      const parsed=new URL(url);
      return parsed.protocol==='https:'||parsed.protocol==='http:';
    }catch{return false}
  }).slice(0,30);
}

function extractToolCalls(data:any){
  if(Array.isArray(data?.tool_calls))return data.tool_calls.slice(0,20);
  return (Array.isArray(data?.output)?data.output:[])
    .filter((entry:any)=>typeof entry?.type==='string'&&entry.type.endsWith('_call'))
    .slice(0,20)
    .map((entry:any)=>({type:entry.type,status:entry.status||null,action:entry.action||null}));
}

function extractServerUsage(data:any){
  if(Array.isArray(data?.server_side_tool_usage))return data.server_side_tool_usage.slice(0,20);
  const details=data?.usage?.server_side_tool_usage_details;
  if(!details||typeof details!=='object')return[];
  return Object.entries(details)
    .filter(([,count])=>Number(count)>0)
    .slice(0,20)
    .map(([key,count])=>({type:key.replace(/_calls$/,''),calls:Number(count)}));
}

export function normalizeXaiSearchResponse(data:any,options:XaiSearchOptions,model:string):XaiSearchResult{
  const answer=options.linksOnly?'':extractAnswer(data);
  const citations=extractCitations(data);
  const mode=options.mode||inferXaiSearchMode(options.query);
  const description=answer.replace(/\s+/g,' ').trim().slice(0,2200);
  const web=citations.map((url,index)=>{
    let site='';try{site=new URL(url).hostname}catch{}
    return{
      type:'web' as const,
      url,
      title:'xAI citation · '+(site||('source '+(index+1))),
      description,
      site,
      source:'xAI Search' as const,
      citationIndex:index+1
    };
  });
  return{
    provider:'xai-search',
    model,
    mode,
    answer,
    citations,
    toolUsage:{
      toolCalls:extractToolCalls(data),
      serverSide:extractServerUsage(data)
    },
    web
  };
}

export function xaiSearchConfigured(){
  return Boolean(String(process.env.XAI_API_KEY||'').trim());
}

export async function xaiSearch(options:XaiSearchOptions,context?:{
  fetchImpl?:typeof fetch;
  apiKey?:string;
  base?:string;
  model?:string;
  timeoutMs?:number;
}){
  const query=String(options.query||'').trim();
  if(!query)throw new Error('xAI search query is required');
  const apiKey=String(context?.apiKey||process.env.XAI_API_KEY||'').trim();
  if(!apiKey)throw new Error('xAI search is not configured');
  const base=String(context?.base||process.env.XAI_BASE_URL||'https://api.x.ai/v1').trim().replace(/\/$/,'');
  if(!providerEndpointAllowed(base,Boolean(process.env.VERCEL)))throw new Error('xAI search endpoint is not allowed');
  const model=String(context?.model||options.model||process.env.XAI_SEARCH_MODEL||'grok-4-1-fast').trim();
  const provider={name:'xai-search',base,model};
  if(!circuitReadyProviders([provider]).length)throw new Error('xAI search provider cooling down');

  const maxTurns=Math.max(1,Math.min(10,Math.floor(Number(options.maxTurns)||3)));
  const body={
    model,
    max_turns:maxTurns,
    input:[{role:'user',content:[{type:'input_text',text:query.slice(0,8000)}]}],
    tools:buildXaiSearchTools(options)
  };
  const fetchImpl=context?.fetchImpl||fetch;
  try{
    const response=await fetchImpl(base+'/responses',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify(body),
      cache:'no-store',
      signal:AbortSignal.timeout(Math.max(3000,Math.min(30000,Number(context?.timeoutMs)||18000)))
    });
    const raw=await response.text();
    if(!response.ok)throw new Error('xAI search '+response.status);
    let data:any={};
    try{data=JSON.parse(raw)}catch{throw new Error('xAI search returned invalid JSON')}
    const normalized=normalizeXaiSearchResponse(data,options,model);
    if(!options.linksOnly&&!normalized.answer&&!normalized.citations.length)throw new Error('xAI search returned no usable evidence');
    recordProviderSuccess(provider);
    return normalized;
  }catch(error){
    recordProviderFailure(provider,error);
    throw error;
  }
}
