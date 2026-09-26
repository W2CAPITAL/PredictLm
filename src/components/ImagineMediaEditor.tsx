'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,Download,Film,RefreshCw,Trash2,Upload} from 'lucide-react';
import {createEditorClip,createEditorProject,editorProjectDuration,touchEditorProject,type EditorClipKind,type EditorProject} from '@/lib/media/editor-model';
import {downloadEditorProject,renderEditorProjectToWebm} from '@/lib/media/browser-editor';
import {downloadBlob} from '@/lib/media/local-motion';

export function ImagineMediaEditor(props:{sourceUrl?:string;sourceKind?:EditorClipKind;width:number;height:number;caption?:string}){
  const [project,setProject]=useState<EditorProject>(()=>createEditorProject({width:props.width,height:props.height,sourceUrl:props.sourceUrl,sourceKind:props.sourceKind,caption:props.caption}));
  const [selected,setSelected]=useState(()=>project.clips[0]?.id||'');
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState('');
  const localUrls=useRef<string[]>([]);
  const lastSource=useRef(props.sourceUrl||'');

  useEffect(()=>{
    setProject(prev=>touchEditorProject(prev,{width:props.width,height:props.height,caption:prev.caption||String(props.caption||'').slice(0,320)}));
  },[props.width,props.height,props.caption]);

  useEffect(()=>{
    const source=String(props.sourceUrl||'');
    if(!source||source===lastSource.current)return;
    lastSource.current=source;
    const clip=createEditorClip({kind:props.sourceKind||'video',url:source,name:'Geração atual'});
    setProject(prev=>touchEditorProject(prev,{clips:[...prev.clips,clip].slice(-20)}));
    setSelected(clip.id);
  },[props.sourceUrl,props.sourceKind]);

  useEffect(()=>()=>{for(const url of localUrls.current)URL.revokeObjectURL(url)},[]);

  const clip=project.clips.find(x=>x.id===selected)||project.clips[0];
  const duration=useMemo(()=>editorProjectDuration(project),[project]);

  function patchClip(patch:Record<string,unknown>){
    if(!clip)return;
    setProject(prev=>touchEditorProject(prev,{clips:prev.clips.map(item=>item.id===clip.id?{...item,...patch}:item)}));
  }

  function move(delta:number){
    if(!clip)return;
    setProject(prev=>{
      const current=prev.clips.findIndex(item=>item.id===clip.id);
      const target=current+delta;
      if(current<0||target<0||target>=prev.clips.length)return prev;
      const clips=[...prev.clips];
      const [item]=clips.splice(current,1);
      clips.splice(target,0,item);
      return touchEditorProject(prev,{clips});
    });
  }

  function remove(){
    if(!clip)return;
    setProject(prev=>{
      const clips=prev.clips.filter(item=>item.id!==clip.id);
      setSelected(clips[0]?.id||'');
      return touchEditorProject(prev,{clips});
    });
  }

  function addFiles(files:FileList|null){
    if(!files?.length)return;
    const accepted=[];
    for(const file of Array.from(files).slice(0,8)){
      let kind:EditorClipKind|null=null;
      if(file.type.startsWith('video/'))kind='video';
      else if(file.type.startsWith('image/'))kind='image';
      if(!kind)continue;
      const url=URL.createObjectURL(file);
      localUrls.current.push(url);
      accepted.push(createEditorClip({kind,url,name:file.name}));
    }
    if(!accepted.length)return;
    setProject(prev=>touchEditorProject(prev,{clips:[...prev.clips,...accepted].slice(0,20)}));
    setSelected(accepted[0].id);
  }

  async function exportVideo(){
    setBusy(true);setProgress(0);setError('');
    try{
      const blob=await renderEditorProjectToWebm(project,setProgress);
      downloadBlob(blob,'predictlm-imagine-edit.webm');
    }catch(err:any){
      setError(String(err?.message||err||'Falha ao exportar.'));
    }finally{
      setBusy(false);
    }
  }

  async function naturalizeCaption(){
    const current=project.caption.trim();
    if(!current)return;
    try{
      const response=await fetch('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          prompt:'Reescreva esta legenda em pt-BR para soar natural e humana, mantendo exatamente fatos, nomes e sentido. Responda somente com a legenda.\n\n'+current,
          deep:false,
          messages:[]
        })
      });
      const data=await response.json().catch(()=>({}));
      if(response.ok&&typeof data?.content==='string'&&data.content.trim()){
        const caption=data.content.trim().replace(/^["“]|["”]$/g,'').slice(0,320);
        setProject(prev=>touchEditorProject(prev,{caption}));
      }
    }catch{}
  }

  const buttonStyle={border:'1px solid #303640',background:'#11151b',color:'inherit',borderRadius:8,padding:'7px 9px',fontSize:10,display:'flex',gap:5,alignItems:'center'} as const;

  return <section style={{margin:'14px 12px',border:'1px solid #252a32',borderRadius:14,background:'#0b0d11',overflow:'hidden'}}>
    <div style={{padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,borderBottom:'1px solid #20242b'}}>
      <div><small style={{color:'#858d9b'}}>Imagine · pós-produção local</small><b style={{display:'block',fontSize:13}}>Editor de vídeo</b></div>
      <div style={{display:'flex',gap:6,alignItems:'center',fontSize:10,color:'#8e96a4'}}><Film size={13}/>{project.clips.length} clips · {duration.toFixed(1)}s</div>
    </div>

    <div style={{padding:10,display:'grid',gap:10}}>
      <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
        <label style={{...buttonStyle,cursor:'pointer'}}><Upload size={12}/>Adicionar mídia<input hidden type="file" accept="image/*,video/*" multiple onChange={e=>addFiles(e.target.files)}/></label>
        <button type="button" onClick={exportVideo} disabled={busy||!project.clips.length} style={buttonStyle}>
          {busy?<RefreshCw className="spin" size={12}/>:<Download size={12}/>}
          {busy?'Exportando '+Math.round(progress*100)+'%':'Exportar WebM'}
        </button>
        <button type="button" onClick={()=>downloadEditorProject(project)} style={buttonStyle}>Salvar projeto JSON</button>
      </div>

      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:3}}>
        {project.clips.map((item,index)=><button key={item.id} onClick={()=>setSelected(item.id)} type="button" style={{minWidth:126,textAlign:'left',border:selected===item.id?'1px solid #b7c3ff':'1px solid #2a2f37',background:selected===item.id?'#171b28':'#101319',color:'inherit',borderRadius:9,padding:8}}>
          <small style={{color:'#818a98'}}>#{index+1} · {item.kind}</small>
          <b style={{display:'block',fontSize:10,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</b>
          <span style={{fontSize:9,color:'#7e8795'}}>{item.speed.toFixed(2)}× · {item.transition}</span>
        </button>)}
      </div>

      {clip?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,alignItems:'end'}}>
        <label style={{fontSize:9,color:'#8e96a4'}}>Início (s)<input type="number" min="0" step=".1" value={clip.trimStart} onChange={e=>patchClip({trimStart:Number(e.target.value)})} style={{width:'100%',marginTop:3}}/></label>
        <label style={{fontSize:9,color:'#8e96a4'}}>{clip.kind==='video'?'Fim (s, vazio=auto)':'Duração (s)'}<input type="number" min=".25" step=".1" value={clip.kind==='video'?(clip.trimEnd??''):clip.duration} onChange={e=>patchClip(clip.kind==='video'?{trimEnd:e.target.value===''?null:Number(e.target.value)}:{duration:Number(e.target.value)})} style={{width:'100%',marginTop:3}}/></label>
        <label style={{fontSize:9,color:'#8e96a4'}}>Velocidade<select value={clip.speed} onChange={e=>patchClip({speed:Number(e.target.value)})} style={{width:'100%',marginTop:3}}><option value=".5">0.5×</option><option value=".75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
        <label style={{fontSize:9,color:'#8e96a4'}}>Enquadramento<select value={clip.fit} onChange={e=>patchClip({fit:e.target.value})} style={{width:'100%',marginTop:3}}><option value="cover">Preencher</option><option value="contain">Conter</option></select></label>
        <label style={{fontSize:9,color:'#8e96a4'}}>Transição<select value={clip.transition} onChange={e=>patchClip({transition:e.target.value})} style={{width:'100%',marginTop:3}}><option value="cut">Corte</option><option value="fade">Fade</option></select></label>
        <label style={{fontSize:9,color:'#8e96a4'}}>Filtro<select value={project.filter} onChange={e=>setProject(prev=>touchEditorProject(prev,{filter:e.target.value as EditorProject['filter']}))} style={{width:'100%',marginTop:3}}><option value="none">Nenhum</option><option value="cinematic">Cinematic</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="mono">Mono</option><option value="vivid">Vivid</option></select></label>
        <div style={{display:'flex',gap:5}}>
          <button type="button" title="Mover antes" onClick={()=>move(-1)} style={buttonStyle}><ChevronLeft size={13}/></button>
          <button type="button" title="Mover depois" onClick={()=>move(1)} style={buttonStyle}><ChevronRight size={13}/></button>
          <button type="button" title="Remover" onClick={remove} style={buttonStyle}><Trash2 size={13}/></button>
        </div>
      </div>:<div style={{fontSize:10,color:'#7f8794'}}>Adicione uma imagem ou vídeo para iniciar a timeline.</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:7}}>
        <input value={project.caption} onChange={e=>setProject(prev=>touchEditorProject(prev,{caption:e.target.value.slice(0,320)}))} placeholder="Legenda opcional sobre o vídeo" style={{width:'100%'}}/>
        <button type="button" onClick={naturalizeCaption} disabled={!project.caption.trim()} style={buttonStyle}>Naturalizar</button>
      </div>

      <small style={{color:'#717a88'}}>Exportação gratuita no navegador: clips, cortes, velocidade, fade, filtros e legenda em WebM. O áudio original ainda não é mixado no render local; mídia externa precisa permitir leitura pelo navegador.</small>
      {error?<div style={{fontSize:10,color:'#ff9ea7'}}>{error}</div>:null}
    </div>
  </section>;
}
