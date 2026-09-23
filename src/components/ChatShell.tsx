'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Brain, Code2, FolderOpen, Globe2, Image as ImageIcon, Library, Menu, PanelLeft, Plus, Search, Send, Sparkles, X, Zap } from 'lucide-react';
import { useAssistantStore } from '@/lib/assistant-store';
import { answerLocally, browserCapabilities, loadNeuralModel, neuralStatus, type NeuralTier } from '@/lib/browser-brain';

interface Props{
  onOpenBuild:()=>void;
  onOpenMedia?:()=>void;
  onOpenResearch?:()=>void;
  onOpenPlugins?:()=>void;
}

export function ChatShell({onOpenBuild,onOpenMedia,onOpenResearch,onOpenPlugins}:Props){
  const s=useAssistantStore();
  const active=s.sessions.find(x=>x.id===s.activeId)||s.sessions[0];
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [sidebar,setSidebar]=useState(true);
  const [screen,setScreen]=useState<'chat'|'library'>('chat');
  const [searching,setSearching]=useState(false);
  const [search,setSearch]=useState('');
  const [plusOpen,setPlusOpen]=useState(false);
  const [modelMenu,setModelMenu]=useState(false);
  const [loadState,setLoadState]=useState<{tier:NeuralTier;progress:number|null;status:string}|null>(null);
  const [modelError,setModelError]=useState('');
  const bottom=useRef<HTMLDivElement>(null);
  const caps=useMemo(()=>typeof window==='undefined'?{native:false,webgpu:false,memory:0,cores:0,recommended:'lite' as NeuralTier}:browserCapabilities(),[]);
  const neural=neuralStatus();

  const visibleSessions=s.sessions.filter(chat=>chat.title.toLowerCase().includes(search.toLowerCase()));

  async function webContext(query:string){
    if(!s.webEnabled)return {text:'',sources:[] as any[]};
    try{
      const r=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,limit:6})});
      const data=await r.json();
      if(!r.ok)return {text:'',sources:[]};
      const items=[...(data.web||[]),...(data.news||[])].slice(0,6);
      const text=items.map((x:any,i:number)=>'WEB['+(i+1)+'] '+x.title+' — '+x.description+' URL: '+x.url).join('\n');
      return {text,sources:items.map((x:any)=>({title:x.title,source:x.url}))};
    }catch{return {text:'',sources:[]}}
  }

  async function send(){
    const prompt=input.trim();
    if(!prompt||busy)return;
    setInput('');
    setScreen('chat');
    s.addMessage({role:'user',content:prompt});
    setBusy(true);
    setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),20);
    try{
      const web=await webContext(prompt);
      const messages=(active?.messages||[]).slice(-12).map(m=>({role:m.role,content:m.content}));
      const augmented=web.text?prompt+'\n\nUse estas fontes atuais quando forem relevantes:\n'+web.text:prompt;
      let reply=await answerLocally(augmented,messages,{preferNative:true,knowledge:s.deepThink});
      if(web.sources.length&&reply.engine==='knowledge'){
        reply={
          ...reply,
          content:'Encontrei fontes atuais sobre isso:\n\n'+web.sources.map((x:any,i:number)=>(i+1)+'. **'+x.title+'** — '+x.source).join('\n\n')+'\n\nPosso sintetizar melhor com Neural Local ativado.',
          sources:web.sources
        };
      }else if(web.sources.length){
        reply.sources=[...web.sources,...(reply.sources||[])].slice(0,8);
      }
      s.addMessage({role:'assistant',content:reply.content,engine:reply.engine,sources:reply.sources});
    }catch(err:any){
      s.addMessage({role:'assistant',content:'Não consegui concluir esta resposta: '+(err?.message||'erro desconhecido')+'.'});
    }finally{
      setBusy(false);
      setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),30);
    }
  }

  async function enableNeural(tier:NeuralTier){
    setModelMenu(false);setModelError('');setLoadState({tier,progress:null,status:'iniciando'});
    try{
      await loadNeuralModel(tier,p=>setLoadState({tier,progress:p.progress,status:p.status}));
      setLoadState(null);
    }catch(err:any){setLoadState(null);setModelError(err?.message||'Falha ao carregar modelo local');}
  }

  function openChat(id?:string){
    if(id)s.setActive(id);
    setScreen('chat');
  }

  const hasMessages=!!active?.messages.length;
  const modeLabel=neural.loaded?'Local '+(neural.tier==='smart'?'Smart':'Lite'):(s.deepThink?'Deep':'Fast');

  return <div className={'grok-shell '+(sidebar?'sidebar-open':'sidebar-closed')}>
    <aside className="grok-sidebar">
      <div className="grok-sidebar-top">
        <button className="grok-logo" onClick={()=>{s.createChat();setScreen('chat')}} title="Nova conversa"><Sparkles size={20}/></button>
        <div className="grok-top-icons">
          <button onClick={()=>setSearching(v=>!v)} title="Buscar"><Search size={18}/></button>
          <button onClick={()=>setSidebar(false)} title="Recolher sidebar"><PanelLeft size={18}/></button>
        </div>
      </div>

      {searching&&<div className="grok-search"><Search size={14}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conversas"/></div>}

      <nav className="grok-nav">
        <button className={screen==='chat'?'active':''} onClick={()=>openChat()}><span><Send size={16}/></span>Chat</button>
        <button onClick={onOpenBuild}><span><Code2 size={16}/></span>Build</button>
        <button onClick={onOpenMedia}><span><ImageIcon size={16}/></span>Imagine</button>
        <button className={screen==='library'?'active':''} onClick={()=>setScreen('library')}><span><Library size={16}/></span>Library</button>
        <button onClick={onOpenResearch}><span><Globe2 size={16}/></span>Research</button>
      </nav>

      <div className="grok-history-label">Recentes</div>
      <div className="grok-history">{visibleSessions.map(chat=><button key={chat.id} className={chat.id===s.activeId&&screen==='chat'?'active':''} onClick={()=>openChat(chat.id)} title={chat.title}>{chat.title}</button>)}</div>

      <div className="grok-sidebar-bottom">
        <button onClick={onOpenPlugins}><FolderOpen size={16}/> Plugins</button>
        <div className="grok-profile"><div>P</div><span><b>Predict Local</b><small>private · local-first</small></span></div>
      </div>
    </aside>

    <main className="grok-main">
      {!sidebar&&<button className="grok-reopen" onClick={()=>setSidebar(true)}><Menu size={18}/></button>}
      <div className="grok-status"><span className="private-dot"/> Private</div>

      {screen==='library'?<LibraryScreen sessions={s.sessions} openChat={openChat}/>:
      !hasMessages?<section className="grok-home">
        <h1>O que vamos explorar?</h1>
        <Composer value={input} setValue={setInput} send={send} busy={busy} modeLabel={modeLabel} web={s.webEnabled} setWeb={s.setWebEnabled} deep={s.deepThink} setDeep={s.setDeepThink} plusOpen={plusOpen} setPlusOpen={setPlusOpen} modelMenu={modelMenu} setModelMenu={setModelMenu} enableNeural={enableNeural} caps={caps} neural={neural} onOpenBuild={onOpenBuild} onOpenResearch={onOpenResearch} onOpenMedia={onOpenMedia}/>
        <button className="grok-build-card" onClick={onOpenBuild}><div className="build-card-icon"><Code2 size={21}/></div><div><b>Build Mode</b><span>Crie sites, apps, sistemas e dashboards sem sair do PredictLM.</span></div><strong>Experimentar</strong></button>
        <div className="grok-home-foot"><span className="private-dot"/> Sem API obrigatória · memória local · projeto persistente</div>
      </section>:
      <section className="grok-conversation-wrap">
        <div className="grok-conversation">{active.messages.map(m=><article className={'grok-message '+m.role} key={m.id}><div className="grok-avatar">{m.role==='assistant'?<Sparkles size={14}/>:<span>EU</span>}</div><div className="grok-message-body"><div className="grok-message-meta"><b>{m.role==='assistant'?'PredictLM':'Você'}</b>{m.engine&&<span>{m.engine}</span>}</div><div className="grok-message-text">{renderText(m.content)}</div>{m.sources?.length?<details className="grok-sources"><summary>{m.sources.length} fontes/contextos</summary>{m.sources.map((src,i)=><div key={i}><b>{src.title}</b><span>{src.source}</span></div>)}</details>:null}</div></article>)}{busy&&<article className="grok-message assistant"><div className="grok-avatar"><Sparkles size={14}/></div><div className="grok-message-body"><div className="grok-message-meta"><b>PredictLM</b><span>thinking</span></div><div className="grok-thinking"><i/><i/><i/> analisando contexto</div></div></article>}<div ref={bottom}/></div>
        <div className="grok-bottom-composer"><Composer compact value={input} setValue={setInput} send={send} busy={busy} modeLabel={modeLabel} web={s.webEnabled} setWeb={s.setWebEnabled} deep={s.deepThink} setDeep={s.setDeepThink} plusOpen={plusOpen} setPlusOpen={setPlusOpen} modelMenu={modelMenu} setModelMenu={setModelMenu} enableNeural={enableNeural} caps={caps} neural={neural} onOpenBuild={onOpenBuild} onOpenResearch={onOpenResearch} onOpenMedia={onOpenMedia}/></div>
      </section>}

      {loadState&&<div className="grok-model-load"><div><b>Carregando {loadState.tier}</b><span>{loadState.status}</span></div><strong>{loadState.progress!=null?Math.round(loadState.progress)+'%':'…'}</strong></div>}
      {modelError&&<div className="grok-model-error">{modelError}<button onClick={()=>setModelError('')}><X size={12}/></button></div>}
    </main>
  </div>
}

