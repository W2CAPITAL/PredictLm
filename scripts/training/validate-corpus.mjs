import fs from 'node:fs';
import path from 'node:path';

const file=path.join(process.cwd(),'training','corpus.jsonl');
if(!fs.existsSync(file)){
  console.error('training/corpus.jsonl not found. Run npm run train:sync first.');
  process.exit(1);
}
const lines=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean);
const rows=[];
for(let i=0;i<lines.length;i++){
  try{rows.push(JSON.parse(lines[i]))}
  catch{console.error('Invalid JSONL at line',i+1);process.exit(1)}
}
const forbidden=rows.filter(x=>x.use==='reference'||!x.license||/unverified|NOASSERTION/i.test(String(x.license)));
const tooLarge=rows.filter(x=>String(x.text||'').length>5000);
const empty=rows.filter(x=>!String(x.text||'').trim());
if(forbidden.length||tooLarge.length||empty.length){
  console.error({forbidden:forbidden.length,tooLarge:tooLarge.length,empty:empty.length});
  process.exit(1);
}
const bySource={};
for(const row of rows)bySource[row.source]=(bySource[row.source]||0)+1;
console.log(JSON.stringify({ok:true,rows:rows.length,sources:Object.keys(bySource).length,bySource},null,2));
