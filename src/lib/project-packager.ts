import type { WorkspaceFile } from './types';

function readSpec(files:WorkspaceFile[]){
  const spec=files.find(f=>f.path==='predict.spec.json');
  try{return spec?JSON.parse(spec.content):{}}catch{return {}}
}
function withReactImport(code:string){
  if(/^\s*import\s/m.test(code))return code;
  return "import React, { useEffect, useMemo, useRef, useState } from 'react';\n"+code;
}
function projectName(files:WorkspaceFile[]){
  const spec=readSpec(files);
  return String(spec?.spec?.title||'Predict App').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'predict-app';
}
function backendNeeded(intent:string,spec:any={}){
  const prompt=String(spec?.prompt||'');
  const features=Array.isArray(spec?.spec?.features)?spec.spec.features.join(' '):'';
  return ['crm','store'].includes(intent)||
    /backend|api|database|banco|postgres|supabase|firebase|auth|login|webhook|integra[cç][aã]o|integration|stripe|datajud|djen/i.test(prompt+' '+features);
}
function backendFiles(intent:string,spec:any={}):WorkspaceFile[]{
  if(!backendNeeded(intent,spec))return [];
  const entity=intent==='crm'?'leads':'orders';
  const seed=intent==='crm'
    ? JSON.stringify([{id:1,name:'Marina Costa',status:'Novo',value:2400},{id:2,name:'Rafael Lima',status:'Em análise',value:5200}],null,2)
    : JSON.stringify([],null,2);
  const server=[
    "import http from 'node:http';",
    "import fs from 'node:fs/promises';",
    "import { existsSync } from 'node:fs';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    "",
    "const __dirname=path.dirname(fileURLToPath(import.meta.url));",
    "const dataFile=path.join(__dirname,'data.json');",
    "const PORT=Number(process.env.PORT||8787);",
    "",
    "async function readData(){",
    "  if(!existsSync(dataFile))await fs.writeFile(dataFile,'[]');",
    "  return JSON.parse(await fs.readFile(dataFile,'utf8'));",
    "}",
    "async function writeData(rows){await fs.writeFile(dataFile,JSON.stringify(rows,null,2));}",
    "const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'});res.end(JSON.stringify(body));};",
    "",
    "http.createServer(async(req,res)=>{",
    "  if(req.method==='OPTIONS')return json(res,204,{});",
    "  const url=new URL(req.url||'/', 'http://localhost');",
    "  if(url.pathname==='/api/health')return json(res,200,{ok:true,service:'predict-backend'});",
    "  if(url.pathname==='/api/"+entity+"'&&req.method==='GET')return json(res,200,await readData());",
    "  if(url.pathname==='/api/"+entity+"'&&req.method==='POST'){",
    "    let raw='';for await(const chunk of req)raw+=chunk;",
    "    const body=JSON.parse(raw||'{}');const rows=await readData();",
    "    const item={id:Date.now(),...body,createdAt:new Date().toISOString()};",
    "    rows.unshift(item);await writeData(rows);return json(res,201,item);",
    "  }",
    "  const match=url.pathname.match(/^\\/api\\/"+entity+"\\/(\\d+)$/);",
    "  if(match&&req.method==='DELETE'){const id=Number(match[1]);const rows=(await readData()).filter(x=>x.id!==id);await writeData(rows);return json(res,200,{ok:true});}",
    "  return json(res,404,{error:'Not found'});",
    "}).listen(PORT,()=>console.log('Predict backend http://localhost:'+PORT));",
    ""
  ].join('\n');
  return [
    {path:'server/index.mjs',content:server,language:'javascript'},
    {path:'server/data.json',content:seed,language:'json'},
    {path:'src/lib/api.ts',content:"const API=import.meta.env.VITE_API_URL||'http://localhost:8787';\nexport async function api(path:string,init?:RequestInit){const r=await fetch(API+path,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});if(!r.ok)throw new Error('API '+r.status);return r.json()}\n",language:'typescript'}
  ];
}

