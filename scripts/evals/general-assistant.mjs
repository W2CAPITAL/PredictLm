import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const source=path.join(root,'evals','general-assistant-v1.json');
const outDir=path.join(root,'reports','evals');
const spec=JSON.parse(fs.readFileSync(source,'utf8'));

function key(id){
  return crypto.createHash('sha256').update(spec.version+'|'+id).digest('hex');
}
const ordered=[...spec.cases].sort((a,b)=>key(a.id).localeCompare(key(b.id)));
const prompts={
  benchmark:spec.name,
  version:spec.version,
  instructions:'Run each prompt in a fresh conversation unless the prompt itself provides context. Save only the final assistant answer. Do not show category or rubric to the answering model.',
  cases:ordered.map((x,index)=>({slot:index+1,id:x.id,prompt:x.prompt}))
};
const rubric={
  benchmark:spec.name,
  version:spec.version,
  scoring:spec.scoring,
  cases:spec.cases.map(x=>({id:x.id,category:x.category,criteria:x.criteria}))
};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'general-assistant-v1-prompts.json'),JSON.stringify(prompts,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'general-assistant-v1-rubric.json'),JSON.stringify(rubric,null,2)+'\n');
console.log('Blind benchmark generated:');
console.log(path.relative(root,path.join(outDir,'general-assistant-v1-prompts.json')));
console.log(path.relative(root,path.join(outDir,'general-assistant-v1-rubric.json')));
console.log('Cases:',ordered.length);
