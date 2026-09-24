'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Activity, Brain, CheckCircle2, Circle, Clock3, HeartPulse, Loader2, MapPin, Pause, Play, RotateCcw, Send, Sparkles, StepForward, Users, Wallet, XCircle } from 'lucide-react';
import {
  applySimulationInstruction,
  createLifeSimulation,
  simulationClock,
  simulationSummary,
  simulateLifeScenarios,
  stepLifeSimulation,
  type LifeLocation,
  type LifeScenarioResult,
  type LifeSimulationState
} from '@/lib/life-simulation-engine';
import { dominantCircuits } from '@/lib/neurocore';
import { ENTITY_REFERENCE_IMAGE } from '@/lib/entity-self-model';
import {
  agentWorldObservation,
  autonomousLifePlan,
  createLifeAgentState,
  deterministicLifePlan,
  executeNextLifeAgentAction,
  normalizeLifeAgentState,
  parseProviderLifePlan,
  repairLifeAgentPlan,
  simulationPlannerPrompt,
  startLifeAgentPlan,
  type LifeAgentState
} from '@/lib/life-simulation-agent';
import { localBrainAdvisory } from '@/lib/browser-brain';

const STORAGE_KEY='predictlm-life-simulation-v1';
const AGENT_STORAGE_KEY='predictlm-life-agent-v1';

function loadState():LifeSimulationState{
  if(typeof window==='undefined')return createLifeSimulation();
  try{
    const explicitStart=sessionStorage.getItem('predictlm:simulation-explicit-start')==='1';
    if(explicitStart)sessionStorage.removeItem('predictlm:simulation-explicit-start');
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    const base=raw?.version===1?raw:createLifeSimulation();
    return {...base,running:explicitStart};
  }catch{return createLifeSimulation()}
}

function loadAgentState():LifeAgentState{
  if(typeof window==='undefined')return createLifeAgentState();
  try{return normalizeLifeAgentState(JSON.parse(localStorage.getItem(AGENT_STORAGE_KEY)||'null'))}
  catch{return createLifeAgentState()}
}

function needLabel(value:number){return Math.max(0,Math.min(100,Math.round(value)))}

