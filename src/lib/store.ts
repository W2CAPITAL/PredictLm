'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentRun, ChatMessage, MemoryNote, PanelId, ProviderId, StudioMode, WorkspaceFile } from './types';
import { repairLegacyEscapedNewlines } from './workspace-repair';

export type DeepThinkLevel = 'fast' | 'deep' | 'max';
export interface ProjectSnapshot {
  id:string;
  name:string;
  files:WorkspaceFile[];
  messages?:ChatMessage[];
  runs?:AgentRun[];
  createdAt:number;
}
export interface StudioBuild {
  id:string;
  name:string;
  files:Record<string,WorkspaceFile>;
  messages:ChatMessage[];
  runs:AgentRun[];
  createdAt:number;
  updatedAt:number;
}

const starterFiles: Record<string, WorkspaceFile> = {
  'App.tsx': { path:'App.tsx', language:'typescript', content:`export default function App(){const [started,setStarted]=useState(false);return <main className="app"><div className="shell"><span className="pill">Predict DeepThink · zero API</span><h1>O que você quer construir?</h1><p>Descreva calculadora, CRM, dashboard, tarefas, timer, conversor, loja ou outro app. O modo padrão não precisa de API nem Ollama.</p><button className="btn" onClick={()=>setStarted(true)}>{started?'Pronto. Use o agente à esquerda.':'Testar interação'}</button></div></main>}` },
  'styles.css': { path:'styles.css', language:'css', content:`:root{color-scheme:dark;--bg:#08090c;--text:#f4f4f5;--line:#292d37;--accent:#7c5cff}*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui;background:var(--bg);color:var(--text)}.shell{max-width:900px;margin:auto;padding:80px 24px}.pill{border:1px solid var(--line);padding:7px 10px;border-radius:999px;color:#9ca3af}.shell h1{font-size:clamp(42px,7vw,78px);letter-spacing:-.06em;line-height:.98;max-width:800px}.shell p{color:#929aaa;max-width:650px;line-height:1.6}.btn{border:0;border-radius:12px;padding:12px 15px;background:var(--accent);color:white;font-weight:750}` }
};

interface StudioState {
  files: Record<string, WorkspaceFile>;
  activeFile: string;
  messages: ChatMessage[];
  notes: MemoryNote[];
  runs: AgentRun[];
  snapshots: ProjectSnapshot[];
  builds: StudioBuild[];
  activeBuildId:string;
  provider: ProviderId;
  mode: StudioMode;
  activePanel: PanelId;
  isRunning: boolean;
  projectName: string;
  localEndpoint: string;
  localModel: string;
  deepThinkLevel: DeepThinkLevel;
  autoFallback: boolean;
  setProvider(v:ProviderId):void;
  setMode(v:StudioMode):void;
  setPanel(v:PanelId):void;
  setRunning(v:boolean):void;
  setProjectName(v:string):void;
  setLocalEndpoint(v:string):void;
  setLocalModel(v:string):void;
  setDeepThinkLevel(v:DeepThinkLevel):void;
  setAutoFallback(v:boolean):void;
  setActiveFile(v:string):void;
  mergeFiles(files:WorkspaceFile[]):void;
  replaceFiles(files:WorkspaceFile[]):void;
  addFile(path:string, content?:string, language?:string):void;
  removeFile(path:string):void;
  updateFile(path:string, content:string):void;
  addMessage(m:Omit<ChatMessage,'id'|'createdAt'>):void;
  addNote(n:Omit<MemoryNote,'id'|'createdAt'>):void;
  addRun(r:Omit<AgentRun,'id'|'createdAt'>):void;
  saveSnapshot(name?:string):void;
  restoreSnapshot(id:string):void;
  deleteSnapshot(id:string):void;
  newBuild(name?:string):void;
  switchBuild(id:string):void;
  deleteBuild(id:string):void;
  renameBuild(id:string,name:string):void;
  cloneProject():void;
  clearProject():void;
}

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const normalizeWorkspaceFile=(f:WorkspaceFile):WorkspaceFile=>/(^|\/)App\.(tsx|jsx|js|ts)$/.test(f.path)?{...f,content:repairLegacyEscapedNewlines(f.content)}:{...f};
const cloneFiles=(files:Record<string,WorkspaceFile>)=>Object.fromEntries(Object.entries(files).map(([k,f])=>[k,{...f}]));
const asMap=(incoming:WorkspaceFile[])=>Object.fromEntries(incoming.map(f=>{const next=normalizeWorkspaceFile(f);return [next.path,next]}));
const blankBuild=(name='Untitled App'):StudioBuild=>{
  const now=Date.now();
  return {id:id(),name,files:cloneFiles(starterFiles),messages:[],runs:[],createdAt:now,updatedAt:now};
};
const initialBuild=blankBuild();

