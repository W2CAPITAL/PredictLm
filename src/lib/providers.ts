import type { WorkspaceFile } from './types';

const system = `You are PredictLM Studio, an expert software-building agent. Return ONLY valid JSON with keys explanation, plan, files. files is an array of {path,content,language}. Prefer complete working files, accessible UI, responsive layout, and minimal dependencies. Never include secrets.`;

function parse(content:string): { explanation:string; plan:string[]; files:WorkspaceFile[] } {
  const match = content.match(/\{[\s\S]*\}/);
  if(!match) throw new Error('O modelo não retornou JSON estruturado.');
  const data = JSON.parse(match[0]);
  return { explanation:String(data.explanation||'Alterações geradas.'), plan:Array.isArray(data.plan)?data.plan.map(String):[], files:Array.isArray(data.files)?data.files.filter((x:any)=>x?.path&&typeof x.content==='string').map((x:any)=>({path:String(x.path).replace(/^\//,''),content:x.content,language:String(x.language||'typescript')})):[] };
}

export async function runPuter(prompt:string, files:WorkspaceFile[]) {
  const mod = await import('@heyputer/puter.js');
  const response = await (mod.puter.ai.chat as any)([
    {role:'system',content:system},
    {role:'user',content:`Task: ${prompt}\n\nCurrent files:\n${JSON.stringify(files.slice(0,12).map(f=>({path:f.path,content:f.content.slice(0,9000)})))}`}
  ],{model:'x-ai/grok-build-0.1',temperature:0.25});
  const text = typeof response === 'string' ? response : response?.message?.content || response?.text || String(response);
  return parse(text);
}

export async function runLocal(prompt:string, files:WorkspaceFile[], endpoint:string, model:string) {
  const response = await fetch(`${endpoint.replace(/\/$/,'')}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:`Task: ${prompt}\nCurrent files: ${JSON.stringify(files.map(f=>({path:f.path,content:f.content.slice(0,5000)})))}`}],stream:false,format:'json'})});
  if(!response.ok) throw new Error(`Modelo local indisponível (${response.status}).`);
  const data = await response.json();
  return parse(data?.message?.content || data?.response || '');
}

export async function runServer(prompt:string, files:WorkspaceFile[], mode:string) {
  const response = await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,files,mode})});
  const data = await response.json();
  if(!response.ok) throw new Error(data?.error || 'Provider server indisponível.');
  return data;
}
