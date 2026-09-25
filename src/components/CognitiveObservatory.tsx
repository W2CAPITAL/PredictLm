'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
  createCognitiveState,
  type CognitiveState
} from '@/lib/cognitive/cognitive-workspace';
import {loadCognitiveState} from '@/lib/cognitive/cognitive-memory';

const pct=(value:number|undefined)=>Math.round(Math.max(0,Math.min(1,Number(value)||0))*100);

function Meter({label,value}:{label:string;value:number}){
  const width=pct(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-zinc-400">
        <span>{label}</span><span>{width}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-white/70 transition-all duration-500" style={{width:width+'%'}}/>
      </div>
    </div>
  );
}

function HumanBrainMap({
  name,
  attention,
  uncertainty,
  confidence,
  memory,
  action
}:{
  name:string;
  attention:number;
  uncertainty:number;
  confidence:number;
  memory:number;
  action:string;
}){
  const glow=(value:number)=>.24+Math.max(0,Math.min(1,value))*.76;
  return (
    <svg viewBox="0 0 420 260" role="img" aria-label={'Mapa funcional do agente '+name} className="h-auto w-full">
      <defs>
        <filter id={'glow-'+name.replace(/\W/g,'')}>
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path
        d="M83 139c-8-48 22-94 67-108 28-9 59-5 82 9 26-13 59-10 82 5 31 20 45 57 37 92 20 15 31 39 27 63-5 31-31 52-62 52H147c-42 0-76-30-80-69-2-17 4-32 16-44Z"
        fill="rgba(255,255,255,.035)"
        stroke="rgba(255,255,255,.32)"
        strokeWidth="2"
      />
      <path d="M211 49v170M117 118c55 5 126 3 205-10M128 180c60-20 127-19 185 2" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="1.5"/>
      <g filter={'url(#glow-'+name.replace(/\W/g,'))'}>
        <circle cx="116" cy="116" r={14+attention*7} fill={'rgba(255,255,255,'+glow(attention)+')'}/>
        <circle cx="183" cy="83" r={12+confidence*7} fill={'rgba(255,255,255,'+glow(confidence)+')'}/>
        <circle cx="225" cy="161" r={11+memory*8} fill={'rgba(255,255,255,'+glow(memory)+')'}/>
        <circle cx="300" cy="103" r={12+(1-uncertainty)*7} fill={'rgba(255,255,255,'+glow(1-uncertainty)+')'}/>
        <circle cx="294" cy="190" r={10+confidence*5} fill="rgba(255,255,255,.55)"/>
      </g>
      <g fill="white" fontSize="11" opacity=".74">
        <text x="82" y="151">atenção</text>
        <text x="155" y="56">executivo</text>
        <text x="201" y="205">memória</text>
        <text x="276" y="75">integração</text>
        <text x="277" y="226">ação</text>
      </g>
      <text x="20" y="24" fill="white" fontSize="14" fontWeight="700">{name}</text>
      <text x="20" y="244" fill="rgba(255,255,255,.58)" fontSize="11">{action}</text>
    </svg>
  );
}

function FlyBrainMap({state}:{state:CognitiveState['fly']}){
  const nodes=[
    {x:86,y:88,r:16+state.salience*7,label:'saliência'},
    {x:152,y:60,r:13+state.mushroomBody*7,label:'MB'},
    {x:218,y:92,r:13+state.centralComplex*7,label:'CX'},
    {x:284,y:62,r:12+state.sensoryDrive*7,label:'sensório'},
    {x:333,y:123,r:12+state.actionSelection*7,label:'ação'},
    {x:215,y:166,r:12+state.exploration*7,label:'explorar'},
    {x:120,y:165,r:11+state.inhibition*7,label:'inibição'}
  ];
  return (
    <svg viewBox="0 0 420 230" role="img" aria-label="Mapa funcional do Fly Core" className="h-auto w-full">
      <path d="M58 115c0-42 34-76 76-76 26 0 48 13 62 32 15-19 38-31 64-31 43 0 78 35 78 78s-35 78-78 78c-26 0-49-12-64-31-14 20-37 32-63 32-42 0-75-34-75-76Z" fill="rgba(255,255,255,.035)" stroke="rgba(255,255,255,.28)" strokeWidth="2"/>
      {nodes.slice(0,-1).map((a,i)=>{
        const b=nodes[i+1];
        return <line key={a.label+b.label} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(255,255,255,.13)" strokeWidth="2"/>;
      })}
      {nodes.map(node=>(
        <g key={node.label}>
          <circle cx={node.x} cy={node.y} r={node.r} fill="rgba(255,255,255,.62)"/>
          <text x={node.x} y={node.y+node.r+17} textAnchor="middle" fill="rgba(255,255,255,.66)" fontSize="10">{node.label}</text>
        </g>
      ))}
      <text x="18" y="22" fill="white" fontSize="14" fontWeight="700">Fly Core · mapa funcional</text>
    </svg>
  );
}

function Card({children,className=''}:{children:React.ReactNode;className?:string}){
  return <section className={'rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-2xl shadow-black/10 '+className}>{children}</section>;
}

export function CognitiveObservatory(){
  const [state,setState]=useState<CognitiveState>(()=>createCognitiveState());
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    let active=true;
    const refresh=async()=>{
      const next=await loadCognitiveState();
      if(active){setState(next);setLoaded(true);}
    };
    void refresh();
    const timer=window.setInterval(()=>void refresh(),1400);
    return ()=>{active=false;window.clearInterval(timer);};
  },[]);

  const memoryStrength=useMemo(()=>{
    const count=(state.memory?.episodic?.length||0)+(state.memory?.autobiographical?.length||0)+(state.memory?.perceptual?.length||0);
    return Math.min(1,count/40);
  },[state]);

  return (
    <main className="min-h-screen bg-[#08090c] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[.025] p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[.28em] text-zinc-500">PredictLM Cognitive Lab</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Observatório cognitivo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Estado funcional inspecionável de agentes simulados, memórias persistidas e controladores derivados de referências de conectoma.
              Estes painéis não representam pessoas reais, leitura de mente nem chain-of-thought privada.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link href="/cognitive" className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/10">Dual</Link>
            <Link href="/cognitive/human" className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/10">Human</Link>
            <Link href="/cognitive/fly" className="rounded-full border border-white/10 px-4 py-2 hover:bg-white/10">Fly</Link>
            <Link href="/" className="rounded-full bg-white px-4 py-2 font-medium text-black">Chat normal</Link>
          </nav>
        </header>

        <div className="mb-5 flex items-center gap-2 text-xs text-zinc-500">
          <span className={'h-2 w-2 rounded-full '+(loaded?'bg-emerald-400':'bg-amber-400')}/>
          {loaded?'IndexedDB sincronizado':'carregando estado local'} · tick {state.tick}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="grid gap-5 md:grid-cols-2">
            {(state.population?.agents||[]).map(agent=>(
              <Card key={agent.id}>
                <HumanBrainMap
                  name={agent.name}
                  attention={agent.attention}
                  uncertainty={agent.uncertainty}
                  confidence={agent.confidence}
                  memory={Math.min(1,agent.episodic.length/18)}
                  action={agent.currentAction+' · '+agent.currentFocus}
                />
                <div className="mt-4 grid gap-3">
                  <Meter label="atenção" value={agent.attention}/>
                  <Meter label="confiança" value={agent.confidence}/>
                  <Meter label="incerteza" value={agent.uncertainty}/>
                </div>
                <div className="mt-4 space-y-2 text-sm leading-6">
                  <p><span className="text-zinc-500">Objetivo</span> · {agent.currentGoal}</p>
                  <p><span className="text-zinc-500">Foco público</span> · {agent.currentFocus}</p>
                  <p><span className="text-zinc-500">Memória evocada</span> · {agent.recalledMemory||'nenhuma dominou esta decisão'}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-black/30 p-3 text-xs leading-5 text-zinc-400">
                  {agent.publicReport}
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-5">
            <Card>
              <FlyBrainMap state={state.fly}/>
              <div className="grid gap-3 sm:grid-cols-2">
                <Meter label="saliência" value={state.fly.salience}/>
                <Meter label="exploração" value={state.fly.exploration}/>
                <Meter label="mushroom body" value={state.fly.mushroomBody}/>
                <Meter label="seleção de ação" value={state.fly.actionSelection}/>
                <Meter label="ameaça" value={state.fly.threat}/>
                <Meter label="inibição" value={state.fly.inhibition}/>
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">Global workspace</div>
                  <h2 className="mt-1 text-lg font-semibold">{state.workspace.mode}</h2>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{pct(state.consciousAccess.globalBroadcast)}% broadcast</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Meter label="atenção" value={state.consciousAccess.attention}/>
                <Meter label="binding" value={state.consciousAccess.perceptualBinding}/>
                <Meter label="self-model" value={state.consciousAccess.selfModel}/>
                <Meter label="continuidade" value={state.consciousAccess.continuity}/>
                <Meter label="acesso à memória" value={state.consciousAccess.memoryAccess}/>
                <Meter label="agência funcional" value={state.consciousAccess.agency}/>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {state.workspace.broadcast.map(item=><span key={item} className="rounded-full bg-white/[.06] px-3 py-1 text-[11px] text-zinc-400">{item}</span>)}
              </div>
            </Card>

            <Card>
              <div className="text-[11px] uppercase tracking-[.2em] text-zinc-500">Memória do runtime</div>
              <div className="mt-3"><Meter label="densidade registrada" value={memoryStrength}/></div>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <h3 className="mb-2 font-medium">Trabalho</h3>
                  <div className="space-y-1 text-zinc-400">{state.memory.working.slice(0,5).map((x,i)=><p key={i}>{x}</p>)}</div>
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Episódios recentes</h3>
                  <div className="space-y-2 text-zinc-400">
                    {state.memory.episodic.slice(-4).reverse().map((x,i)=><p key={x.at+'-'+i}>{x.prompt} → {x.answerPreview}</p>)}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Traços autobiográficos</h3>
                  <div className="space-y-2 text-zinc-400">
                    {state.memory.autobiographical.slice(0,4).map(x=><p key={x.id}>{x.text}</p>)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-5">
          <h2 className="text-lg font-semibold">O que estes “cérebros” significam</h2>
          <div className="mt-3 grid gap-4 text-sm leading-6 text-zinc-400 md:grid-cols-3">
            <p><strong className="text-zinc-200">Humano.</strong> O desenho é um mapa funcional do software. H01 informa propriedades do fragmento cortical usado como referência; não é uma reconstrução de um cérebro humano inteiro.</p>
            <p><strong className="text-zinc-200">Mosca.</strong> FlyWire informa estrutura e motivos de conectividade. O runtime usa sinais compactos de saliência, associação, inibição, exploração e ação; não importa memórias biográficas de uma mosca.</p>
            <p><strong className="text-zinc-200">Relatório público.</strong> O painel mostra estado projetado para inspeção — objetivo, foco, memória recuperada e ação escolhida. Ele não tenta revelar raciocínio interno privado de um modelo de linguagem.</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
