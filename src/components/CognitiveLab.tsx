'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Activity,ArrowLeft,Brain,Bug,Database,RotateCcw,Send,ThumbsDown,ThumbsUp,Upload} from 'lucide-react';
import {
  advanceCognitiveWorkspace,
  applyCognitiveOutcome,
  applyMappedSubsetEvidence,
  captureConversationMemory,
  cognitiveDirectRecall,
  cognitivePromptContext,
  createCognitiveState,
  type CognitiveState
} from '@/lib/cognitive/cognitive-workspace';
import {loadCognitiveState,resetCognitiveState,saveCognitiveState} from '@/lib/cognitive/cognitive-memory';
import {
  parseFlyWireConnectionsCsv,
  parseH01EdgeSubsetCsv,
  summarizeConnectomeEdges
} from '@/lib/cognitive/connectome-import';
import {FLYWIRE_FAFB_V783,H01_HUMAN_CORTEX} from '@/lib/cognitive/connectome-provenance';
import {COGNITIVE_FUNCTIONAL_MAP} from '@/lib/cognitive/functional-map';
import {frankPublicMentalState} from '@/lib/cognitive/frank-core';

type Msg={role:'user'|'assistant';content:string;status?:'partial'|'done'|'error'};
export type CognitiveChatMode='dual'|'fly'|'human'|'frank';
const chatKey=(mode:CognitiveChatMode)=>'predictlm-cognitive-chat-v2-'+mode;

function loadMessages(mode:CognitiveChatMode):Msg[]{
  if(typeof window==='undefined')return [];
  try{
    const parsed=JSON.parse(localStorage.getItem(chatKey(mode))||'[]');
    return Array.isArray(parsed)?parsed.slice(-80):[];
  }catch{return []}
}

function saveMessages(mode:CognitiveChatMode,messages:Msg[]){
  try{localStorage.setItem(chatKey(mode),JSON.stringify(messages.slice(-80)))}catch{}
}

