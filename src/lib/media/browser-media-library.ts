export type BrowserMediaItem={
  id:string;
  kind:'image'|'video'|'storyboard';
  status?:string;
  provider?:string|null;
  model?:string|null;
  prompt:string;
  enhanced_prompt?:string|null;
  style?:string|null;
  aspect_ratio?:string|null;
  width?:number|null;
  height?:number|null;
  seed?:number|null;
  remote_url?:string|null;
  thumbnail_url?:string|null;
  meta?:Record<string,any>|null;
  created_at:string;
};

const KEY='predictlm_media_library_v4';
const LIMIT=60;
const TTL_MS=30*24*60*60*1000;

function storageAvailable(){
  try{
    if(typeof window==='undefined'||!window.localStorage)return false;
    const probe='__predictlm_media_probe__';
    window.localStorage.setItem(probe,'1');
    window.localStorage.removeItem(probe);
    return true;
  }catch{return false}
}

function cleanUrl(value:any){
  const url=String(value||'').trim();
  if(!url||url.startsWith('data:')||url.startsWith('blob:'))return null;
  return url.slice(0,4000);
}

function normalizeRows(input:any):BrowserMediaItem[]{
  const now=Date.now();
  return (Array.isArray(input)?input:[])
    .filter(Boolean)
    .map((row:any)=>({
      id:String(row.id||''),
      kind:['image','video','storyboard'].includes(row.kind)?row.kind:'image',
      status:String(row.status||'ready'),
      provider:row.provider?String(row.provider):null,
      model:row.model?String(row.model):null,
      prompt:String(row.prompt||''),
      enhanced_prompt:row.enhanced_prompt?String(row.enhanced_prompt):null,
      style:row.style?String(row.style):null,
      aspect_ratio:row.aspect_ratio?String(row.aspect_ratio):null,
      width:Number.isFinite(Number(row.width))?Number(row.width):null,
      height:Number.isFinite(Number(row.height))?Number(row.height):null,
      seed:Number.isFinite(Number(row.seed))?Number(row.seed):null,
      remote_url:cleanUrl(row.remote_url),
      thumbnail_url:cleanUrl(row.thumbnail_url),
      meta:row.meta&&typeof row.meta==='object'?row.meta:{},
      created_at:String(row.created_at||new Date().toISOString())
    }))
    .filter((row:BrowserMediaItem)=>{
      const ts=Date.parse(row.created_at);
      return !Number.isFinite(ts)||now-ts<TTL_MS||row.meta?.pinned;
    })
    .slice(0,LIMIT);
}

export function browserMediaLibraryAvailable(){
  return storageAvailable();
}

export function loadBrowserMediaLibrary():BrowserMediaItem[]{
  if(!storageAvailable())return [];
  try{
    const parsed=JSON.parse(window.localStorage.getItem(KEY)||'[]');
    const rows=normalizeRows(parsed);
    window.localStorage.setItem(KEY,JSON.stringify(rows));
    return rows;
  }catch{return []}
}

export function saveBrowserMediaItem(input:{
  kind:'image'|'video'|'storyboard';
  status?:string;
  provider?:string;
  model?:string;
  prompt:string;
  enhancedPrompt?:string;
  style?:string;
  aspectRatio?:string;
  width?:number;
  height?:number;
  seed?:number;
  url?:string|null;
  thumbnailUrl?:string|null;
  meta?:Record<string,any>;
}):BrowserMediaItem|null{
  if(!storageAvailable())return null;
  const item:BrowserMediaItem={
    id:(globalThis.crypto?.randomUUID?.()||('media-'+Date.now()+'-'+Math.random().toString(36).slice(2))),
    kind:input.kind,
    status:input.status||'ready',
    provider:input.provider||'predict-media',
    model:input.model||null,
    prompt:String(input.prompt||'').slice(0,12000),
    enhanced_prompt:input.enhancedPrompt?String(input.enhancedPrompt).slice(0,16000):null,
    style:input.style||null,
    aspect_ratio:input.aspectRatio||null,
    width:Number.isFinite(Number(input.width))?Number(input.width):null,
    height:Number.isFinite(Number(input.height))?Number(input.height):null,
    seed:Number.isFinite(Number(input.seed))?Math.floor(Number(input.seed)):null,
    remote_url:cleanUrl(input.url),
    thumbnail_url:cleanUrl(input.thumbnailUrl),
    meta:input.meta&&typeof input.meta==='object'?input.meta:{},
    created_at:new Date().toISOString()
  };
  const rows=[item,...loadBrowserMediaLibrary().filter(x=>x.id!==item.id)].slice(0,LIMIT);
  try{window.localStorage.setItem(KEY,JSON.stringify(rows));return item}catch{return null}
}

export function deleteBrowserMediaItem(id:string){
  if(!storageAvailable())return false;
  try{
    const rows=loadBrowserMediaLibrary().filter(x=>x.id!==id);
    window.localStorage.setItem(KEY,JSON.stringify(rows));
    return true;
  }catch{return false}
}

export function clearBrowserMediaLibrary(){
  if(!storageAvailable())return false;
  try{window.localStorage.removeItem(KEY);return true}catch{return false}
}