export function GrokSimulationPanel(){
  const [state,setState]=useState<LifeSimulationState>(()=>createLifeSimulation());
  const [hydrated,setHydrated]=useState(false);
  const [command,setCommand]=useState('');
  const [manualTarget,setManualTarget]=useState<LifeLocation|null>(null);
  const [scenarios,setScenarios]=useState<LifeScenarioResult[]>([]);
  const [agent,setAgent]=useState<LifeAgentState>(()=>createLifeAgentState());
  const [agentBusy,setAgentBusy]=useState(false);
  const [agentError,setAgentError]=useState('');
  const canvas=useRef<HTMLCanvasElement>(null);

  useEffect(()=>{
    setState(loadState());
    setAgent(loadAgentState());
    setHydrated(true);
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}
  },[state,hydrated]);

  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(AGENT_STORAGE_KEY,JSON.stringify(agent))}catch{}
  },[agent,hydrated]);

  useEffect(()=>{
    if(!state.running||agent.plan?.status==='running')return;
    const timer=window.setInterval(()=>{
      setState(prev=>stepLifeSimulation(prev,10*prev.speed,manualTarget));
    },650);
    return()=>window.clearInterval(timer);
  },[state.running,state.speed,manualTarget,agent.plan?.status]);

  useEffect(()=>{
    const runningPlan=agent.plan?.status==='running';
    if(!runningPlan||agentBusy)return;
    const timer=window.setTimeout(()=>{
      const result=executeNextLifeAgentAction(state,agent);
      if(!result)return;
      setState(result.state);
      setAgent(result.agent);
      if(result.agent.plan?.status==='failed')setAgentError(result.record.message);
    },520);
    return()=>window.clearTimeout(timer);
  },[agent,state,agentBusy]);

  // Autonomia IA: cria novo plano quando o anterior termina, mas só se o usuário a ativou.
  useEffect(()=>{
    if(!hydrated||!state.running||!agent.autonomy.enabled||agentBusy)return;
    if(agent.plan?.status==='running'||agent.plan?.status==='planned')return;
    const timer=window.setTimeout(()=>{
      setAgent(prev=>{
        const normalized=normalizeLifeAgentState(prev);
        const plan=repairLifeAgentPlan(autonomousLifePlan(state,normalized,'Decida a próxima ação útil'),state,normalized);
        return {
          ...startLifeAgentPlan(normalized,plan),
          autonomy:{
            ...normalized.autonomy,
            enabled:true,
            decisionCount:normalized.autonomy.decisionCount+1,
            lastDecision:plan.summary
          }
        };
      });
    },900);
    return()=>window.clearTimeout(timer);
  },[hydrated,state,agent.plan?.status,agent.autonomy.enabled,agentBusy]);

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
    setState(next);setAgent(createLifeAgentState());setManualTarget(null);setCommand('');setScenarios([]);setAgentError('');
  }

  async function applyCommand(){
    const value=command.trim();
    if(!value||agentBusy)return;
    setAgentBusy(true);
    setAgentError('');
    if(/\b(e se|cenario|cenário|compare|possibilidades|simule alternativas)\b/i.test(value))setScenarios(simulateLifeScenarios(state,value,{deep:true}));
    else setScenarios([]);

    const wantsAutonomy=/\b(decida|aja sozinha|aja por conta|autonomia|faça o que achar melhor|faca o que achar melhor|viva sua vida)\b/i.test(value);
    const stopAutonomy=/\b(pare autonomia|desative autonomia|modo manual|pare de decidir|nao decida sozinha|não decida sozinha)\b/i.test(value);
    if(stopAutonomy){
      setAgent(prev=>{
        const normalized=normalizeLifeAgentState(prev);
        return {...normalized,plan:normalized.plan?.status==='running'?{...normalized.plan,status:'cancelled'}:normalized.plan,autonomy:{...normalized.autonomy,enabled:false,lastDecision:'Autonomia desativada pelo usuário.'}};
      });
      setCommand('');
      setAgentBusy(false);
      return;
    }

    const deterministic=wantsAutonomy?autonomousLifePlan(state,agent,value):deterministicLifePlan(value,state);
    let selected=deterministic;
    try{
      const advisory=await localBrainAdvisory(value,[],{language:'pt-BR',researchContext:agentWorldObservation(state,agent)});
      const plannerPrompt=simulationPlannerPrompt(value,state,agent);
      const controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),18000);
      try{
        const response=await fetch('/api/chat',{
          method:'POST',
          signal:controller.signal,
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            mode:'simulation-plan',
            prompt:value,
            language:'pt-BR',
            worldState:agentWorldObservation(state,agent),
            localAdvisory:advisory?.content||'',
            plannerHint:plannerPrompt
          })
        });
        if(response.ok){
          const data=await response.json();
          const providerPlan=parseProviderLifePlan(String(data?.content||''),value,state);
          if(providerPlan)selected=providerPlan;
        }
      }finally{
        window.clearTimeout(timeout);
      }
    }catch{}

    selected=repairLifeAgentPlan(selected,state,agent);
    setAgent(prev=>{
      const normalized=normalizeLifeAgentState(prev);
      const started=startLifeAgentPlan(normalized,selected);
      return wantsAutonomy
        ? {...started,autonomy:{...normalized.autonomy,enabled:true,decisionCount:normalized.autonomy.decisionCount+1,lastDecision:selected.summary}}
        : started;
    });
    setCommand('');
    setAgentBusy(false);
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
          <button onClick={()=>setManualTarget(null)} className={!manualTarget?'active':''}>Movimento Auto</button>
          <button
            onClick={()=>setAgent(prev=>{
              const normalized=normalizeLifeAgentState(prev);
              const enabled=!normalized.autonomy.enabled;
              return {...normalized,autonomy:{...normalized.autonomy,enabled,lastDecision:enabled?'Autonomia ativada pelo usuário.':'Autonomia desativada pelo usuário.'}};
            })}
            className={agent.autonomy.enabled?'active':''}
            title="Quando ativo, a IA observa o estado e escolhe novas ações após concluir cada plano."
          >IA Auto</button>
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
          <span>{agent.plan?.status==='running'?'Executando plano da IA':manualTarget?'Destino manual: '+manualTarget:'Autonomia local ativa'}</span>
          <b>{state.person.currentAction}</b>
        </div>

        <div className="sim-command">
          <Sparkles size={16}/>
          <input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applyCommand()}} placeholder="Ex.: vá ao mercado, compre comida, volte para casa, coma e depois estude"/>
          <button onClick={applyCommand} disabled={!command.trim()||agentBusy}>{agentBusy?<Loader2 className="sim-spin" size={14}/>:<Send size={14}/>}</button>
        </div>
        {(agent.plan||agent.history.length>0)?<section className="sim-agent">
          <div className="sim-agent-head">
            <div><Brain size={13}/><b>Agente executor</b></div>
            <span>{agent.plan?agent.plan.status:'idle'} · {agent.plan?.source||'local'}</span>
          </div>
          {agent.plan?<div className="sim-plan">
            <strong>{agent.plan.objective}</strong>
            <small>{agent.plan.summary}</small>
            <div className="sim-plan-steps">{agent.plan.actions.map((action,index)=>{
              const done=index<agent.plan!.cursor;
              const current=index===agent.plan!.cursor&&agent.plan!.status==='running';
              const failed=agent.plan!.status==='failed'&&index===Math.max(0,agent.plan!.cursor-1);
              return <div key={action.id} className={current?'current':failed?'failed':done?'done':''}>
                {failed?<XCircle size={12}/>:done?<CheckCircle2 size={12}/>:current?<Loader2 className="sim-spin" size={12}/>:<Circle size={12}/>}
                <span><b>{action.type}</b>{action.target?' → '+action.target:''}</span>
                <small>{action.reason||action.text||''}</small>
              </div>;
            })}</div>
          </div>:null}
          {agentError?<p className="sim-agent-error">{agentError}</p>:null}
          {agent.history.length?<details className="sim-agent-log"><summary>Histórico de ações · {agent.history.length}</summary>
            {agent.history.slice(-8).reverse().map(row=><div key={row.id}><b>{row.ok?'OK':'ERRO'}</b><span>{row.action.type}</span><small>{row.message}</small></div>)}
          </details>:null}
        </section>:null}
        {scenarios.length>0?<section className="sim-scenarios">
          <div className="sim-scenario-head"><Brain size={13}/><b>Scenario Lab</b><span>{scenarios.length} trajetórias · contrafactuais, não previsões</span></div>
          <div className="sim-scenario-grid">{scenarios.map(item=><article key={item.id}>
            <header><b>{item.label}</b><span>{item.horizonMinutes} min</span></header>
            <p>{item.premise}</p>
            <strong>{item.summary}</strong>
            <small>{item.signals.join(' · ')}</small>
          </article>)}</div>
        </section>:null}

      </main>

      <aside className="sim-side">
        <section className="sim-panel">
          <div className="sim-panel-title"><HeartPulse size={14}/><b>Estado</b><span>{state.lastEvent}</span></div>
          <div className="need-grid">{needs.map(([label,value])=><div key={label} className={label==='Estresse'?'stress':''}><span><b>{label}</b><em>{needLabel(value)}</em></span><i><u style={{width:needLabel(value)+'%'}}/></i></div>)}</div>
          <div className="sim-metrics">
            <span><Wallet size={12}/>R$ {state.person.money.toFixed(0)}</span>
            <span><Users size={12}/>{relation.name}: {relation.affinity}%</span>
            <span>Comida: {agent.inventory.food}</span>
            <span>Conhecimento: {agent.knowledge}</span>
          </div>
          <div className="sim-agent-vitals">
            <span>Carreira <b>{agent.skills.career}</b></span>
            <span>Culinária <b>{agent.skills.cooking}</b></span>
            <span>Fitness <b>{agent.skills.fitness}</b></span>
            <span>Lógica <b>{agent.skills.logic}</b></span>
            <span>Social <b>{agent.skills.social}</b></span>
            <span>Criatividade <b>{agent.skills.creativity}</b></span>
            <span>Casa limpa <b>{agent.home.cleanliness}</b></span>
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
      .sim-command{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border-top:1px solid #202735;margin-top:9px;padding-top:10px;color:#8d7cf1}.sim-spin{animation:simspin .8s linear infinite}@keyframes simspin{to{transform:rotate(360deg)}}.sim-command input{min-width:0;border:1px solid #252d3d;background:#0a0e15;color:#eef3fa;border-radius:10px;padding:10px 11px;outline:0}.sim-command button{border:0;background:#6e55e7;color:white;border-radius:9px;width:34px;height:34px;display:grid;place-items:center}
      .sim-agent{margin-top:10px;border:1px solid #252d3d;border-radius:13px;background:#0a0f17;padding:11px}.sim-agent-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1c2432;padding-bottom:8px}.sim-agent-head>div{display:flex;gap:6px;align-items:center}.sim-agent-head b{font-size:10px}.sim-agent-head span{font-size:9px;color:#8290a5}.sim-plan{padding-top:9px;display:grid;gap:7px}.sim-plan>strong{font-size:11px}.sim-plan>small{color:#7c899e;font-size:9px}.sim-plan-steps{display:grid;gap:5px}.sim-plan-steps>div{display:grid;grid-template-columns:16px 145px 1fr;gap:6px;align-items:center;border:1px solid #1c2430;border-radius:8px;padding:6px 7px;color:#778398}.sim-plan-steps>div.done{color:#66cfae}.sim-plan-steps>div.current{border-color:#7560e6;color:#c7bcff;background:#141128}.sim-plan-steps>div.failed{border-color:#a64f62;color:#ff91a6}.sim-plan-steps span{font-size:9px}.sim-plan-steps small{font-size:8px;color:#6f7c90}.sim-agent-error{font-size:9px;color:#ff8ba0}.sim-agent-log{margin-top:8px;color:#8693a8;font-size:9px}.sim-agent-log>div{display:grid;grid-template-columns:34px 70px 1fr;gap:6px;padding:5px 0;border-top:1px solid #171e29}.sim-agent-log b{color:#76d9b7}.sim-agent-log small{color:#778398}
      .sim-side{display:flex;flex-direction:column;gap:12px}.sim-panel{padding:13px}.sim-panel-title{display:grid;grid-template-columns:auto auto 1fr;gap:6px;align-items:center;border-bottom:1px solid #202735;padding-bottom:9px;margin-bottom:10px;color:#9c8cff}.sim-panel-title b{font-size:11px;color:#eef2f8}.sim-panel-title span{text-align:right;color:#7d8799;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .need-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.need-grid>div span{display:flex;justify-content:space-between;font-size:9px;color:#8a95a8}.need-grid em{font-style:normal;color:#cbd3e1}.need-grid i,.circuit-list i{height:5px;background:#181f2b;border-radius:999px;display:block;overflow:hidden;margin-top:4px}.need-grid u,.circuit-list u{height:100%;display:block;background:linear-gradient(90deg,#5e58dc,#65d2ad);border-radius:inherit}.need-grid .stress u{background:linear-gradient(90deg,#ffb15d,#ef5d72)}
      .sim-metrics{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}.sim-metrics span{display:flex;align-items:center;gap:5px;border:1px solid #242c3a;background:#0c1119;border-radius:8px;padding:6px 8px;font-size:9px;color:#9da8ba}
      .sim-agent-vitals{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px}.sim-agent-vitals span{display:flex;justify-content:space-between;border:1px solid #1d2532;background:#0b1017;border-radius:7px;padding:5px 7px;font-size:8px;color:#7f8ba0}.sim-agent-vitals b{color:#c9d3e2}.circuit-list{display:flex;flex-direction:column;gap:7px}.circuit-list>div{display:grid;grid-template-columns:92px 1fr 30px;gap:7px;align-items:center;font-size:9px}.circuit-list span{color:#9aa5b7}.circuit-list b{text-align:right;font-size:9px}.circuit-list i{margin:0}.sim-note{display:block;color:#69768a;line-height:1.45;margin-top:10px}
      .memories{max-height:245px;overflow:auto}.memories article{display:grid;grid-template-columns:55px 1fr;gap:4px 7px;padding:8px 0;border-bottom:1px solid #171d27}.memories article b{font-size:8px;text-transform:uppercase;color:#927ff1}.memories article span{font-size:9px;color:#c4cddd}.memories article small{grid-column:2;color:#667286;font-size:8px}
      .sim-debug{max-width:1320px;margin:12px auto 0;border:1px solid #202735;border-radius:12px;background:#0a0e15;padding:8px 11px;color:#8390a4;font-size:10px}.sim-debug pre{white-space:pre-wrap;color:#c7d0df}
      @media(max-width:980px){.sim-layout{grid-template-columns:1fr}.sim-side{display:grid;grid-template-columns:1fr 1fr}.memories{grid-column:1/-1}}@media(max-width:640px){.sim-scenario-grid{grid-template-columns:1fr}.sim-shell{padding:14px}.sim-head{align-items:flex-start;flex-direction:column}.sim-head h1{font-size:34px}.sim-layout{display:block}.sim-side{display:flex;margin-top:12px}.sim-world-foot{grid-template-columns:1fr}.sim-world-foot b{text-align:left}.need-grid{grid-template-columns:1fr}.sim-toolbar{flex-wrap:wrap}.sim-canvas-wrap,.sim-canvas{height:330px}.sim-entity-avatar{width:42px;height:42px}}
    `}</style>
  </section>;
}