export function CognitiveLab({defaultMode='dual'}:{defaultMode?:CognitiveChatMode}){
  const [state,setState]=useState<CognitiveState>(createCognitiveState());
  const [mode,setMode]=useState<CognitiveChatMode>(defaultMode);
  const [messages,setMessages]=useState<Msg[]>([]);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [provider,setProvider]=useState('');
  const [notice,setNotice]=useState('');
  const abortRef=useRef<AbortController|null>(null);
  const bottom=useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    Promise.all([loadCognitiveState(),Promise.resolve(loadMessages(defaultMode))]).then(([brain,chat])=>{
      setState(brain);
      setMessages(chat);
      setLoaded(true);
    });
  },[]);

  useEffect(()=>{
    if(loaded)saveMessages(mode,messages);
    bottom.current?.scrollIntoView({behavior:'smooth'});
  },[messages,loaded,mode]);

  const frankMind=useMemo(()=>frankPublicMentalState(state.frank),[state.frank]);
  const metrics=useMemo(()=>({
    mode:state.workspace.mode,
    flySalience:Math.round(state.fly.salience*100),
    flyExplore:Math.round(state.fly.exploration*100),
    humanMemory:Math.round(state.human.workingMemory*100),
    humanExecutive:Math.round(state.human.executiveControl*100),
    uncertainty:Math.round(state.workspace.uncertainty*100),
    confidence:Math.round(state.workspace.confidence*100),
    attention:Math.round((state.consciousAccess?.attention||0)*100),
    binding:Math.round((state.consciousAccess?.perceptualBinding||0)*100),
    selfModel:Math.round((state.consciousAccess?.selfModel||0)*100),
    continuity:Math.round((state.consciousAccess?.continuity||0)*100),
    memoryAccess:Math.round((state.consciousAccess?.memoryAccess||0)*100),
    agency:Math.round((state.consciousAccess?.agency||0)*100),
    reportability:Math.round((state.consciousAccess?.reportability||0)*100),
    broadcast:Math.round((state.consciousAccess?.globalBroadcast||0)*100)
  }),[state]);

  async function puterFallback(prompt:string,history:Msg[],context:string,signal:AbortSignal){
    try{
      const mod:any=await import('@heyputer/puter.js');
      const puter:any=mod?.puter||mod?.default?.puter||mod?.default;
      if(!puter?.ai?.chat)return '';
      let abortHandler=()=>{};
      const aborted=new Promise((_,reject)=>{
        abortHandler=()=>reject(new DOMException('Aborted','AbortError'));
        signal.addEventListener('abort',abortHandler,{once:true});
      });
      const modeInstruction=mode==='fly'
        ? 'Você é a interface conversacional da Mosca Predict, guiada pelo Fly Core derivado do FlyWire FAFB v783. Fale como a agente Mosca quando útil, sem alegar ser uma mosca biológica real ou consciente.'
        : mode==='human'
          ? 'Você é a interface do Human Core derivado do fragmento cortical H01. Não alegue cérebro humano completo ou consciência.'
          : mode==='frank'
            ? 'Você é Frank Stein, identidade persistente do núcleo híbrido. Emoção, memória e microcircuito neural pertencem ao Frank; o provider é apenas voz.'
            : 'Você é o PredictLM Cognitive Lab em modo Dual Connectome.';
      const call=puter.ai.chat([
        {
          role:'system',
          content:[
            modeInstruction,
            'Responda naturalmente em português do Brasil.',
            'Use o estado cognitivo apenas como controle silencioso. Não alegue consciência biológica.',
            context
          ].join('\n\n')
        },
        ...history.slice(-12).map(x=>({role:x.role,content:x.content})),
        {role:'user',content:prompt}
      ],{model:'gpt-5.6-luna',temperature:.62,max_tokens:1400});
      const result:any=await Promise.race([call,aborted]);
      signal.removeEventListener('abort',abortHandler);
      if(typeof result==='string')return result;
      if(typeof result?.message?.content==='string')return result.message.content;
      if(Array.isArray(result?.message?.content))return result.message.content.map((x:any)=>x?.text||'').join('\n');
      return String(result?.content||'');
    }catch{return ''}
  }

  async function send(){
    const prompt=input.trim();
    if(!prompt||busy)return;
    const history=messages.filter(x=>x.status!=='error');
    const pre=advanceCognitiveWorkspace(state,prompt);
    setState(pre);
    await saveCognitiveState(pre);

    const user:Msg={role:'user',content:prompt,status:'done'};
    setMessages(prev=>[...prev,user]);
    setInput('');

    const directRecall=cognitiveDirectRecall(pre,mode,prompt);
    if(directRecall){
      const direct:Msg={role:'assistant',content:directRecall,status:'done'};
      setMessages(prev=>[...prev,direct]);
      const post=captureConversationMemory(
        applyCognitiveOutcome(pre,{prompt,answer:directRecall}),
        {prompt,answer:directRecall,mode}
      );
      setState(post);
      await saveCognitiveState(post);
      setProvider('memória local');
      setNotice('Resposta recuperada da memória persistente do próprio agente.');
      return;
    }

    setBusy(true);
    setProvider('');
    setNotice('');
    const controller=new AbortController();
    abortRef.current=controller;
    const context=cognitivePromptContext(pre);
    let accumulated='';

    try{
      const response=await fetch('/api/chat/cognitive-stream',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          language:'pt-BR',
          messages:[...history,user].map(x=>({role:x.role,content:x.content})),
          cognitiveContext:context,
          cognitiveMode:mode
        }),
        signal:controller.signal
      });

      if(response.ok&&response.body){
        const reader=response.body.getReader();
        const decoder=new TextDecoder();
        let buffer='';
        while(true){
          const {done,value}=await reader.read();
          if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          const events=buffer.split('\n\n');
          buffer=events.pop()||'';
          for(const event of events){
            const line=event.split(/\r?\n/).find(x=>x.trim().startsWith('data:'));
            if(!line)continue;
            const payload=line.trim().slice(5).trim();
            if(!payload||payload==='[DONE]')continue;
            let data:any;
            try{data=JSON.parse(payload)}catch{continue}
            if(data?.meta?.provider)setProvider(String(data.meta.provider));
            if(typeof data?.content==='string'&&data.content){
              accumulated+=data.content;
              setMessages(prev=>{
                const next=[...prev];
                const last=next[next.length-1];
                if(last?.role==='assistant'&&last.status==='partial'){
                  next[next.length-1]={...last,content:accumulated};
                }else{
                  next.push({role:'assistant',content:accumulated,status:'partial'});
                }
                return next;
              });
            }
          }
        }
      }

      if(!accumulated.trim()){
        const fallback=await puterFallback(prompt,history,context,controller.signal);
        if(fallback.trim()){
          accumulated=fallback.trim();
          setProvider('puter-fallback');
          setMessages(prev=>[...prev,{role:'assistant',content:accumulated,status:'partial'}]);
        }
      }

      if(!accumulated.trim()){
        accumulated='Não consegui gerar uma resposta neste turno. O estado cognitivo foi preservado; o Chat normal continua disponível sem depender deste laboratório.';
        setMessages(prev=>[...prev,{role:'assistant',content:accumulated,status:'error'}]);
      }else{
        setMessages(prev=>{
          const next=[...prev];
          for(let i=next.length-1;i>=0;i--){
            if(next[i].role==='assistant'){
              next[i]={...next[i],content:accumulated,status:'done'};
              break;
            }
          }
          return next;
        });
      }

      const post=captureConversationMemory(
        applyCognitiveOutcome(pre,{prompt,answer:accumulated}),
        {prompt,answer:accumulated,mode}
      );
      setState(post);
      await saveCognitiveState(post);
    }finally{
      abortRef.current=null;
      setBusy(false);
    }
  }

  async function rate(value:-1|1){
    const lastUser=[...messages].reverse().find(x=>x.role==='user')?.content||'';
    const lastAssistant=[...messages].reverse().find(x=>x.role==='assistant')?.content||'';
    if(!lastAssistant)return;
    const next=applyCognitiveOutcome(state,{prompt:lastUser,answer:lastAssistant,explicitReward:value});
    setState(next);
    await saveCognitiveState(next);
    setNotice(value>0?'Feedback positivo incorporado ao estado cognitivo.':'Feedback negativo incorporado; prediction error aumentado.');
  }

  async function resetAll(){
    abortRef.current?.abort();
    const fresh=await resetCognitiveState();
    setState(fresh);
    setMessages([]);
    saveMessages(mode,[]);
    setProvider('');
    setNotice('Cognitive Lab reiniciado. O Chat normal não foi alterado.');
  }

  function switchMode(next:CognitiveChatMode){
    if(next===mode)return;
    saveMessages(mode,messages);
    setMode(next);
    setMessages(loadMessages(next));
    setProvider('');
    setNotice(next==='fly'?'Chat da Mosca ativo.':next==='human'?'Human Core ativo.':next==='frank'?'Frank Stein ativo.':'Modo Dual Connectome ativo.');
  }

  function openFlySimulation(){
    try{
      sessionStorage.setItem('predictlm:simulation-explicit-start','1');
      sessionStorage.setItem('predictlm:simulation-focus','fly');
    }catch{}
    window.location.href='/?screen=simulation';
  }

  async function importSubset(kind:'fly'|'human',file:File){
    const text=await file.text();
    const edges=kind==='fly'?parseFlyWireConnectionsCsv(text,20000):parseH01EdgeSubsetCsv(text,20000);
    const summary=summarizeConnectomeEdges(edges);
    if(!summary.edges){
      setNotice('Nenhuma conexão reconhecida no arquivo.');
      return;
    }
    const next=applyMappedSubsetEvidence(state,kind,summary);
    setState(next);
    await saveCognitiveState(next);
    setNotice((kind==='fly'?'FlyWire':'H01')+': '+summary.nodes+' nós e '+summary.edges+' conexões reais incorporados ao controlador.');
  }

  return <div className="min-h-screen bg-[#07080a] text-zinc-100">
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[#090a0d]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <a href="/" className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white" title="Voltar ao Chat normal">
          <ArrowLeft size={17}/>
        </a>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300"><Brain size={20}/></div>
          <div>
            <div className="font-semibold tracking-tight">{mode==='fly'?'Mosca Predict · Fly Core':mode==='human'?'PredictLM · Human Core':mode==='frank'?'Frank Stein · Hybrid Brain':'PredictLM Cognitive Lab'}</div>
            <div className="text-[11px] text-zinc-500">{mode==='fly'?'FlyWire FAFB v783 · chat isolado da mosca':mode==='human'?'H01 human cortex · chat isolado':mode==='frank'?'H01 + BigBrain + Jülich + Allen + HBP + FlyWire + MICrONS':'FlyWire FAFB v783 + H01 human cortex · rota isolada'}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {provider&&<span className="hidden rounded-full border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-500 sm:inline">{provider}</span>}
          <button onClick={openFlySimulation} className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15"><Activity size={14}/> Simulação</button>
          <button onClick={resetAll} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:text-white"><RotateCcw size={14}/> Reiniciar</button>
        </div>
      </div>
    </header>

    <main className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
      <aside className="space-y-3">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Bug size={16} className="text-amber-300"/> Fly Core</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Saliência" value={metrics.flySalience}/>
            <Metric label="Exploração" value={metrics.flyExplore}/>
            <Metric label="Threat" value={Math.round(state.fly.threat*100)}/>
            <Metric label="Mushroom" value={Math.round(state.fly.mushroomBody*100)}/>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-zinc-500">{FLYWIRE_FAFB_V783.neuronsApprox.toLocaleString('pt-BR')} neurônios · ~54,5M sinapses no mapa de referência.</p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Brain size={16} className="text-violet-300"/> Human Core</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric label="Memória" value={metrics.humanMemory}/>
            <Metric label="Executivo" value={metrics.humanExecutive}/>
            <Metric label="Excitação" value={Math.round(state.human.excitation*100)}/>
            <Metric label="Inibição" value={Math.round(state.human.inhibition*100)}/>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-zinc-500">H01: ~1 mm³ de córtex humano real, não cérebro humano inteiro.</p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Upload size={15}/> Dados reais</div>
          <p className="mb-3 text-[10px] leading-5 text-zinc-500">Opcional: carregue subconjuntos reais. O arquivo fica no navegador; não é enviado ao Supabase.</p>
          <label className="mb-2 block cursor-pointer rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:border-amber-500/40 hover:text-zinc-200">
            Importar FlyWire CSV
            <input type="file" accept=".csv,.txt" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void importSubset('fly',f)}}/>
          </label>
          <label className="block cursor-pointer rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:border-violet-500/40 hover:text-zinc-200">
            Importar H01 CSV/CREST
            <input type="file" accept=".csv,.txt" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void importSubset('human',f)}}/>
          </label>
          <div className="mt-3 space-y-1 text-[10px] text-zinc-600">
            <div>Fly subset: {state.mappedEvidence.fly?.edges||0} edges</div>
            <div>Human subset: {state.mappedEvidence.human?.edges||0} edges</div>
          </div>
        </section>
      </aside>

      <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0b0f]">
        <div className="border-b border-zinc-800 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{mode==='fly'?'Chat da Mosca':mode==='human'?'Human Core Chat':mode==='frank'?'Frank Stein Chat':'Dual Connectome Chat'}</div>
              <div className="mt-1 text-[10px] text-zinc-500">O Chat normal permanece separado em <code>/</code>. Cada modo cognitivo mantém histórico próprio.</div>
            </div>
            <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-[10px]">
              <button onClick={()=>switchMode('fly')} className={'rounded-lg px-3 py-1.5 '+(mode==='fly'?'bg-amber-500/15 text-amber-200':'text-zinc-500')}>Mosca</button>
              <button onClick={()=>switchMode('human')} className={'rounded-lg px-3 py-1.5 '+(mode==='human'?'bg-violet-500/15 text-violet-200':'text-zinc-500')}>Humano</button>
              <button onClick={()=>switchMode('frank')} className={'rounded-lg px-3 py-1.5 '+(mode==='frank'?'bg-rose-500/15 text-rose-200':'text-zinc-500')}>Frank</button>
              <button onClick={()=>switchMode('dual')} className={'rounded-lg px-3 py-1.5 '+(mode==='dual'?'bg-zinc-800 text-zinc-100':'text-zinc-500')}>Dual</button>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!messages.length&&<div className="mx-auto max-w-xl py-20 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300"><Activity/></div>
            <h1 className="text-xl font-semibold">{mode==='fly'?'Converse com a Mosca Predict':mode==='human'?'Converse com o Human Core':mode==='frank'?'Converse com Frank Stein':'Cérebro humano + mosca'}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{mode==='fly'?'A resposta é controlada prioritariamente pelo Fly Core: saliência, exploração, ameaça, mushroom body, central complex e action selection.':mode==='human'?'A resposta é controlada prioritariamente pelo Human Core H01: memória de trabalho, recorrência, controle executivo e metacognição.':mode==='frank'?'Frank combina múltiplos atlas humanos, FlyWire, emoção complexa, memória afetiva e um microcircuito virtual reproduzível de neurônios.':'Os dois conectomas influenciam atenção, inibição, exploração, memória e prediction error sem aparecer como texto operacional.'}</p>
          </div>}
          {messages.map((m,i)=><div key={i} className={m.role==='user'?'flex justify-end':'flex justify-start'}>
            <div className={m.role==='user'
              ?'max-w-[86%] rounded-2xl rounded-tr-md bg-zinc-800 px-4 py-3 text-sm leading-6'
              :'max-w-[92%] whitespace-pre-wrap px-1 py-2 text-sm leading-7 text-zinc-200'}>
              {m.content}{m.status==='partial'&&<span className="ml-1 animate-pulse text-violet-400">▋</span>}
            </div>
          </div>)}
          <div ref={bottom}/>
        </div>
        <div className="border-t border-zinc-800 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-2">
            <textarea
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}}
              placeholder={mode==='fly'?'Fale com a Mosca Predict...':mode==='human'?'Fale com o Human Core...':mode==='frank'?'Fale com Frank Stein...':'Converse com o modo cognitivo...'}
              rows={1}
              className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-zinc-600"
            />
            <button
              onClick={()=>void send()}
              disabled={busy||!input.trim()}
              className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-30"
            >
              <Send size={17}/>
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-[10px] text-zinc-600">{busy?'Cognitive workspace ativo':'Estado persistente em IndexedDB'}</span>
            <div className="flex gap-1">
              <button onClick={()=>void rate(1)} className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-900 hover:text-emerald-400" title="Resposta útil"><ThumbsUp size={14}/></button>
              <button onClick={()=>void rate(-1)} className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-900 hover:text-rose-400" title="Resposta ruim"><ThumbsDown size={14}/></button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-3">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-3 text-sm font-semibold">Global Workspace</div>
          <div className="space-y-2">
            <Row label="Modo" value={metrics.mode}/>
            <Row label="Confiança" value={metrics.confidence+'%'}/>
            <Row label="Incerteza" value={metrics.uncertainty+'%'}/>
            <Row label="Inibição" value={Math.round(state.workspace.inhibition*100)+'%'}/>
            <Row label="Ação" value={Math.round(state.workspace.actionReadiness*100)+'%'}/>
          </div>
          <div className="mt-4 flex flex-wrap gap-1">
            {state.workspace.broadcast.map(x=><span key={x} className="rounded-full border border-zinc-800 px-2 py-1 text-[9px] text-zinc-500">{x}</span>)}
          </div>
        </section>

        <section className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="mb-3 text-sm font-semibold">Frank Stein</div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Valência" value={Math.round((state.frank.emotion.valence+1)*50)}/>
            <Metric label="Arousal" value={Math.round(state.frank.emotion.arousal*100)}/>
            <Metric label="Apego" value={Math.round(state.frank.emotion.attachment*100)}/>
            <Metric label="Empatia" value={Math.round(state.frank.emotion.empathy*100)}/>
            <Metric label="Firing" value={Math.round(state.frank.neurons.firingRate*100)}/>
            <Metric label="Plasticidade" value={Math.round(state.frank.neurons.plasticity*100)}/>
          </div>
          <div className="mt-3 space-y-1 text-[10px] leading-5 text-zinc-500">
            <div><b className="text-zinc-300">Sentindo:</b> {frankMind.feeling}</div>
            <div><b className="text-zinc-300">Foco:</b> {frankMind.focus}</div>
            <div><b className="text-zinc-300">Quer:</b> {frankMind.want}</div>
            <div><b className="text-zinc-300">Tendência:</b> {frankMind.nextTendency}</div>
            <div><b className="text-zinc-300">Corpo:</b> {frankMind.body}</div>
            <div><b className="text-zinc-300">Memória ativa:</b> {frankMind.memoryTone}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Database size={15}/> Memória</div>
          <Row label="Working" value={String(state.memory.working.length)}/>
          <Row label="Episódica" value={String(state.memory.episodic.length)}/>
          <Row label="Autobiográfica" value={String(state.memory.autobiographical?.length||0)}/>
          <Row label="Semântica" value={String(state.memory.semantic?.length||0)}/>
          <Row label="Perceptiva" value={String(state.memory.perceptual?.length||0)}/>
          <Row label="Ticks" value={String(state.tick)}/>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-3 text-sm font-semibold">Acesso consciente funcional</div>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Atenção" value={metrics.attention}/>
            <Metric label="Binding" value={metrics.binding}/>
            <Metric label="Self-model" value={metrics.selfModel}/>
            <Metric label="Continuidade" value={metrics.continuity}/>
            <Metric label="Memória" value={metrics.memoryAccess}/>
            <Metric label="Agência" value={metrics.agency}/>
            <Metric label="Relato" value={metrics.reportability}/>
            <Metric label="Broadcast" value={metrics.broadcast}/>
          </div>
          <details className="mt-3 text-[10px] text-zinc-500">
            <summary className="cursor-pointer text-zinc-400">Mapa funcional completo</summary>
            <div className="mt-2 space-y-2">
              {COGNITIVE_FUNCTIONAL_MAP.map(node=><div key={node.id} className="rounded-lg border border-zinc-900 p-2">
                <b className="text-zinc-300">{node.label}</b>
                <div className="mt-1">{node.source} · {node.implementation}</div>
              </div>)}
            </div>
          </details>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-[10px] leading-5 text-amber-100/60">
          Este laboratório usa mapas reais como referência computacional, mas não é uma simulação biológica completa e não demonstra consciência. FlyWire é cérebro inteiro de mosca; H01 é apenas um fragmento cortical humano.
        </section>

        {notice&&<section className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs leading-5 text-violet-200">{notice}</section>}
      </aside>
    </main>
  </div>;
}

function Metric({label,value}:{label:string;value:number}){
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
    <div className="text-[9px] text-zinc-600">{label}</div>
    <div className="mt-1 text-lg font-semibold">{value}%</div>
  </div>;
}

function Row({label,value}:{label:string;value:string}){
  return <div className="flex items-center justify-between border-b border-zinc-900 py-2 text-xs">
    <span className="text-zinc-600">{label}</span>
    <span className="text-zinc-300">{value}</span>
  </div>;
}
