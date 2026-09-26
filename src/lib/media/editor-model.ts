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

function id(prefix:string){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}

export function createEditorClip(input:{kind:EditorClipKind;url:string;name?:string}):EditorClip{
  return {id:id('clip'),kind:input.kind,url:input.url,name:String(input.name||'Clip').slice(0,120),trimStart:0,trimEnd:null,duration:input.kind==='image'?4:8,speed:1,fit:'cover',transition:'cut'};
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
  return {...project,width:Math.max(256,Math.min(1920,Math.round(project.width))),height:Math.max(256,Math.min(1920,Math.round(project.height))),fps:Math.max(12,Math.min(30,Math.round(project.fps))),caption:String(project.caption||'').slice(0,320),clips:project.clips.slice(0,20).map(c=>({...c,trimStart:Math.max(0,Number(c.trimStart)||0),trimEnd:c.trimEnd==null?null:Math.max(0,Number(c.trimEnd)||0),duration:Math.max(.25,Math.min(30,Number(c.duration)||4)),speed:Math.max(.25,Math.min(3,Number(c.speed)||1)}))};
}