function syncBuild(s:any, patch:Partial<Pick<StudioBuild,'name'|'files'|'messages'|'runs'>>){
  const updatedAt=Date.now();
  const builds=(s.builds||[]).map((b:StudioBuild)=>b.id===s.activeBuildId?{...b,...patch,updatedAt}:b);
  return {...patch,builds};
}

export const useStudio = create<StudioState>()(persist((set) => ({
  files:cloneFiles(initialBuild.files),
  activeFile:'App.tsx',
  messages:[],
  notes:[],
  runs:[],
  snapshots:[],
  builds:[initialBuild],
  activeBuildId:initialBuild.id,
  provider:'predict-core',
  mode:'build',
  activePanel:'agent',
  isRunning:false,
  projectName:initialBuild.name,
  localEndpoint:'http://127.0.0.1:11434',
  localModel:'qwen2.5-coder:1.5b',
  deepThinkLevel:'deep',
  autoFallback:true,
  setProvider:(provider)=>set({provider}),
  setMode:(mode)=>set({mode}),
  setPanel:(activePanel)=>set({activePanel}),
  setRunning:(isRunning)=>set({isRunning}),
  setProjectName:(projectName)=>set((s)=>syncBuild(s,{name:projectName})),
  setLocalEndpoint:(localEndpoint)=>set({localEndpoint}),
  setLocalModel:(localModel)=>set({localModel}),
  setDeepThinkLevel:(deepThinkLevel)=>set({deepThinkLevel}),
  setAutoFallback:(autoFallback)=>set({autoFallback}),
  setActiveFile:(activeFile)=>set({activeFile}),
  mergeFiles:(incoming)=>set((s)=>{
    const files={...s.files};
    incoming.forEach(f=>{const next=normalizeWorkspaceFile(f);files[next.path]=next});
    return {...syncBuild(s,{files}),activeFile:incoming[0]?.path||s.activeFile};
  }),
  replaceFiles:(incoming)=>set((s)=>{
    const files=asMap(incoming);
    return {...syncBuild(s,{files}),activeFile:incoming.find(f=>f.path==='App.tsx')?.path||incoming[0]?.path||''};
  }),
  addFile:(path,content='',language='text')=>set((s)=>{
    const files={...s.files,[path]:{path,content,language}};
    return {...syncBuild(s,{files}),activeFile:path};
  }),
  removeFile:(path)=>set((s)=>{
    const files={...s.files};delete files[path];
    const next=Object.keys(files)[0]||'';
    return {...syncBuild(s,{files}),activeFile:s.activeFile===path?next:s.activeFile};
  }),
  updateFile:(path,content)=>set((s)=>{
    const files={...s.files,[path]:{...(s.files[path]||{path,language:'text'}),content}};
    return syncBuild(s,{files});
  }),
  addMessage:(m)=>set((s)=>{
    const messages=[...s.messages,{...m,id:id(),createdAt:Date.now()}];
    return syncBuild(s,{messages});
  }),
  addNote:(n)=>set((s)=>({notes:[{...n,id:id(),createdAt:Date.now()},...s.notes].slice(0,160)})),
  addRun:(r)=>set((s)=>{
    const runs=[{...r,id:id(),createdAt:Date.now()},...s.runs].slice(0,100);
    return syncBuild(s,{runs});
  }),
  saveSnapshot:(name)=>set((s)=>{
    const snapshot:ProjectSnapshot={
      id:id(),
      name:name?.trim()||s.projectName||'Snapshot',
      files:Object.values(s.files).map(f=>({...f})),
      messages:s.messages.map(m=>({...m})),
      runs:s.runs.map(r=>({...r,steps:[...r.steps]})),
      createdAt:Date.now()
    };
    return {snapshots:[snapshot,...s.snapshots].slice(0,12),notes:[{id:id(),title:'Snapshot saved',body:snapshot.name+' · '+snapshot.files.length+' file(s).',tags:['snapshot','local'],kind:'decision',createdAt:Date.now()},...s.notes]};
  }),
  restoreSnapshot:(snapshotId)=>set((s)=>{
    const snap=s.snapshots.find(x=>x.id===snapshotId);
    if(!snap)return {};
    const files=asMap(snap.files.map(f=>({...f})));
    const messages=(snap.messages||[]).map(m=>({...m}));
    const runs=(snap.runs||[]).map(r=>({...r,steps:[...r.steps]}));
    return {
      ...syncBuild(s,{files,messages,runs,name:snap.name+' Restored'}),
      activeFile:files['App.tsx']?'App.tsx':Object.keys(files)[0]||''
    };
  }),
  deleteSnapshot:(snapshotId)=>set((s)=>({snapshots:s.snapshots.filter(x=>x.id!==snapshotId)})),
  newBuild:(name)=>set((s)=>{
    const build=blankBuild(name?.trim()||'Untitled App');
    return {
      builds:[build,...s.builds],
      activeBuildId:build.id,
      files:cloneFiles(build.files),
      activeFile:'App.tsx',
      messages:[],
      runs:[],
      projectName:build.name
    };
  }),
  switchBuild:(buildId)=>set((s)=>{
    const build=s.builds.find(x=>x.id===buildId);
    if(!build)return {};
    const files=cloneFiles(build.files);
    return {
      activeBuildId:build.id,
      files,
      activeFile:files['App.tsx']?'App.tsx':Object.keys(files)[0]||'',
      messages:build.messages.map(m=>({...m})),
      runs:build.runs.map(r=>({...r,steps:[...r.steps]})),
      projectName:build.name
    };
  }),
  deleteBuild:(buildId)=>set((s)=>{
    const rest=s.builds.filter(x=>x.id!==buildId);
    if(buildId!==s.activeBuildId)return {builds:rest};
    const next=rest[0]||blankBuild();
    const builds=rest.length?rest:[next];
    const files=cloneFiles(next.files);
    return {
      builds,
      activeBuildId:next.id,
      files,
      activeFile:files['App.tsx']?'App.tsx':Object.keys(files)[0]||'',
      messages:next.messages.map(m=>({...m})),
      runs:next.runs.map(r=>({...r,steps:[...r.steps]})),
      projectName:next.name
    };
  }),
  renameBuild:(buildId,name)=>set((s)=>{
    const clean=name.trim()||'Untitled App';
    return {
      builds:s.builds.map(b=>b.id===buildId?{...b,name:clean,updatedAt:Date.now()}:b),
      ...(buildId===s.activeBuildId?{projectName:clean}:{})
    };
  }),
  cloneProject:()=>set((s)=>{
    const now=Date.now();
    const build:StudioBuild={
      id:id(),
      name:(s.projectName||'Untitled App')+' Copy',
      files:cloneFiles(s.files),
      messages:[],
      runs:[],
      createdAt:now,
      updatedAt:now
    };
    return {
      builds:[build,...s.builds],
      activeBuildId:build.id,
      files:cloneFiles(build.files),
      activeFile:build.files['App.tsx']?'App.tsx':Object.keys(build.files)[0]||'',
      projectName:build.name,
      messages:[],
      runs:[],
      notes:[{id:id(),title:'Project cloned',body:'Nova build criada a partir de '+s.projectName+'.',tags:['clone','build','local'],kind:'decision',createdAt:now},...s.notes]
    };
  }),
  clearProject:()=>set((s)=>{
    const files=cloneFiles(starterFiles);
    return {...syncBuild(s,{files,messages:[],runs:[],name:'Untitled App'}),activeFile:'App.tsx'};
  })
}),{
  name:'predictlm-studio-v2',
  version:7,
  migrate:(persisted:any)=>{
    const next={...(persisted||{})};
    if(next.provider==='local') next.provider='predict-core';
    if(!next.deepThinkLevel) next.deepThinkLevel='deep';
    if(typeof next.autoFallback!=='boolean') next.autoFallback=true;
    if(!Array.isArray(next.snapshots)) next.snapshots=[];
    if(!Array.isArray(next.builds)||!next.builds.length){
      const now=Date.now();
      const build:StudioBuild={
        id:id(),
        name:String(next.projectName||'Untitled App'),
        files:next.files&&typeof next.files==='object'?next.files:cloneFiles(starterFiles),
        messages:Array.isArray(next.messages)?next.messages:[],
        runs:Array.isArray(next.runs)?next.runs:[],
        createdAt:now,
        updatedAt:now
      };
      next.builds=[build];
      next.activeBuildId=build.id;
    }
    if(!next.activeBuildId||!next.builds.some((b:StudioBuild)=>b.id===next.activeBuildId)){
      next.activeBuildId=next.builds[0].id;
    }
    next.builds=next.builds.map((b:StudioBuild)=>({...b,files:asMap(Object.values(b.files||{}))}));
    const active=next.builds.find((b:StudioBuild)=>b.id===next.activeBuildId)||next.builds[0];
    next.files=active.files||cloneFiles(starterFiles);
    next.messages=active.messages||[];
    next.runs=active.runs||[];
    next.projectName=active.name||'Untitled App';
    if(!next.activeFile||!next.files[next.activeFile])next.activeFile=next.files['App.tsx']?'App.tsx':Object.keys(next.files)[0]||'';
    return next;
  }
}));
