import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildRunnableProject } from '../../src/lib/project-packager';

const files=[
  {
    path:'App.tsx',
    language:'typescript',
    content:[
      "import { useState } from 'react';",
      "import { Search } from 'lucide-react';",
      "import Card from '@/components/Card';",
      "import './styles.css';",
      "type Status='idle'|'ready';",
      "export default function App(){",
      " const [status,setStatus]=useState<Status>('idle');",
      " return <main><Card/><Search/><button onClick={()=>setStatus('ready')}>{status}</button></main>;",
      "}"
    ].join('\n')
  },
  {path:'styles.css',language:'css',content:'main{font-family:system-ui;padding:24px}'},
  {path:'src/components/Card.tsx',language:'typescript',content:"export default function Card(){return <section>Build export smoke</section>}"},
  {path:'predict.spec.json',language:'json',content:JSON.stringify({spec:{intent:'generic',title:'PredictLM export smoke'}})}
];

const exported=buildRunnableProject(files);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'predictlm-export-'));
for(const file of exported){
  const dest=path.join(root,file.path);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,file.content);
}

try{
  execFileSync(process.platform==='win32'?'npm.cmd':'npm',['install','--no-audit','--no-fund'],{cwd:root,stdio:'inherit',timeout:180000});
  execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit',timeout:120000});
  if(!fs.existsSync(path.join(root,'dist','index.html')))throw new Error('Export build completed without dist/index.html');
  console.log(JSON.stringify({ok:true,files:exported.length,root},null,2));
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
