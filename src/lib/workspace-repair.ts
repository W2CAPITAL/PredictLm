import type { WorkspaceFile } from './types';

export function hasLegacyEscapedNewlines(code:string){
  return /function\\s+App\\(\\)\\{\\\\n/.test(String(code||''));
}

export function repairLegacyEscapedNewlines(code:string){
  const input=String(code||'');
  if(!hasLegacyEscapedNewlines(input))return input;
  let out='';
  let quote:string|null=null;
  let escaped=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(quote){
      out+=ch;
      if(escaped){escaped=false;continue;}
      if(ch==='\\\\'){escaped=true;continue;}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==="'"||ch==='"'||ch==='`'){quote=ch;out+=ch;continue;}
    if(ch==='\\\\'&&input[i+1]==='n'){out+='\\n';i++;continue;}
    out+=ch;
  }
  return out;
}

export function repairWorkspaceFiles(files:WorkspaceFile[]){
  return files.map(file=>/(^|\\/)App\\.(tsx|jsx|js|ts)$/.test(file.path)
    ? {...file,content:repairLegacyEscapedNewlines(file.content)}
    : file
  );
}
