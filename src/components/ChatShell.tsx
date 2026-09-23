'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Bot, Brain, Code2, Globe2, Menu, Plus, Send, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { useAssistantStore } from '@/lib/assistant-store';
import { answerLocally, browserCapabilities, loadNeuralModel, neuralStatus, type NeuralTier } from '@/lib/browser-brain';

export function ChatShell({onOpenBuild}:{onOpenBuild:()=>void}){
  const s=useAssistantStore();
  const active=s.sessions.find(x=>x.id===s.activeId)||s.sessions[0];
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [sidebar,setSidebar]=useState(true);
  const [modelMenu,setModelMenu]=useState(false);
  const [loadState,setLoadState]=useState<{tier:NeuralTier;progress:number|null;status:string}|null>(null);
  const [modelError,setModelError]=useState('');
  const bottom=useRef<HTMLDivElement>(null);
  const caps=useMemo(()=>typeof window==='undefined'?{native:false,webgpu:false,memory:0,cores:0,recommended:'lite' as NeuralTier}:browserCapabilities(),[]);
  const neural=neuralStatus();

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
          content:'Encontrei estas fontes atuais sobre o assunto:\n\n'+web.sources.map((x:any,i:number)=>(i+1)+'. **'+x.title+'** — '+x.source).join('\n\n')+'\n\nAtive **Neural Local** para eu sintetizar essas fontes em uma resposta mais natural, sem usar API de inferência.',
          sources:web.sources
        };
      }else if(web.sources.length){
        reply.sources=[...web.sources,...(reply.sources||[])].slice(0,8);
      }
      s.addMessage({role:'assistant',content:reply.content,engine:reply.engine,sources:reply.sources});
    }catch(err:any){
      s.addMessage({role:'assistant',content:'Não consegui concluir esta resposta: '+(err?.message||'erro desconhecido')+'. O Chat continua disponível pelo motor local.'});
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

  const hasMessages=!!active?.messages.length;
  return <div className={'chat-surface '+(sidebar?'sidebar-open':'sidebar-closed')}>
    <aside className={'chat-sidebar '+(sidebar?'open':'closed')}>
      <div className="chat-side-head"><div className="chat-brand"><span className="brand-orb"><Sparkles size={15}/></span><b>PredictLM</b></div><button onClick={()=>setSidebar(false)} className="mobile-close"><X size={16}/></button></div>
      <button className="new-chat" onClick={s.createChat}><Plus size={15}/> Nova conversa</button>
      <div className="session-list">{s.sessions.map(chat=><button key={chat.id} className={chat.id===s.activeId?'active':''} onClick={()=>s.setActive(chat.id)}><span>{chat.title}</span><small>{chat.messages.length} msgs</small></button>)}</div>
      <div className="chat-side-bottom">
        <button onClick={onOpenBuild}><Code2 size={15}/><span>Developer / Build</span></button>
        <button onClick={()=>s.clearActive()}><Trash2 size={15}/><span>Limpar conversa</span></button>
      </div>
    </aside>

    <main className="chat-main">
      <header className="chat-header">
        <div className="chat-header-left"><button className="header-icon" onClick={()=>setSidebar(v=>!v)}><Menu size={17}/></button><div><b>{active?.title||'Nova conversa'}</b><span>assistente geral</span></div></div>
        <div className="surface-switch"><button className="active">Chat</button><button onClick={onOpenBuild}>Build</button></div>
        <div className="chat-header-actions">
          <button className={s.webEnabled?'active':''} onClick={()=>s.setWebEnabled(!s.webEnabled)} title="Pesquisa web"><Globe2 size={14}/> Web</button>
          <button className={s.deepThink?'active':''} onClick={()=>s.setDeepThink(!s.deepThink)} title="Contexto e knowledge packs"><Brain size={14}/> DeepThink</button>
          <div className="model-picker">
            <button className={neural.loaded||caps.native?'neural-on':''} onClick={()=>setModelMenu(v=>!v)}><Zap size={14}/>{neural.loaded?'Neural '+neural.tier:caps.native?'Browser AI':'Neural Local'}</button>
            {modelMenu&&<div className="model-menu">
              <div><b>Inferência sem API</b><span>{caps.webgpu?'WebGPU detectado':'Sem WebGPU; Lite pode usar WASM'}</span></div>
              <button onClick={()=>enableNeural('lite')}><b>Qwen Lite</b><span>~0,4 GB · melhor para PC fraco</span></button>
              <button onClick={()=>enableNeural('smart')} disabled={!caps.webgpu}><b>Qwen Smart</b><span>~1 GB · melhor qualidade · WebGPU</span></button>
            </div>}
          </div>
        </div>
      </header>

      <section className="chat-scroll">
        {!hasMessages?<div className="chat-welcome"><div className="welcome-mark"><Sparkles size={25}/></div><h1>Como posso ajudar?</h1><p>Converse normalmente. Para criar ou alterar um aplicativo, mude para <b>Build</b> quando quiser.</p><div className="chat-starters">
          <button onClick={()=>setInput('Explique como funciona um agente de IA moderno')}><Brain/>Explique um assunto</button>
          <button onClick={()=>setInput('Pesquise as melhores práticas atuais para agentes de código')}><Globe2/>Pesquisar na web</button>
          <button onClick={()=>setInput('Me ajude a estruturar uma aplicação SaaS do zero')}><Bot/>Planejar um projeto</button>
          <button onClick={onOpenBuild}><Code2/>Criar um aplicativo</button>
        </div><div className="engine-note"><span className="status-dot"/>Chat funciona sem chave de API. Neural Local é opcional e roda no navegador.</div></div>:
        <div className="conversation">{active.messages.map(m=><article className={'chat-message '+m.role} key={m.id}><div className="msg-avatar">{m.role==='assistant'?<Sparkles size={14}/>:<span>EU</span>}</div><div className="msg-content"><div className="msg-meta"><b>{m.role==='assistant'?'PredictLM':'Você'}</b>{m.engine&&<span>{m.engine}</span>}</div><div className="msg-text">{renderText(m.content)}</div>{m.sources?.length?<details className="msg-sources"><summary>{m.sources.length} fontes/contextos</summary>{m.sources.map((src,i)=><div key={i}><b>{src.title}</b><span>{src.source}</span></div>)}</details>:null}</div></article>)}{busy&&<article className="chat-message assistant"><div className="msg-avatar"><Sparkles size={14}/></div><div className="msg-content"><div className="msg-meta"><b>PredictLM</b><span>thinking</span></div><div className="chat-thinking"><i/><i/><i/> analisando contexto</div></div></article>}<div ref={bottom}/></div>}
      </section>

      <footer className="chat-composer-wrap">
        {loadState&&<div className="model-load"><div><b>Carregando {loadState.tier}</b><span>{loadState.status}</span></div><strong>{loadState.progress!=null?Math.round(loadState.progress)+'%':'…'}</strong></div>}
        {modelError&&<div className="model-error">{modelError}</div>}
        <div className="chat-composer"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Pergunte qualquer coisa..." rows={1}/><button onClick={send} disabled={!input.trim()||busy}><Send size={16}/></button></div>
        <div className="composer-meta"><span>{s.webEnabled?'Web ligado':'Web desligado'}</span><span>·</span><span>{s.deepThink?'DeepThink ligado':'DeepThink simples'}</span><span>·</span><span>{neural.loaded?'neural local ativo':caps.native?'browser AI disponível':'knowledge engine ativo'}</span></div>
      </footer>
    </main>
  </div>
}

function renderText(text:string){
  const parts=text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<React.Fragment key={i}>{part}</React.Fragment>)}</>;
}