function Composer(props:any){
  const {value,setValue,send,busy,modeLabel,web,setWeb,deep,setDeep,plusOpen,setPlusOpen,modelMenu,setModelMenu,enableNeural,caps,neural,onOpenBuild,onOpenResearch,onOpenMedia,compact}=props;
  return <div className={'grok-composer-shell '+(compact?'compact':'')}>
    <textarea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Pergunte qualquer coisa — ou use Build Mode para criar apps"/>
    <div className="grok-composer-actions">
      <div className="grok-plus-wrap"><button className="grok-plus" onClick={()=>setPlusOpen((v:boolean)=>!v)}><Plus size={18}/></button>{plusOpen&&<div className="grok-plus-menu"><button onClick={onOpenBuild}><Code2 size={14}/><span><b>Build Mode</b><small>Continuar ou criar aplicativo</small></span></button><button onClick={onOpenResearch}><Globe2 size={14}/><span><b>Research</b><small>Pesquisar fontes atuais</small></span></button><button onClick={onOpenMedia}><ImageIcon size={14}/><span><b>Imagine</b><small>Abrir Media Studio</small></span></button></div>}</div>
      <div className="grok-composer-right">
        <button className={web?'active':''} onClick={()=>setWeb(!web)}><Globe2 size={13}/>Web</button>
        <button className={deep?'active':''} onClick={()=>setDeep(!deep)}><Brain size={13}/>{deep?'Deep':'Fast'}</button>
        <div className="grok-model-wrap"><button onClick={()=>setModelMenu((v:boolean)=>!v)}><Zap size={13}/>{modeLabel}</button>{modelMenu&&<div className="grok-model-menu"><div><b>Neural Local</b><span>{caps.webgpu?'WebGPU detectado':'WASM disponível para Lite'}</span></div><button onClick={()=>enableNeural('lite')}><b>Qwen Lite</b><span>Mais leve para PC de escritório</span></button><button disabled={!caps.webgpu} onClick={()=>enableNeural('smart')}><b>Qwen Smart</b><span>Mais qualidade com WebGPU</span></button>{neural.loaded&&<small>Modelo local ativo no navegador.</small>}</div>}</div>
        <button className="grok-send" onClick={send} disabled={!value.trim()||busy}><Send size={17}/></button>
      </div>
    </div>
  </div>
}

function LibraryScreen({sessions,openChat}:{sessions:any[];openChat:(id:string)=>void}){
  return <section className="grok-library"><div><span>Library</span><h1>Suas conversas</h1><p>Histórico local do PredictLM.</p></div><div className="grok-library-grid">{sessions.map(chat=><button key={chat.id} onClick={()=>openChat(chat.id)}><Sparkles size={16}/><b>{chat.title}</b><span>{chat.messages.length} mensagens</span></button>)}</div></section>
}

function renderText(text:string){
  const parts=text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<React.Fragment key={i}>{part}</React.Fragment>)}</>;
}
