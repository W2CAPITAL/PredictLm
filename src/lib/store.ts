'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentRun, ChatMessage, MemoryNote, PanelId, ProviderId, StudioMode, WorkspaceFile } from './types';

export type DeepThinkLevel = 'fast' | 'deep' | 'max';

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
  cloneProject():void;
  clearProject():void;
}

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const asMap=(incoming:WorkspaceFile[])=>Object.fromEntries(incoming.map(f=>[f.path,f]));

export const useStudio = create<StudioState>()(persist((set) => ({
  files:starterFiles,
  activeFile:'App.tsx',
  messages:[],
  notes:[],
  runs:[],
  provider:'predict-core',
  mode:'build',
  activePanel:'agent',
  isRunning:false,
  projectName:'Untitled App',
  localEndpoint:'http://127.0.0.1:11434',
  localModel:'qwen2.5-coder:1.5b',
  deepThinkLevel:'deep',
  autoFallback:true,
  setProvider:(provider)=>set({provider}),
  setMode:(mode)=>set({mode}),
  setPanel:(activePanel)=>set({activePanel}),
  setRunning:(isRunning)=>set({isRunning}),
  setProjectName:(projectName)=>set({projectName}),
  setLocalEndpoint:(localEndpoint)=>set({localEndpoint}),
  setLocalModel:(localModel)=>set({localModel}),
  setDeepThinkLevel:(deepThinkLevel)=>set({deepThinkLevel}),
  setAutoFallback:(autoFallback)=>set({autoFallback}),
  setActiveFile:(activeFile)=>set({activeFile}),
  mergeFiles:(incoming)=>set((s)=>{const files={...s.files}; incoming.forEach(f=>{files[f.path]=f}); return {files,activeFile:incoming[0]?.path||s.activeFile};}),
  replaceFiles:(incoming)=>set(()=>({files:asMap(incoming),activeFile:incoming.find(f=>f.path==='App.tsx')?.path||incoming[0]?.path||''})),
  addFile:(path,content='',language='text')=>set((s)=>({files:{...s.files,[path]:{path,content,language}},activeFile:path})),
  removeFile:(path)=>set((s)=>{const files={...s.files};delete files[path];const next=Object.keys(files)[0]||'';return {files,activeFile:s.activeFile===path?next:s.activeFile};}),
  updateFile:(path,content)=>set((s)=>({files:{...s.files,[path]:{...(s.files[path]||{path,language:'text'}),content}}})),
  addMessage:(m)=>set((s)=>({messages:[...s.messages,{...m,id:id(),createdAt:Date.now()}]})),
  addNote:(n)=>set((s)=>({notes:[{...n,id:id(),createdAt:Date.now()},...s.notes].slice(0,160)})),
  addRun:(r)=>set((s)=>({runs:[{...r,id:id(),createdAt:Date.now()},...s.runs].slice(0,100)})),
  cloneProject:()=>set((s)=>({projectName:(s.projectName||'Untitled App')+' Copy',messages:[],runs:[],notes:[{id:id(),title:'Project cloned',body:'Local project snapshot duplicated. No Firebase or backend required.',tags:['clone','local'],kind:'decision',createdAt:Date.now()},...s.notes]})),
  clearProject:()=>set({files:starterFiles,activeFile:'App.tsx',messages:[],runs:[],projectName:'Untitled App'})
}),{
  name:'predictlm-studio-v2',
  version:4,
  migrate:(persisted:any)=>{
    const next={...(persisted||{})};
    if(next.provider==='local') next.provider='predict-core';
    if(!next.deepThinkLevel) next.deepThinkLevel='deep';
    if(typeof next.autoFallback!=='boolean') next.autoFallback=true;
    return next;
  }
}));
