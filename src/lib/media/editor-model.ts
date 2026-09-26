export type EditorClipKind='image'|'video';
export type EditorFit='cover'|'contain';
export type EditorTransition='cut'|'fade';
export type EditorFilter='none'|'cinematic'|'warm'|'cool'|'mono'|'vivid';

export type EditorClip={
  id:string;
  kind:EditorClipKind;
  url:string;
  name:string;
  trimStart:number;
  trimEnd:number|null;
  duration:number;
  speed:number;
  volume:number;
  fit:EditorFit;
  transition:EditorTransition;
};

export type EditorProject={
  version:1;
  id:string;
  createdAt:string;
  updatedAt:string;
  width:number;
  height:number;
  fps:number;
  background:string;
  filter:EditorFilter;
  caption:string;
  clips:EditorClip[];
};

const FILTERS:EditorFilter[]=['none','cinematic','warm','cool','mono','vivid'];
function id(prefix:string){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function safeKind(value:unknown):EditorClipKind{return value==='image'?'image':'video'}
function safeFit(value:unknown):EditorFit{return value==='contain'?'contain':'cover'}
function safeTransition(value:unknown):EditorTransition{return value==='fade'?'fade':'cut'}
function safeFilter(value:unknown):EditorFilter{return FILTERS.includes(value as EditorFilter)?value as EditorFilter:'none'}

export function createEditorClip(input:{kind:EditorClipKind;url:string;name?:string}):EditorClip{
  return {id:id('clip'),kind:input.kind,url:String(input.url||''),name:String(input.name||'Clip').slice(0,120),trimStart:0,trimEnd:null,duration:input.kind==='image'?4:8,speed:1,volume:1,fit:'cover',transition:'cut'};
}

export function createEditorProject(input:{width:number;height:number;sourceUrl?:string;sourceKind?:EditorClipKind;caption?:string}):EditorProject{
  const now=new Date().toISOString();
  const project:EditorProject={version:1,id:id('edit'),createdAt:now,updatedAt:now,width:Math.max(256,Math.round(input.width||1280)),height:Math.max(256,Math.round(input.height||720)),fps:24,background:'#000000',filter:'none',caption:String(input.caption||'').trim().slice(0,320),clips:[]};
  if(input.sourceUrl)project.clips.push(createEditorClip({kind:input.sourceKind||'video',url:input.sourceUrl,name:'Geração atual'}));
  return project;
}

export function touchEditorProject(project:EditorProject,patch:Partial<EditorProject>):EditorProject{
  return {...project,...patch,updatedAt:new Date().toISOString()};
}

export function editorProjectDuration(project:EditorProject){
  return project.clips.reduce((sum,clip)=>sum+Math.max(.25,(clip.trimEnd!=null?Math.max(.1,clip.trimEnd-clip.trimStart):clip.duration)/Math.max(.25,clip.speed)),0);
}

export function normalizeEditorProject(project:EditorProject):EditorProject{
  const filter=safeFilter(project.filter);
  return {
    ...project,
    version:1,
    id:String(project.id||id('edit')).slice(0,120),
    createdAt:String(project.createdAt||new Date().toISOString()),
    updatedAt:String(project.updatedAt||new Date().toISOString()),
    width:Math.max(256,Math.min(1920,Math.round(Number(project.width)||1280))),
    height:Math.max(256,Math.min(1920,Math.round(Number(project.height)||720))),
    fps:Math.max(12,Math.min(30,Math.round(Number(project.fps)||24))),
    background:/^#[0-9a-f]{6}$/i.test(String(project.background||''))?String(project.background):'#000000',
    filter,
    caption:String(project.caption||'').slice(0,320),
    clips:(Array.isArray(project.clips)?project.clips:[]).slice(0,20).map(c=>({
      id:String(c?.id||id('clip')).slice(0,120),
      kind:safeKind(c?.kind),
      url:String(c?.url||'').slice(0,4000),
      name:String(c?.name||'Clip').slice(0,120),
      trimStart:Math.max(0,Number(c?.trimStart)||0),
      trimEnd:c?.trimEnd==null?null:Math.max(0,Number(c.trimEnd)||0),
      duration:Math.max(.25,Math.min(30,Number(c?.duration)||4)),
      speed:Math.max(.25,Math.min(3,Number(c?.speed)||1)),
      volume:Math.max(0,Math.min(1,Number.isFinite(Number(c?.volume))?Number(c.volume):1)),
      fit:safeFit(c?.fit),
      transition:safeTransition(c?.transition)
    }))
  };
}

export function parseEditorProject(text:string):EditorProject{
  let raw:any;
  try{raw=JSON.parse(String(text||''))}catch{throw new Error('Projeto JSON inválido.')}
  if(!raw||typeof raw!=='object'||raw.version!==1||!Array.isArray(raw.clips))throw new Error('Este arquivo não é um projeto Imagine Editor v1.');
  const base=createEditorProject({width:Number(raw.width)||1280,height:Number(raw.height)||720,caption:String(raw.caption||'')});
  return normalizeEditorProject({
    ...base,
    ...raw,
    version:1,
    clips:raw.clips.map((clip:any)=>({
      ...createEditorClip({kind:safeKind(clip?.kind),url:String(clip?.url||''),name:String(clip?.name||'Clip')}),
      ...clip
    }))
  });
}
