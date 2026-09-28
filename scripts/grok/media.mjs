#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function fail(code,message,extra={}){
  process.stdout.write(JSON.stringify({ok:false,schema_version:'1',error:{code,message},...extra})+'\n');
  process.exit(1);
}

function parse(argv){
  const type=argv[0];
  if(!['image','video'].includes(type))fail('invalid_type','Use: image ou video.');
  const out={type,prompt:'',output:'',image:'',aspectRatio:'1:1',duration:6,resolution:'720p',approve:false,timeoutMs:type==='image'?180000:480000};
  for(let i=1;i<argv.length;i++){
    const a=argv[i];
    const value=()=>argv[++i]||'';
    if(a==='--prompt')out.prompt=value();
    else if(a==='--out')out.output=value();
    else if(a==='--image')out.image=value();
    else if(a==='--aspect-ratio')out.aspectRatio=value();
    else if(a==='--duration')out.duration=Math.max(1,Math.min(15,Number(value())||6));
    else if(a==='--resolution')out.resolution=value();
    else if(a==='--timeout-ms')out.timeoutMs=Math.max(30000,Math.min(900000,Number(value())||out.timeoutMs));
    else if(a==='--approve-media')out.approve=true;
    else if(a==='--help'){
      process.stdout.write('Usage: node scripts/grok/media.mjs image|video --prompt "..." --out file [--image source] [--aspect-ratio 16:9] [--duration 6] [--resolution 720p] --approve-media\n');
      process.exit(0);
    }else fail('unknown_flag','Flag desconhecida: '+a);
  }
  if(!out.prompt.trim())fail('missing_prompt','--prompt é obrigatório.');
  if(!out.output.trim())fail('missing_output','--out é obrigatório.');
  if(!out.approve)fail('approval_required','A execução local do Grok pode usar ferramentas. Repita com --approve-media para autorizar esta geração.');
  return out;
}

function executableExists(name){
  const r=spawnSync(name,['--version'],{encoding:'utf8',windowsHide:true,timeout:8000});
  return r.status===0&&!r.error;
}

function snapshot(dir){
  try{
    return new Map(fs.readdirSync(dir,{withFileTypes:true})
      .filter(x=>x.isFile())
      .map(x=>{
        const file=path.join(dir,x.name);
        const stat=fs.statSync(file);
        return [path.resolve(file),{mtime:stat.mtimeMs,size:stat.size}];
      }));
  }catch{return new Map()}
}

function mediaFilesChanged(before,dir,extensions){
  const after=snapshot(dir);
  const out=[];
  for(const [file,meta] of after){
    const old=before.get(file);
    if(!extensions.includes(path.extname(file).toLowerCase()))continue;
    if(!old||old.mtime!==meta.mtime||old.size!==meta.size)out.push({file,bytes:meta.size,mtime:meta.mtime});
  }
  return out.sort((a,b)=>b.mtime-a.mtime);
}

const opts=parse(process.argv.slice(2));
if(!executableExists('grok'))fail('grok_cli_missing','Grok CLI não foi detectado. Execute npm run grok:preflight para diagnóstico.');

const target=path.resolve(opts.output);
const outDir=path.dirname(target);
fs.mkdirSync(outDir,{recursive:true});
const before=snapshot(outDir);

if(opts.image){
  const source=path.resolve(opts.image);
  if(!fs.existsSync(source))fail('source_image_missing','Imagem de origem não encontrada: '+source);
}

const instruction=opts.type==='image'
  ?[
      'Use your built-in image_gen tool to generate exactly one requested image.',
      'User visual request: '+JSON.stringify(opts.prompt),
      'Aspect ratio: '+opts.aspectRatio+'.',
      'Save the final generated image exactly to: '+JSON.stringify(target)+'.',
      'Do not merely describe the image. Do not return success unless the file exists.',
      'If image_gen is unavailable, reply exactly: MEDIA_ERROR: image_gen unavailable.'
    ].join('\n')
  :[
      opts.image
        ?'Use your built-in image_to_video tool with this existing source image: '+JSON.stringify(path.resolve(opts.image))+'.'
        :'Create one source image with image_gen and then animate it with image_to_video.',
      'User motion/scene request: '+JSON.stringify(opts.prompt),
      'Duration seconds: '+opts.duration+'. Resolution: '+opts.resolution+'.',
      'Save the final generated video exactly to: '+JSON.stringify(target)+'.',
      'Do not treat a storyboard or image as the final video. Do not return success unless the video file exists.',
      'If image_to_video is unavailable, reply exactly: MEDIA_ERROR: image_to_video unavailable.'
    ].join('\n');

const started=Date.now();
const run=spawnSync('grok',['-p',instruction,'--always-approve'],{
  cwd:outDir,
  encoding:'utf8',
  windowsHide:true,
  timeout:opts.timeoutMs,
  maxBuffer:8*1024*1024
});

if(run.error&&String(run.error.code||'')==='ETIMEDOUT')fail('timeout','Grok CLI excedeu o timeout sem artefato validado.');
const agentText=String(run.stdout||'')+'\n'+String(run.stderr||'');
if(/MEDIA_ERROR:/i.test(agentText))fail('media_tool_unavailable',(agentText.match(/MEDIA_ERROR:\s*(.*)/i)||[])[1]||'Ferramenta de mídia indisponível.');

let file=target;
if(!fs.existsSync(file)){
  const extensions=opts.type==='image'?['.jpg','.jpeg','.png','.webp']:['.mp4','.mov','.webm','.m4v'];
  file=mediaFilesChanged(before,outDir,extensions)[0]?.file||'';
}
if(!file||!fs.existsSync(file))fail('no_media_produced','O Grok CLI terminou sem produzir um arquivo de mídia verificável.',{exitCode:run.status});

const stat=fs.statSync(file);
if(stat.size<1024)fail('invalid_media_file','O arquivo produzido é pequeno demais para ser tratado como mídia válida.',{file,bytes:stat.size});

process.stdout.write(JSON.stringify({
  ok:true,
  schema_version:'1',
  via:'grok-cli-session',
  type:opts.type,
  file:path.resolve(file),
  bytes:stat.size,
  elapsed_ms:Date.now()-started,
  params:opts.type==='image'
    ?{prompt:opts.prompt,aspect_ratio:opts.aspectRatio}
    :{prompt:opts.prompt,source_image:opts.image?path.resolve(opts.image):null,duration:opts.duration,resolution:opts.resolution}
})+'\n');
