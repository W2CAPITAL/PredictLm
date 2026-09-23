'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentRun, ChatMessage, MemoryNote, PanelId, ProviderId, StudioMode, WorkspaceFile } from './types';

const starterFiles: Record<string, WorkspaceFile> = {
  'App.tsx': { path:'App.tsx', language:'typescript', content:`export default function App(){return <main className="app"><div className="shell"><span className="pill">PredictLM Studio</span><h1>Descreva o que você quer construir.</h1><p>O Predict Core funciona sem API para starters e pode escalar para modelos locais ou externos.</p></div></main>}` },
  'styles.css': { path:'styles.css', language:'css', content:`body{margin:0;font-family:Inter,system-ui;background:#08090c;color:#f4f4f5}.shell{max-width:900px;margin:auto;padding:80px 24px}.pill{border:1px solid #292d37;padding:7px 10px;border-radius:999px;color:#9ca3af}h1{font-size:clamp(42px,7vw,78px);letter-spacing:-.06em;line-height:.98;max-width:800px}` }
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
  setProvider(v:ProviderId):void;
  setMode(v:StudioMode):void;
  setPanel(v:PanelId):void;
  setRunning(v:boolean):void;
  setProjectName(v:string):void;
  setLocalEndpoint(v:string):void;
  setLocalModel(v:string):void;
  setActiveFile(v:string):void;
  mergeFiles(files:WorkspaceFile[]):void;
  updateFile(path:string, content:string):void;
  addMessage(m:Omit<ChatMessage,'id'|'createdAt'>):void;
  addNote(n:Omit<MemoryNote,'id'|'createdAt'>):void;
  addRun(r:Omit<AgentRun,'id'|'createdAt'>):void;
  clearProject():void;
}

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export const useStudio = create<StudioState>()(persist((set) => ({
  files:starterFiles,
  activeFile:'App.tsx', messages:[], notes:[], runs:[], provider:'predict-core', mode:'build', activePanel:'agent', isRunning:false, projectName:'Untitled App', localEndpoint:'http://127.0.0.1:11434', localModel:'qwen2.5-coder:1.5b',
  setProvider:(provider)=>set({provider}), setMode:(mode)=>set({mode}), setPanel:(activePanel)=>set({activePanel}), setRunning:(isRunning)=>set({isRunning}), setProjectName:(projectName)=>set({projectName}), setLocalEndpoint:(localEndpoint)=>set({localEndpoint}), setLocalModel:(localModel)=>set({localModel}), setActiveFile:(activeFile)=>set({activeFile}),
  mergeFiles:(incoming)=>set((s)=>{const files={...s.files}; incoming.forEach(f=>{files[f.path]=f}); return {files, activeFile: incoming[0]?.path || s.activeFile};}),
  updateFile:(path,content)=>set((s)=>({files:{...s.files,[path]:{...(s.files[path]||{path,language:'text'}),content}}})),
  addMessage:(m)=>set((s)=>({messages:[...s.messages,{...m,id:id(),createdAt:Date.now()}]})),
  addNote:(n)=>set((s)=>({notes:[{...n,id:id(),createdAt:Date.now()},...s.notes].slice(0,120)})),
  addRun:(r)=>set((s)=>({runs:[{...r,id:id(),createdAt:Date.now()},...s.runs].slice(0,80)})),
  clearProject:()=>set({files:starterFiles,activeFile:'App.tsx',messages:[],runs:[],projectName:'Untitled App'})
}),{name:'predictlm-studio-v2'}));
