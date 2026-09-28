export interface VisualIdentityMemoryItem{
  version:1;
  identityKey:string;
  prompt:string;
  approvedImageUrl:string;
  style:string;
  subjects:string[];
  semanticStatus:'passed';
  updatedAt:number;
}

const KEY='predictlm:visual-identity-memory:v1';

function readAll():VisualIdentityMemoryItem[]{
  if(typeof window==='undefined')return [];
  try{
    const raw=JSON.parse(localStorage.getItem(KEY)||'[]');
    return Array.isArray(raw)?raw.filter((x:any)=>x&&x.version===1&&x.identityKey&&x.semanticStatus==='passed'):[];
  }catch{return []}
}

function writeAll(items:VisualIdentityMemoryItem[]){
  if(typeof window==='undefined')return;
  try{
    localStorage.setItem(KEY,JSON.stringify(items.slice(0,40)));
  }catch{}
}

export function saveVisualIdentityMemory(item:VisualIdentityMemoryItem){
  if(typeof window==='undefined'||!item.identityKey||!item.approvedImageUrl)return;
  if(item.approvedImageUrl.startsWith('data:')||item.approvedImageUrl.startsWith('blob:'))return;
  const rows=readAll().filter(x=>x.identityKey!==item.identityKey);
  rows.unshift({...item,updatedAt:Date.now()});
  writeAll(rows);
}

export function loadVisualIdentityMemory(identityKey:string){
  if(!identityKey)return null;
  return readAll().find(x=>x.identityKey===identityKey)||null;
}

export function loadLatestVisualIdentityMemory(){
  return readAll().sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null;
}

export function resolveVisualIdentityMemory(identityKey:string,continuation=false){
  const exact=loadVisualIdentityMemory(identityKey);
  if(exact)return exact;
  return continuation?loadLatestVisualIdentityMemory():null;
}

export function clearVisualIdentityMemory(identityKey?:string){
  if(typeof window==='undefined')return;
  if(!identityKey){
    try{localStorage.removeItem(KEY)}catch{}
    return;
  }
  writeAll(readAll().filter(x=>x.identityKey!==identityKey));
}

export async function imageUrlToReferenceDataUrl(url:string,maxSide=1024){
  if(typeof window==='undefined'||!url)return '';
  if(url.startsWith('data:image/'))return url;
  try{
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)return '';
    const blob=await response.blob();
    if(!blob.type.startsWith('image/'))return '';
    const bitmap=await createImageBitmap(blob);
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');
    if(!ctx){bitmap.close();return ''}
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg',.9);
  }catch{return ''}
}
