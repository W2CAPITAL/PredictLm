#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import os from 'node:os';

function run(command,args=[]){
  const result=spawnSync(command,args,{encoding:'utf8',windowsHide:true,timeout:8000});
  return {
    ok:result.status===0&&!result.error,
    status:typeof result.status==='number'?result.status:null,
    stdout:String(result.stdout||'').trim(),
    stderr:String(result.stderr||'').trim(),
    error:result.error?String(result.error.message||result.error):''
  };
}

function commandVersion(command,args=['--version']){
  const result=run(command,args);
  const first=(result.stdout||result.stderr).split(/\r?\n/).find(Boolean)||'';
  return {available:result.ok,version:first.slice(0,240),error:result.ok?'':result.error||result.stderr.slice(0,240)};
}

function ffmpegCapabilities(){
  const version=commandVersion('ffmpeg',['-version']);
  if(!version.available)return {available:false,version:'',filters:[],encoders:[]};
  const filtersText=run('ffmpeg',['-hide_banner','-filters']);
  const encodersText=run('ffmpeg',['-hide_banner','-encoders']);
  const filterNames=['chromakey','colorkey','despill','overlay','drawtext','palettegen','paletteuse','scale','crop'];
  const encoderNames=['libx264','libvpx-vp9','prores_ks','gif','aac'];
  return {
    available:true,
    version:version.version,
    filters:filterNames.filter(name=>new RegExp('\\b'+name+'\\b','i').test(filtersText.stdout+'\n'+filtersText.stderr)),
    encoders:encoderNames.filter(name=>new RegExp('\\b'+name+'\\b','i').test(encodersText.stdout+'\n'+encodersText.stderr))
  };
}

const grok=commandVersion('grok',['--version']);
const ffmpeg=ffmpegCapabilities();
const ffprobe=commandVersion('ffprobe',['-version']);
const report={
  ok:true,
  schema_version:'1',
  platform:{
    os:process.platform,
    release:os.release(),
    arch:process.arch,
    node:process.version
  },
  grok:{
    available:grok.available,
    version:grok.version,
    note:grok.available
      ?'Grok CLI detectado. A sessão/login continua pertencendo a este host local.'
      :'Grok CLI não detectado; o PredictLM hospedado não depende dele.'
  },
  xaiApi:{
    configured:Boolean(String(process.env.XAI_API_KEY||'').trim()),
    base:String(process.env.XAI_BASE_URL||'https://api.x.ai/v1'),
    searchModel:String(process.env.XAI_SEARCH_MODEL||'grok-4-1-fast')
  },
  ffmpeg,
  ffprobe:{available:ffprobe.available,version:ffprobe.version},
  recommendations:[]
};

if(!grok.available)report.recommendations.push('Para usar a sessão Grok local, instale o grok build CLI e faça login no próprio host.');
if(!ffmpeg.available)report.recommendations.push('Instale ffmpeg antes de solicitar chroma key, concat, watermark, GIF ou pós-processamento local.');
if(ffmpeg.available&&!ffmpeg.filters.includes('chromakey'))report.recommendations.push('Este build de ffmpeg não expõe chromakey; use outro build ou escolha um pipeline compatível.');
if(ffmpeg.available&&!ffmpeg.encoders.includes('libvpx-vp9'))report.recommendations.push('VP9 não foi detectado; transparência WebM pode exigir outro encoder/build.');
if(!report.xaiApi.configured)report.recommendations.push('XAI_API_KEY é opcional; sem ela, Research continua pelas demais fontes do PredictLM.');

process.stdout.write(JSON.stringify(report,null,2)+'\n');
