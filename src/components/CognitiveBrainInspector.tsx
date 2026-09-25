'use client';

import React from 'react';
import {Brain,CircleDot,ImageIcon,Network,ScanSearch,Sparkles} from 'lucide-react';
import type {CognitiveState} from '@/lib/cognitive/cognitive-workspace';
import {normalizeOrganismState} from '@/lib/cognitive/organism-engine';

const pct=(v:number)=>Math.round(Math.max(0,Math.min(1,v))*100);

export function CognitiveBrainInspector({state}:{state:CognitiveState}){
  const organism=normalizeOrganismState(state.organism);
  const humanNodes=[
    {label:'Atenção',value:state.consciousAccess.attention},
    {label:'Working memory',value:state.human.workingMemory},
    {label:'Executivo',value:state.human.executiveControl},
    {label:'Recorrência',value:state.human.recurrentIntegration},
    {label:'Metacognição',value:state.human.metacognition},
    {label:'Inibição',value:state.human.inhibition}
  ];
  const flyNodes=[
    {label:'Saliência',value:state.fly.salience},
    {label:'Exploração',value:state.fly.exploration},
    {label:'Mushroom body',value:state.fly.mushroomBody},
    {label:'Central complex',value:state.fly.centralComplex},
    {label:'Action select',value:state.fly.actionSelection},
    {label:'Threat',value:state.fly.threat}
  ];

  function openBrainImagine(){
    const prompt=[
      'Visualização científica conceitual do PredictLM Cognitive Lab.',
      'Mostrar lado a lado um cérebro humano cortical estilizado e um cérebro de mosca inspirado no connectoma FlyWire,',
      'com redes neurais, regiões funcionais, sinapses e fluxos de atenção/memória destacados.',
      'Incluir quatro perspectivas humanas simuladas como pequenos mapas neurais distintos, sem retratar pessoas reais.',
      'Estética de laboratório neurocientífico premium, legível, fundo escuro, sem alegar consciência nem leitura mental real.'
    ].join(' ');
    try{sessionStorage.setItem('predictlm:imagine-prefill',prompt)}catch{}
    window.location.href='/?screen=imagine';
  }

  return <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.035] p-4">
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Network size={15} className="text-cyan-300"/> Neuro Inspector</div>
    <p className="mb-3 text-[10px] leading-5 text-zinc-500">Telemetria computacional dos circuitos e agentes simulados. Não é leitura de mente humana/mosca real.</p>
    <button onClick={openBrainImagine} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[10px] text-cyan-200 hover:bg-cyan-500/10">
      <ImageIcon size={13}/> Criar imagem dos cérebros no Imagine
    </button>

    <div className="grid grid-cols-2 gap-2">
      <BrainMini title="Human Core" icon={<Brain size={13}/>} nodes={humanNodes}/>
      <BrainMini title="Fly Core" icon={<CircleDot size={13}/>} nodes={flyNodes}/>
    </div>

    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-300"><ScanSearch size={13}/> Estado interno atual</div>
      <div className="mt-2 text-[10px] leading-5 text-zinc-500">{organism.innerTelemetry}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <Tiny label="Energia" value={pct(organism.drives.energy)}/>
        <Tiny label="Segurança" value={pct(organism.drives.safety)}/>
        <Tiny label="Social" value={pct(organism.drives.social)}/>
        <Tiny label="Curiosidade" value={pct(organism.drives.curiosity)}/>
      </div>
    </div>

    <details className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <summary className="cursor-pointer text-[11px] font-medium text-zinc-300">Vários cérebros humanos simulados</summary>
      <div className="mt-2 space-y-2">
        {organism.simulatedBrains.map(brain=><div key={brain.id} className="rounded-lg border border-zinc-900 p-2">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <span className="flex items-center gap-1.5 text-zinc-300"><Sparkles size={11}/>{brain.label}</span>
            <span className="text-zinc-600">{pct(brain.confidence)}% conf.</span>
          </div>
          <div className="mt-1 text-[9px] leading-4 text-zinc-600">{brain.currentHypothesis}</div>
        </div>)}
      </div>
    </details>
  </section>;
}

function BrainMini({title,icon,nodes}:{title:string;icon:React.ReactNode;nodes:{label:string;value:number}[]}){
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950/65 p-2.5">
    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-zinc-300">{icon}{title}</div>
    <div className="space-y-1.5">
      {nodes.map(node=><div key={node.label}>
        <div className="mb-0.5 flex justify-between gap-2 text-[8px] text-zinc-600"><span>{node.label}</span><span>{pct(node.value)}%</span></div>
        <div className="h-1 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full bg-current text-cyan-400" style={{width:pct(node.value)+'%'}}/></div>
      </div>)}
    </div>
  </div>;
}

function Tiny({label,value}:{label:string;value:number}){
  return <div className="rounded-lg border border-zinc-900 p-2">
    <div className="text-zinc-600">{label}</div>
    <div className="mt-0.5 text-zinc-300">{value}%</div>
  </div>;
}
