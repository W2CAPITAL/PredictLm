'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Activity, Brain, Clock3, HeartPulse, MapPin, Pause, Play, RotateCcw, Send, Sparkles, StepForward, Users, Wallet } from 'lucide-react';
import {
  applySimulationInstruction,
  createLifeSimulation,
  simulationClock,
  simulationSummary,
  stepLifeSimulation,
  type LifeLocation,
  type LifeSimulationState
} from '@/lib/life-simulation-engine';
import { dominantCircuits } from '@/lib/neurocore';
import { ENTITY_REFERENCE_IMAGE } from '@/lib/entity-self-model';

const STORAGE_KEY='predictlm-life-simulation-v1';

function loadState():LifeSimulationState{
  if(typeof window==='undefined')return createLifeSimulation();
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return raw?.version===1?raw:createLifeSimulation();
  }catch{return createLifeSimulation()}
}

function needLabel(value:number){return Math.max(0,Math.min(100,Math.round(value)))}

export function GrokSimulationPanel(){
  const [state,setState]=useState<LifeSimulationState>(()=>createLifeSimulation());
  const [hydrated,setHydrated]=useState(false);
  const [command,setCommand]=useState('');
  const [manualTarget,setManualTarget]=useState<LifeLocation|null>(null);
  const canvas=useRef<HTMLCanvasElement>(null);

  useEffect(()=>{
    setState(loadState());
    setHydrated(true);
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}
  },[state,hydrated]);

  useEffect(()=>{
    if(!state.running)return;
    const timer=window.setInterval(()=>{
      setState(prev=>stepLifeSimulation(prev,10*prev.speed,manualTarget));
    },650);
    return()=>window.clearInterval(timer);
  },[state.running,state.speed,manualTarget]);

  useEffect(()=>{
    const el=canvas.current;
    if(!el)return;
    const rect=el.getBoundingClientRect();
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const width=Math.max(640,Math.floor(rect.width));
    const height=360;
    el.width=width*dpr;el.height=height*dpr;
    const ctx=el.getContext('2d');
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const sx=width/640;

    ctx.clearRect(0,0,width,height);
    ctx.fillStyle='#080b11';ctx.fillRect(0,0,width,height);

    ctx.strokeStyle='#171d29';ctx.lineWidth=1;
    for(let x=0;x<640;x+=32){ctx.beginPath();ctx.moveTo(x*sx,0);ctx.lineTo(x*sx,height);ctx.stroke()}
    for(let y=0;y<360;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()}

    ctx.strokeStyle='#273147';ctx.lineWidth=9;ctx.lineCap='round';
    const paths=[[[110,95],[320,215],[530,95]],[[110,255],[320,215],[525,255]],[[320,215],[305,320]]];
    for(const points of paths){
      ctx.beginPath();
      points.forEach(([x,y],i)=>i?ctx.lineTo(x*sx,y):ctx.moveTo(x*sx,y));
      ctx.stroke();
    }

    for(const p of state.places){
      const active=p.id===state.person.location;
      const target=p.id===manualTarget;
      ctx.fillStyle=active?'#172838':target?'#241f3c':'#10151f';
      ctx.strokeStyle=active?'#56d7b0':target?'#a88cff':'#293346';
      ctx.lineWidth=active||target?2:1;
      ctx.beginPath();
      ctx.roundRect(p.x*sx,p.y,p.w*sx,p.h,12);
      ctx.fill();ctx.stroke();
      ctx.fillStyle='#f4f7fb';ctx.font='600 12px ui-sans-serif,system-ui';
      ctx.fillText(p.label,(p.x+10)*sx,p.y+20);
      ctx.fillStyle='#778298';ctx.font='9px ui-sans-serif,system-ui';
      const text=p.purpose.length>26?p.purpose.slice(0,26)+'…':p.purpose;
      ctx.fillText(text,(p.x+10)*sx,p.y+36);
    }

    const px=state.person.x*sx,py=state.person.y;
    const bubble=state.person.currentAction;
    ctx.font='10px ui-sans-serif,system-ui';
    const bw=Math.min(250,Math.max(120,ctx.measureText(bubble).width+22));
    const bx=Math.max(8,Math.min(width-bw-8,px-bw/2));
    const by=Math.max(8,py-70);
    ctx.fillStyle='rgba(8,11,17,.92)';ctx.strokeStyle='#343f55';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,31,9);ctx.fill();ctx.stroke();
    ctx.fillStyle='#d8dfec';
    const shown=bubble.length>42?bubble.slice(0,42)+'…':bubble;
    ctx.fillText(shown,bx+11,by+19);
  },[state,manualTarget]);

  const circuits=useMemo(()=>dominantCircuits(state.neuro,6),[state.neuro]);
  const relation=state.relationships[0];

  function tick(){
    setState(prev=>stepLifeSimulation(prev,10*prev.speed,manualTarget));
  }

  function reset(){
    const next=createLifeSimulation();
    setState(next);setManualTarget(null);setCommand('');
  }

  function applyCommand(){
    const value=command.trim();
    if(!value)return;
    setState(prev=>{
      const result=applySimulationInstruction(prev,value);
      if(result.forcedDestination)setManualTarget(result.forcedDestination);
      return stepLifeSimulation(result.state,10,result.forcedDestination);
    });
    setCommand('');
  }

  function pickPlace(event:React.MouseEvent<HTMLCanvasElement>){
    const el=canvas.current;if(!el)return;
    const rect=el.getBoundingClientRect();
    const x=(event.clientX-rect.left)*(640/rect.width);
    const y=(event.clientY-rect.top)*(360/rect.height);
    const found=state.places.find(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h);
    if(found)setManualTarget(found.id);
  }

  const needs=[
    ['Energia',state.needs.energy],
    ['Fome',state.needs.hunger],
    ['Social',state.needs.social],
    ['Diversão',state.needs.fun],
    ['Foco',state.needs.focus],
    ['Saúde',state.needs.health],
    ['Estresse',state.needs.stress]
  ] as const;

  return <section className="sim-shell">
    <header className="sim-head">
      <div>
        <span className="sim-kicker"><Activity size={12}/> LIFE SIMULATION STUDIO</span>
        <h1>{state.person.name}</h1>
        <p>Simulação ativa 2D · NeuroCore · memória local · não é consciência biológica</p>
      </div>
      <div className="sim-clock">
        <Clock3 size={15}/><b>{simulationClock(state)}</b><span>{state.person.mood}</span>
      </div>
    </header>

    <div className="sim-layout">
      <main className="sim-world-card">
        <div className="sim-toolbar">
          <button className="primary" onClick={()=>setState(s=>({...s,running:!s.running}))}>{state.running?<><Pause size={14}/>Pausar</>:<><Play size={14}/>Rodar</>}</button>
          <button onClick={tick}><StepForward size={14}/>Passo</button>
          <button onClick={()=>setManualTarget(null)} className={!manualTarget?'active':''}>Auto</button>
          <select value={state.speed} onChange={e=>setState(s=>({...s,speed:Number(e.target.value) as 1|2|4|8}))}>
            <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option><option value={8}>8×</option>
          </select>
          <button className="reset" onClick={reset}><RotateCcw size={13}/>Reset</button>
        </div>

        <div className="sim-canvas-wrap">
          <canvas ref={canvas} onClick={pickPlace} className="sim-canvas"/>
          <img
            src={ENTITY_REFERENCE_IMAGE}
            alt={state.person.name}
            className="sim-entity-avatar"
            draggable={false}
            style={{left:(state.person.x/640*100)+'%',top:(state.person.y/360*100)+'%'}}
          />
        </div>
        <div className="sim-world-foot">
          <span><MapPin size={12}/>{state.person.location}</span>
          <span>{manualTarget?'Destino manual: '+manualTarget:'Autonomia local ativa'}</span>
          <b>{state.person.currentAction}</b>
        </div>

        <div className="sim-command">
          <Sparkles size={16}/>
          <input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applyCommand()}} placeholder="Ex.: objetivo: aprender programação · vá ao parque · personagem: Luna"/>
          <button onClick={applyCommand} disabled={!command.trim()}><Send size={14}/></button>
        </div>
      </main>

      <aside className="sim-side">
        <section className="sim-panel">
          <div className="sim-panel-title"><HeartPulse size={14}/><b>Estado</b><span>{state.lastEvent}</span></div>
          <div className="need-grid">{needs.map(([label,value])=><div key={label} className={label==='Estresse'?'stress':''}><span><b>{label}</b><em>{needLabel(value)}</em></span><i><u style={{width:needLabel(value)+'%'}}/></i></div>)}</div>
          <div className="sim-metrics">
            <span><Wallet size={12}/>R$ {state.person.money.toFixed(0)}</span>
            <span><Users size={12}/>{relation.name}: {relation.affinity}%</span>
          </div>
        </section>

        <section className="sim-panel">
          <div className="sim-panel-title"><Brain size={14}/><b>NeuroCore</b><span>Digital Brain</span></div>
          <div className="circuit-list">{circuits.map(([id,value])=><div key={id}><span>{id}</span><i><u style={{width:Math.round(value*100)+'%'}}/></i><b>{Math.round(value*100)}%</b></div>)}</div>
          <small className="sim-note">O cérebro digital permanece ativo fora da simulação; aqui ele também controla saliência, memória, inibição, estado social e ação da personagem.</small>
        </section>

        <section className="sim-panel memories">
          <div className="sim-panel-title"><Sparkles size={14}/><b>Memórias</b><span>{state.memories.length}</span></div>
          {state.memories.slice(0,5).map(m=><article key={m.id}><b>{m.kind}</b><span>{m.summary}</span><small>salience {Math.round(m.salience*100)}%</small></article>)}
        </section>
      </aside>
    </div>

    <details className="sim-debug"><summary>Estado textual da simulação</summary><pre>{simulationSummary(state)}</pre></details>

    <style jsx>{`
      .sim-shell{min-height:100vh;padding:28px;background:radial-gradient(circle at 72% -10%,rgba(100,76,190,.22),transparent 35%),#07090e;color:#edf2f8;font-family:Inter,ui-sans-serif,system-ui}
      .sim-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin:0 auto 18px;max-width:1320px}.sim-head h1{font-size:42px;line-height:1;margin:7px 0 5px;letter-spacing:-.05em}.sim-head p{margin:0;color:#7f899c;font-size:12px}.sim-kicker{display:flex;align-items:center;gap:6px;font-size:9px;letter-spacing:.16em;color:#9b88ff}
      .sim-clock{border:1px solid #242b38;background:#0d1119;border-radius:14px;padding:10px 13px;display:grid;grid-template-columns:auto auto;gap:2px 7px;align-items:center}.sim-clock b{font-size:12px}.sim-clock span{grid-column:2;color:#8290a6;font-size:10px}
      .sim-layout{max-width:1320px;margin:auto;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(290px,.65fr);gap:14px}.sim-world-card,.sim-panel{border:1px solid #202735;background:linear-gradient(180deg,#0e131c,#0a0e15);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.sim-world-card{padding:12px;min-width:0}
      .sim-toolbar{display:flex;gap:7px;align-items:center;margin-bottom:10px}.sim-toolbar button,.sim-toolbar select{border:1px solid #293143;background:#121823;color:#c9d2e2;border-radius:9px;padding:7px 10px;font-size:10px}.sim-toolbar button{display:flex;gap:5px;align-items:center}.sim-toolbar .primary{background:#6e55e7;color:#fff;border-color:#826df2}.sim-toolbar .active{border-color:#5dcaab;color:#76e0c1}.sim-toolbar .reset{margin-left:auto}
      .sim-canvas-wrap{position:relative;width:100%;height:360px}.sim-canvas{width:100%;height:360px;display:block;border:1px solid #1d2431;border-radius:14px;background:#080b11;cursor:crosshair}.sim-entity-avatar{position:absolute;width:48px;height:48px;object-fit:cover;object-position:center 28%;border-radius:50%;transform:translate(-50%,-52%);border:2px solid #8f7aff;box-shadow:0 0 0 3px rgba(8,11,17,.88),0 0 22px rgba(124,94,255,.45);pointer-events:none;user-select:none}.sim-world-foot{display:grid;grid-template-columns:auto auto 1fr;gap:9px;align-items:center;padding:10px 4px 3px;font-size:10px;color:#79869a}.sim-world-foot span{display:flex;align-items:center;gap:4px}.sim-world-foot b{text-align:right;color:#cdd6e5;font-weight:600}
      .sim-command{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border-top:1px solid #202735;margin-top:9px;padding-top:10px;color:#8d7cf1}.sim-command input{min-width:0;border:1px solid #252d3d;background:#0a0e15;color:#eef3fa;border-radius:10px;padding:10px 11px;outline:0}.sim-command button{border:0;background:#6e55e7;color:white;border-radius:9px;width:34px;height:34px;display:grid;place-items:center}
      .sim-side{display:flex;flex-direction:column;gap:12px}.sim-panel{padding:13px}.sim-panel-title{display:grid;grid-template-columns:auto auto 1fr;gap:6px;align-items:center;border-bottom:1px solid #202735;padding-bottom:9px;margin-bottom:10px;color:#9c8cff}.sim-panel-title b{font-size:11px;color:#eef2f8}.sim-panel-title span{text-align:right;color:#7d8799;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .need-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.need-grid>div span{display:flex;justify-content:space-between;font-size:9px;color:#8a95a8}.need-grid em{font-style:normal;color:#cbd3e1}.need-grid i,.circuit-list i{height:5px;background:#181f2b;border-radius:999px;display:block;overflow:hidden;margin-top:4px}.need-grid u,.circuit-list u{height:100%;display:block;background:linear-gradient(90deg,#5e58dc,#65d2ad);border-radius:inherit}.need-grid .stress u{background:linear-gradient(90deg,#ffb15d,#ef5d72)}
      .sim-metrics{display:flex;gap:8px;margin-top:11px}.sim-metrics span{display:flex;align-items:center;gap:5px;border:1px solid #242c3a;background:#0c1119;border-radius:8px;padding:6px 8px;font-size:9px;color:#9da8ba}
      .circuit-list{display:flex;flex-direction:column;gap:7px}.circuit-list>div{display:grid;grid-template-columns:92px 1fr 30px;gap:7px;align-items:center;font-size:9px}.circuit-list span{color:#9aa5b7}.circuit-list b{text-align:right;font-size:9px}.circuit-list i{margin:0}.sim-note{display:block;color:#69768a;line-height:1.45;margin-top:10px}
      .memories{max-height:245px;overflow:auto}.memories article{display:grid;grid-template-columns:55px 1fr;gap:4px 7px;padding:8px 0;border-bottom:1px solid #171d27}.memories article b{font-size:8px;text-transform:uppercase;color:#927ff1}.memories article span{font-size:9px;color:#c4cddd}.memories article small{grid-column:2;color:#667286;font-size:8px}
      .sim-debug{max-width:1320px;margin:12px auto 0;border:1px solid #202735;border-radius:12px;background:#0a0e15;padding:8px 11px;color:#8390a4;font-size:10px}.sim-debug pre{white-space:pre-wrap;color:#c7d0df}
      @media(max-width:980px){.sim-layout{grid-template-columns:1fr}.sim-side{display:grid;grid-template-columns:1fr 1fr}.memories{grid-column:1/-1}}@media(max-width:640px){.sim-shell{padding:14px}.sim-head{align-items:flex-start;flex-direction:column}.sim-head h1{font-size:34px}.sim-layout{display:block}.sim-side{display:flex;margin-top:12px}.sim-world-foot{grid-template-columns:1fr}.sim-world-foot b{text-align:left}.need-grid{grid-template-columns:1fr}.sim-toolbar{flex-wrap:wrap}.sim-canvas-wrap,.sim-canvas{height:330px}.sim-entity-avatar{width:42px;height:42px}}
    `}</style>
  </section>;
}
