import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRunnableProject } from '../src/lib/project-packager';

test('runnable package preserves TSX app path, aliases and external dependencies',()=>{
  const app=[
    "import { useState } from 'react';",
    "import { Search } from 'lucide-react';",
    "import Card from '@/components/Card';",
    "import './styles.css';",
    "type Props={title:string};",
    "export default function App(){const [n,setN]=useState(0);return <main><Card/><Search/><button onClick={()=>setN(n+1)}>{n}</button></main>}"
  ].join('\n');
  const files=[
    {path:'App.tsx',language:'typescript',content:app},
    {path:'styles.css',language:'css',content:'main{padding:1rem}'},
    {path:'src/components/Card.tsx',language:'typescript',content:"export default function Card(){return <section>Card</section>}"},
    {path:'predict.spec.json',language:'json',content:'{"spec":{"intent":"generic","title":"TSX App"}}'}
  ];
  const out=buildRunnableProject(files);
  const map=new Map(out.map(x=>[x.path,x.content]));
  assert.equal(map.get('App.tsx'),app);
  assert.ok(map.has('src/components/Card.tsx'));
  assert.match(map.get('src/main.tsx')||'',/from "\.\.\/App"/);
  assert.match(map.get('vite.config.ts')||'',/alias/);
  assert.match(map.get('tsconfig.json')||'',/"@\/\*"/);
  const pkg=JSON.parse(map.get('package.json')||'{}');
  assert.ok(pkg.dependencies['lucide-react']);
  assert.ok(pkg.devDependencies.typescript);
  assert.equal(pkg.scripts.build,'vite build');
});

test('runnable package carries declared workspace dependencies instead of replacing them',()=>{
  const files=[
    {path:'App.tsx',language:'typescript',content:"import { create } from 'zustand'; export default function App(){return <main>ok</main>}"},
    {path:'package.json',language:'json',content:JSON.stringify({dependencies:{zustand:'^5.0.0',zod:'^3.23.0'}})},
    {path:'predict.spec.json',language:'json',content:'{"spec":{"intent":"generic","title":"Deps"}}'}
  ];
  const out=buildRunnableProject(files);
  const pkg=JSON.parse(out.find(x=>x.path==='package.json')?.content||'{}');
  assert.equal(pkg.dependencies.zustand,'^5.0.0');
  assert.equal(pkg.dependencies.zod,'^3.23.0');
});