export function buildRunnableProject(files:WorkspaceFile[]):WorkspaceFile[]{
  const spec=readSpec(files);
  const intent=String(spec?.spec?.intent||'generic');
  const app=files.find(f=>/(^|\/)App\.(tsx|jsx|ts|js)$/.test(f.path));
  const css=files.find(f=>/styles?\.css$/.test(f.path));
  const name=projectName(files);
  const backend=backendNeeded(intent,spec);
  const pkg={
    name,
    version:'1.0.0',
    private:true,
    type:'module',
    scripts:{
      dev:'vite',
      build:'vite build',
      preview:'vite preview',
      test:'vitest run',
      ...(backend?{server:'node server/index.mjs'}:{})
    },
    dependencies:{react:'^19.0.0','react-dom':'^19.0.0'},
    devDependencies:{
      '@vitejs/plugin-react':'^4.3.4',
      vite:'^6.0.0',
      vitest:'^3.0.0',
      jsdom:'^25.0.0',
      '@testing-library/react':'^16.1.0'
    }
  };
  const main=[
    "import React from 'react';",
    "import ReactDOM from 'react-dom/client';",
    "import App from './App';",
    "import './styles.css';",
    "ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);",
    ""
  ].join('\n');
  const test=[
    "import React from 'react';",
    "import { describe,it,expect } from 'vitest';",
    "import { render } from '@testing-library/react';",
    "import App from './App';",
    "describe('App',()=>{",
    "  it('renders without crashing',()=>{",
    "    const {container}=render(<App/>);",
    "    expect(container.firstChild).toBeTruthy();",
    "  });",
    "});",
    ""
  ].join('\n');
  const runme=[
    '# Run locally',
    '',
    '1. Install Node.js 20+.',
    '2. Run npm install.',
    '3. Run npm run dev.',
    ...(backend?['4. In another terminal, run npm run server.','','The frontend can use VITE_API_URL to reach the local backend.']:['','This project is frontend-only by design; no backend is required for its current feature set.']),
    '',
    'Run npm test for the smoke test and npm run build for a production build.'
  ].join('\n');

  const base:WorkspaceFile[]=[
    {path:'package.json',content:JSON.stringify(pkg,null,2),language:'json'},
    {path:'index.html',content:'<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Predict App</title></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>',language:'html'},
    {path:'src/main.jsx',content:main,language:'javascript'},
    {path:'src/App.jsx',content:withReactImport(app?.content||'export default function App(){return <main>Predict App</main>}'),language:'javascript'},
    {path:'src/styles.css',content:css?.content||'',language:'css'},
    {path:'src/App.test.jsx',content:test,language:'javascript'},
    {path:'vite.config.js',content:"import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({plugins:[react()],test:{environment:'jsdom'}});\n",language:'javascript'},
    {path:'.gitignore',content:'node_modules\ndist\n.env\n.DS_Store\n',language:'text'},
    {path:'.env.example',content:backend?'VITE_API_URL=http://localhost:8787\nPORT=8787\n':'# No environment variables are required for this app.\n',language:'text'},
    {path:'RUNME.md',content:runme,language:'markdown'}
  ];
  const preserved=files.filter(f=>
    ['predict.spec.json','ARCHITECTURE.md','IMPLEMENTATION.md','PRODUCTION_READINESS.md','README.md'].includes(f.path)||
    f.path.startsWith('src/domain/')||
    f.path.startsWith('src/integrations/')||
    f.path.startsWith('src/types/')||
    f.path.startsWith('server/integrations')
  );
  const merged=new Map<string,WorkspaceFile>();
  for(const file of [...base,...backendFiles(intent,spec),...preserved])merged.set(file.path,file);
  return Array.from(merged.values());
}

export function packagingSummary(files:WorkspaceFile[]){
  const spec=readSpec(files);
  const intent=String(spec?.spec?.intent||'generic');
  const backend=backendNeeded(intent,spec);
  return {
    intent,
    backend,
    frontend:'Vite + React',
    tests:'Vitest + Testing Library',
    runnable:true,
    backendReason:backend?'Persistence/shared records justify a server layer.':'The current feature set does not justify a server layer.'
  };
}
