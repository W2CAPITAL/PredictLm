import type { WorkspaceFile } from './types';

export interface KnowledgeNode {
  id: string;
  label: string;
  kind: 'ui' | 'logic' | 'style' | 'test' | 'docs' | 'config' | 'api';
  size: number;
}
export interface KnowledgeEdge { from: string; to: string; type: 'imports'; }
export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  orphanCount: number;
}

function kindFor(path:string): KnowledgeNode['kind'] {
  if (/api\//i.test(path)) return 'api';
  if (/\.(css|scss|sass|less)$/.test(path)) return 'style';
  if (/(test|spec|__tests__)/i.test(path)) return 'test';
  if (/\.(md|mdx)$/.test(path)) return 'docs';
  if (/(config|package\.json|tsconfig|vite|next\.)/i.test(path)) return 'config';
  if (/\.(tsx|jsx)$/.test(path)) return 'ui';
  return 'logic';
}
function normalize(parts:string[]){
  const out:string[]=[];
  for(const p of parts){ if(!p||p==='.') continue; if(p==='..') out.pop(); else out.push(p); }
  return out.join('/');
}
function resolveImport(from:string, target:string, all:Set<string>){
  if(!target.startsWith('.')) return null;
  const base=from.split('/'); base.pop();
  const stem=normalize([...base,...target.split('/')]);
  const candidates=[stem,stem+'.ts',stem+'.tsx',stem+'.js',stem+'.jsx',stem+'.json',stem+'/index.ts',stem+'/index.tsx',stem+'/index.js',stem+'/index.jsx'];
  return candidates.find(c=>all.has(c))||null;
}

export function buildKnowledgeGraph(files: WorkspaceFile[]): KnowledgeGraph {
  const nodes=files.map(f=>({id:f.path,label:f.path.split('/').pop()||f.path,kind:kindFor(f.path),size:f.content.length}));
  const all=new Set(files.map(f=>f.path));
  const edges:KnowledgeEdge[]=[];
  const seen=new Set<string>();
  const importRe=/(?:import[\s\S]*?from\s*|import\s*\(|require\s*\()\s*['"`]([^'"`]+)['"`]/g;
  for(const file of files){
    let match:RegExpExecArray|null;
    while((match=importRe.exec(file.content))){
      const to=resolveImport(file.path,match[1],all);
      if(to){
        const key=file.path+'>'+to;
        if(!seen.has(key)){seen.add(key);edges.push({from:file.path,to,type:'imports'});}
      }
    }
  }
  const connected=new Set(edges.flatMap(e=>[e.from,e.to]));
  return {nodes,edges,orphanCount:nodes.filter(n=>!connected.has(n.id)).length};
}
