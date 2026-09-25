'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Activity, Brain, Bug, CheckCircle2, Circle, Clock3, HeartPulse, Loader2, MapPin, Pause, Play, RotateCcw, Send, Sparkles, StepForward, Users, Wallet, XCircle, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import {
  advanceLifeWorldPassive,
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
import {cameraForFocus,placeVisual,pointInPolygon,projectedPlacePolygon,projectIsoPoint,type IsoCamera} from '@/lib/life-sim-25d';
import {
  LIFE_WORLD_HEIGHT,
  LIFE_WORLD_WIDTH,
  WORLD_OBJECTS,
  perceiveFlyWorld,
  perceiveHumanWorld
} from '@/lib/life-world-open';
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
import {loadCognitiveState,saveCognitiveState} from '@/lib/cognitive/cognitive-memory';
import {advanceCognitiveWorkspace,recordPerceptionMemory} from '@/lib/cognitive/cognitive-workspace';
import {createFlySimulationState,flySimulationBubble,stepFlySimulation,type FlySimulationState} from '@/lib/cognitive/fly-simulation';

const STORAGE_KEY='predictlm-life-simulation-v1';
const AGENT_STORAGE_KEY='predictlm-life-agent-v1';
const FLY_STORAGE_KEY='predictlm-life-fly-agent-v1';

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

function loadFlyState():FlySimulationState{
  if(typeof window==='undefined')return createFlySimulationState();
  try{
    const raw=JSON.parse(localStorage.getItem(FLY_STORAGE_KEY)||'null');
    return raw?.version===1?raw:createFlySimulationState();
  }catch{return createFlySimulationState()}
}

function needLabel(value:number){return Math.max(0,Math.min(100,Math.round(value)))}

export function GrokSimulationPanel(){
  const [state,setState]=useState<LifeSimulationState>(()=>createLifeSimulation());
  const [hydrated,setHydrated]=useState(false);
  const [command,setCommand]=useState('');
  const [manualTarget,setManualTarget]=useState<LifeLocation|null>(null);
  const [scenarios,setScenarios]=useState<LifeScenarioResult[]>([]);
  const [agent,setAgent]=useState<LifeAgentState>(()=>createLifeAgentState());
  const [fly,setFly]=useState<FlySimulationState>(()=>createFlySimulationState());
  const [agentBusy,setAgentBusy]=useState(false);
  const [agentError,setAgentError]=useState('');
  const [cameraZoom,setCameraZoom]=useState(1);
  const [cameraFocus,setCameraFocus]=useState<'world'|'human'|'fly'>('world');
  const canvas=useRef<HTMLCanvasElement>(null);

  useEffect(()=>{
    const nextState=loadState();
    setState(nextState);
    setAgent(loadAgentState());
    const localFly=loadFlyState();
    setFly(localFly);
    loadCognitiveState().then(cognitive=>{
      setFly(prev=>({...prev,core:cognitive.fly}));
    }).catch(()=>{});
    try{
      const focus=sessionStorage.getItem('predictlm:simulation-focus');
      if(focus==='fly')sessionStorage.removeItem('predictlm:simulation-focus');
    }catch{}
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
    if(!hydrated)return;
    try{localStorage.setItem(FLY_STORAGE_KEY,JSON.stringify(fly))}catch{}
    if(fly.tick%4!==0)return;
    const timer=window.setTimeout(()=>{
      loadCognitiveState().then(current=>saveCognitiveState({...current,fly:fly.core,lastUpdated:Date.now()})).catch(()=>{});
    },120);
    return()=>window.clearTimeout(timer);
  },[fly,hydrated]);

  useEffect(()=>{
    if(!hydrated)return;
    let pending='';
    try{
      pending=sessionStorage.getItem('predictlm:simulation-command')||'';
      if(pending)sessionStorage.removeItem('predictlm:simulation-command');
    }catch{}
    if(!pending)return;
    setCommand(pending);
    const timer=window.setTimeout(()=>{void applyCommand(pending)},120);
    return()=>window.clearTimeout(timer);
  },[hydrated]);

  useEffect(()=>{
    if(!state.running||agent.plan?.status==='running')return;
    const timer=window.setInterval(()=>{
      setState(prev=>manualTarget
        ? stepLifeSimulation(prev,10*prev.speed,manualTarget)
        : advanceLifeWorldPassive(prev,10*prev.speed));
    },650);
    return()=>window.clearInterval(timer);
  },[state.running,state.speed,manualTarget,agent.plan?.status]);

  useEffect(()=>{
    if(!state.running)return;
    const timer=window.setInterval(()=>{
      setFly(prev=>stepFlySimulation(prev,{
        personX:state.person.x,
        personY:state.person.y,
        personAction:state.person.currentAction,
        personLocation:String(state.person.location),
        worldState:state,
        width:LIFE_WORLD_WIDTH,
        height:LIFE_WORLD_HEIGHT
      }));
    },260);
    return()=>window.clearInterval(timer);
  },[state.running,state.person.x,state.person.y,state.person.currentAction,state.person.location]);

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
        const plan=repairLifeAgentPlan(autonomousLifePlan(state,normalized,'Decida a próxima ação útil',fly),state,normalized);
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
  },[hydrated,state,agent.plan?.status,agent.autonomy.enabled,agentBusy,fly.x,fly.y]);

  useEffect(()=>{
    if(!hydrated||state.tick===0||state.tick%6!==0)return;
    const humanSnapshot=perceiveHumanWorld(state,fly);
    const flySnapshot=perceiveFlyWorld(fly,state);
    const timer=window.setTimeout(()=>{
      loadCognitiveState().then(current=>{
        let next=advanceCognitiveWorkspace(current,[
          'SIMULAÇÃO',
          humanSnapshot.summary,
          'Ação humana: '+state.person.currentAction,
          'Humor: '+state.person.mood
        ].join(' · '));
        next={...next,fly:fly.core,lastUpdated:Date.now()};
        next=recordPerceptionMemory(next,'human',humanSnapshot.summary+' Ação: '+state.person.currentAction,.7);
        next=recordPerceptionMemory(next,'fly',flySnapshot.summary+' Comportamento: '+fly.behavior,.72);
        return saveCognitiveState(next);
      }).catch(()=>{});
    },150);
    return()=>window.clearTimeout(timer);
  },[hydrated,state.tick,state.person.x,state.person.y,state.person.heading,fly.x,fly.y,fly.vx,fly.vy]);

  useEffect(()=>{
    const el=canvas.current;
    if(!el)return;
    const rect=el.getBoundingClientRect();
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const width=Math.max(640,Math.floor(rect.width));
    const height=430;
    el.width=width*dpr;el.height=height*dpr;
    const ctx=el.getContext('2d');
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);

    const camera:IsoCamera=cameraFocus==='human'
      ? cameraForFocus(state.person,width,height,cameraZoom)
      : cameraFocus==='fly'
        ? cameraForFocus({x:fly.x,y:fly.y,z:fly.z||36},width,height,cameraZoom)
        : {zoom:cameraZoom,offsetX:0,offsetY:10};

    const poly=(points:Array<{x:number;y:number}>,fill:string,stroke?:string)=>{
      if(!points.length)return;
      ctx.beginPath();
      ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
      ctx.closePath();
      ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
    };

    const line=(a:{x:number;y:number},b:{x:number;y:number},stroke:string,w=1)=>{
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();
    };

    const iso=(x:number,y:number,z=0)=>projectIsoPoint(x,y,z,width,height,camera);

    const drawBox=(x:number,y:number,w:number,h:number,z:number,color:string,side:string)=>{
      const a=iso(x,y,z),b=iso(x+w,y,z),d=iso(x,y+h,z),c1=iso(x+w,y+h,z);
      const a0=iso(x,y,0),b0=iso(x+w,y,0),d0=iso(x,y+h,0),c0=iso(x+w,y+h,0);
      poly([a,b,c1,d],color,'rgba(255,255,255,.12)');
      poly([d,c1,c0,d0],side,'rgba(0,0,0,.18)');
      poly([b,c1,c0,b0],side,'rgba(0,0,0,.18)');
    };

    const drawFurniture=(kind:string,p:any)=>{
      const cx=p.x+p.w*.5,cy=p.y+p.h*.54;
      if(kind==='home'){
        drawBox(p.x+p.w*.16,p.y+p.h*.2,p.w*.34,p.h*.24,8,'#d9b7b0','#9f7c77');
        drawBox(p.x+p.w*.58,p.y+p.h*.54,p.w*.18,p.h*.18,12,'#7a6254','#57463c');
        drawBox(p.x+p.w*.55,p.y+p.h*.17,p.w*.22,p.h*.17,18,'#6f7781','#4f5660');
      }else if(kind==='office'){
        drawBox(p.x+p.w*.2,p.y+p.h*.28,p.w*.28,p.h*.15,10,'#707a88','#4f5863');
        drawBox(p.x+p.w*.56,p.y+p.h*.5,p.w*.24,p.h*.15,10,'#707a88','#4f5863');
        drawBox(p.x+p.w*.31,p.y+p.h*.58,p.w*.12,p.h*.12,17,'#586779','#3e4855');
      }else if(kind==='cafe'){
        for(const [ox,oy] of [[.28,.32],[.66,.55]]){drawBox(p.x+p.w*ox,p.y+p.h*oy,p.w*.13,p.h*.13,9,'#8b6048','#624333')}
      }else if(kind==='park'){
        drawBox(p.x+p.w*.26,p.y+p.h*.58,p.w*.28,p.h*.08,5,'#8a6546','#624732');
        for(const [ox,oy] of [[.2,.25],[.72,.34],[.58,.7]]){
          const base=iso(p.x+p.w*ox,p.y+p.h*oy,0);
          ctx.fillStyle='#42684a';ctx.beginPath();ctx.arc(base.x,base.y-18*camera.zoom,12*camera.zoom,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#6a4f38';ctx.fillRect(base.x-2*camera.zoom,base.y-17*camera.zoom,4*camera.zoom,18*camera.zoom);
        }
      }else if(kind==='market'){
        for(const ox of [.2,.48,.72])drawBox(p.x+p.w*ox,p.y+p.h*.28,p.w*.1,p.h*.48,14,'#8d959d','#626970');
      }else if(kind==='clinic'){
        drawBox(p.x+p.w*.2,p.y+p.h*.48,p.w*.34,p.h*.16,10,'#d5e8e8','#93b1b2');
        drawBox(p.x+p.w*.65,p.y+p.h*.25,p.w*.12,p.h*.32,18,'#a8c6c8','#759597');
      }else if(kind==='library'){
        for(const ox of [.17,.68])drawBox(p.x+p.w*ox,p.y+p.h*.16,p.w*.11,p.h*.54,22,'#6c5140','#49372c');
        drawBox(p.x+p.w*.38,p.y+p.h*.5,p.w*.23,p.h*.15,9,'#856c58','#5d4a3b');
      }
      const center=iso(cx,cy,1);
      ctx.fillStyle='rgba(255,255,255,.05)';ctx.beginPath();ctx.ellipse(center.x,center.y,22*camera.zoom,8*camera.zoom,0,0,Math.PI*2);ctx.fill();
    };

    const drawWorldObject=(obj:(typeof WORLD_OBJECTS)[number])=>{
      const p=iso(obj.x,obj.y,0);
      const s=Math.max(.72,camera.zoom);
      if(obj.kind==='tree'){
        ctx.fillStyle='#6b4c32';ctx.fillRect(p.x-2*s,p.y-24*s,4*s,24*s);
        ctx.fillStyle='#4f8b5d';ctx.beginPath();ctx.arc(p.x,p.y-30*s,14*s,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#6ba873';ctx.beginPath();ctx.arc(p.x-7*s,p.y-35*s,8*s,0,Math.PI*2);ctx.fill();
        return;
      }
      if(obj.kind==='lamp'){
        ctx.strokeStyle='#66727d';ctx.lineWidth=3*s;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y-42*s);ctx.stroke();
        ctx.fillStyle='#ffe6a0';ctx.beginPath();ctx.arc(p.x,p.y-45*s,5*s,0,Math.PI*2);ctx.fill();return;
      }
      if(obj.kind==='fountain'){
        ctx.fillStyle='#6e9da7';ctx.beginPath();ctx.ellipse(p.x,p.y,17*s,7*s,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#83d5e4';ctx.beginPath();ctx.arc(p.x,p.y-8*s,5*s,0,Math.PI*2);ctx.fill();return;
      }
      const colors:Record<string,[string,string]>={
        bed:['#d9b9b4','#9b7c78'],sofa:['#8d7284','#634e5b'],tv:['#303841','#1f252c'],
        fridge:['#d9e0e4','#98a2a9'],stove:['#8b9298','#5c6368'],shower:['#9bcfd4','#628e94'],
        computer:['#52677f','#344353'],phone:['#343942','#20242a'],desk:['#866b51','#5d4937'],
        bench:['#8a6546','#60462f'],bookshelf:['#6c5140','#49362b'],table:['#87664e','#604736'],
        coffee:['#9a6850','#6c4838'],shelf:['#8f969c','#62686d'],treadmill:['#555d65','#343a40'],
        clinic_bed:['#c7dddd','#88aaac'],plant:['#4f8658','#31583a'],art:['#9a79ad','#644c72'],
        trash:['#555b60','#373b3f'],door:['#77543e','#52392b']
      };
      const [top,side]=colors[obj.kind]||['#777','#555'];
      drawBox(obj.x-obj.w/2,obj.y-obj.h/2,obj.w,obj.h,Math.max(5,obj.z),top,side);
      if(obj.kind==='computer'){
        const sp=iso(obj.x,obj.y,obj.z+10);ctx.fillStyle='#79b7ff';ctx.fillRect(sp.x-7*s,sp.y-6*s,14*s,8*s);
      }else if(obj.kind==='phone'){
        const sp=iso(obj.x,obj.y,obj.z+2);ctx.fillStyle='#9ae7ff';ctx.fillRect(sp.x-2*s,sp.y-4*s,4*s,7*s);
      }else if(obj.kind==='plant'){
        const sp=iso(obj.x,obj.y,obj.z+8);ctx.fillStyle='#67a76d';ctx.beginPath();ctx.arc(sp.x,sp.y-6*s,7*s,0,Math.PI*2);ctx.fill();
      }
    };

    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,'#31445d');
    sky.addColorStop(.48,'#1d2b3b');
    sky.addColorStop(1,'#10161d');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);

    // Ground lot.
    const ground=[iso(0,0),iso(LIFE_WORLD_WIDTH,0),iso(LIFE_WORLD_WIDTH,LIFE_WORLD_HEIGHT),iso(0,LIFE_WORLD_HEIGHT)];
    poly(ground,'#456b52','#5d8768');

    // Isometric paving grid.
    for(let x=0;x<=LIFE_WORLD_WIDTH;x+=80)line(iso(x,0),iso(x,LIFE_WORLD_HEIGHT),'rgba(220,240,226,.10)');
    for(let y=0;y<=LIFE_WORLD_HEIGHT;y+=60)line(iso(0,y),iso(LIFE_WORLD_WIDTH,y),'rgba(220,240,226,.10)');

    // Paths between lots, behind buildings.
    ctx.lineCap='round';
    const centers=new Map(state.places.map(p=>[p.id,{x:p.x+p.w/2,y:p.y+p.h/2}]));
    const routes:Array<[LifeLocation,LifeLocation]>=[
      ['Casa','Café'],['Café','Trabalho'],['Café','Mercado'],['Parque','Café'],['Clínica','Café'],['Café','Biblioteca']
    ];
    for(const [a,b] of routes){
      const pa=centers.get(a),pb=centers.get(b);if(!pa||!pb)continue;
      line(iso(pa.x,pa.y),iso(pb.x,pb.y),'rgba(210,198,175,.38)',14*camera.zoom);
      line(iso(pa.x,pa.y),iso(pb.x,pb.y),'rgba(230,221,203,.28)',7*camera.zoom);
    }

    // Lots/rooms sorted back-to-front for depth.
    const sorted=[...state.places].sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    for(const p of sorted){
      const visual=placeVisual(p.id);
      const floor=projectedPlacePolygon(p,width,height,camera);
      const h=visual.height;
      const active=p.id===state.person.location;
      const target=p.id===manualTarget;

      const shadow=floor.map(pt=>({x:pt.x+8*camera.zoom,y:pt.y+12*camera.zoom}));
      poly(shadow,'rgba(0,0,0,.22)');
      poly(floor,visual.floor,target?'#d5b8ff':active?'#78ebc6':'rgba(255,255,255,.13)');

      const p1=floor[0],p2=floor[1],p4=floor[3];
      const p1u=iso(p.x,p.y,h),p2u=iso(p.x+p.w,p.y,h),p4u=iso(p.x,p.y+p.h,h);
      poly([p1,p2,p2u,p1u],visual.wallLight,'rgba(255,255,255,.18)');
      poly([p1,p4,p4u,p1u],visual.wallDark,'rgba(255,255,255,.12)');

      drawFurniture(visual.furniture,p);

      const label=iso(p.x+p.w*.5,p.y+p.h*.5,h+4);
      ctx.textAlign='center';
      ctx.font=`600 ${Math.max(9,11*camera.zoom)}px ui-sans-serif,system-ui`;
      ctx.fillStyle=active?'#eafff8':'#f1f4f7';
      ctx.fillText(p.label,label.x,label.y-6);
      if(active||target){
        ctx.fillStyle=target?'#c9a8ff':'#72e0bd';
        ctx.beginPath();ctx.arc(label.x,label.y+2,3.5*camera.zoom,0,Math.PI*2);ctx.fill();
      }
    }

    // Interactive world objects are rendered independently from the lots.
    // They are also the same objects used by the human/fly vision systems.
    for(const obj of [...WORLD_OBJECTS].sort((a,b)=>(a.x+a.y)-(b.x+b.y)))drawWorldObject(obj);

    // Perception fields: human cone + fly panoramic sensing.
    const hpGround=iso(state.person.x,state.person.y,0);
    const humanHeading=state.person.heading||0;
    const ray=(angle:number,range:number)=>iso(
      Math.max(0,Math.min(LIFE_WORLD_WIDTH,state.person.x+Math.cos(angle)*range)),
      Math.max(0,Math.min(LIFE_WORLD_HEIGHT,state.person.y+Math.sin(angle)*range)),
      0
    );
    ctx.fillStyle='rgba(110,240,179,.055)';
    poly([hpGround,ray(humanHeading-1.09,190),ray(humanHeading+1.09,190)],'rgba(110,240,179,.055)');

    const flyGroundVision=iso(fly.x,fly.y,0);
    ctx.strokeStyle='rgba(187,140,255,.10)';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(flyGroundVision.x,flyGroundVision.y,52*camera.zoom,22*camera.zoom,0,0,Math.PI*2);ctx.stroke();

    // Human character rendered inside the world.
    const hp=iso(state.person.x,state.person.y,0);
    ctx.fillStyle='rgba(0,0,0,.34)';
    ctx.beginPath();ctx.ellipse(hp.x,hp.y+6*camera.zoom,12*camera.zoom,5*camera.zoom,0,0,Math.PI*2);ctx.fill();

    const humanScale=camera.zoom;
    ctx.strokeStyle='#18212b';ctx.lineWidth=4*humanScale;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(hp.x-3*humanScale,hp.y-13*humanScale);ctx.lineTo(hp.x-8*humanScale,hp.y+1*humanScale);ctx.stroke();
    ctx.beginPath();ctx.moveTo(hp.x+3*humanScale,hp.y-13*humanScale);ctx.lineTo(hp.x+8*humanScale,hp.y+1*humanScale);ctx.stroke();
    ctx.fillStyle='#6e55e7';
    ctx.beginPath();ctx.roundRect(hp.x-8*humanScale,hp.y-31*humanScale,16*humanScale,22*humanScale,5*humanScale);ctx.fill();
    ctx.strokeStyle='#d8ad91';ctx.lineWidth=3*humanScale;
    ctx.beginPath();ctx.moveTo(hp.x-7*humanScale,hp.y-24*humanScale);ctx.lineTo(hp.x-14*humanScale,hp.y-15*humanScale);ctx.stroke();
    ctx.beginPath();ctx.moveTo(hp.x+7*humanScale,hp.y-24*humanScale);ctx.lineTo(hp.x+14*humanScale,hp.y-15*humanScale);ctx.stroke();
    ctx.fillStyle='#d8ad91';ctx.beginPath();ctx.arc(hp.x,hp.y-39*humanScale,7*humanScale,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#2b2633';ctx.beginPath();ctx.arc(hp.x,hp.y-41*humanScale,7.2*humanScale,Math.PI,Math.PI*2);ctx.fill();

    // Original life-status marker (not copied game art).
    const markerY=hp.y-64*humanScale;
    ctx.fillStyle=state.needs.energy<35?'#ff856f':'#6ff0b3';
    poly([
      {x:hp.x,y:markerY-8*humanScale},
      {x:hp.x+6*humanScale,y:markerY},
      {x:hp.x,y:markerY+8*humanScale},
      {x:hp.x-6*humanScale,y:markerY}
    ],ctx.fillStyle as string,'rgba(255,255,255,.55)');

    // Human action bubble.
    const bubble=state.person.currentAction;
    ctx.textAlign='left';ctx.font='10px ui-sans-serif,system-ui';
    const shown=bubble.length>42?bubble.slice(0,42)+'…':bubble;
    const bw=Math.min(250,Math.max(120,ctx.measureText(shown).width+22));
    const bx=Math.max(8,Math.min(width-bw-8,hp.x-bw/2));
    const by=Math.max(8,hp.y-101*humanScale);
    ctx.fillStyle='rgba(10,13,18,.92)';ctx.strokeStyle='#465164';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,bw,29,9);ctx.fill();ctx.stroke();
    ctx.fillStyle='#e4e9f1';ctx.fillText(shown,bx+11,by+18);

    // FlyWire agent in real 2.5D flight height.
    const groundFly=iso(fly.x,fly.y,0);
    const fp=iso(fly.x,fly.y,fly.z||36);
    ctx.fillStyle='rgba(0,0,0,.24)';
    ctx.beginPath();ctx.ellipse(groundFly.x,groundFly.y,8*camera.zoom,3*camera.zoom,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(205,190,255,.25)';ctx.setLineDash([3,3]);
    line(groundFly,fp,'rgba(205,190,255,.28)',1);
    ctx.setLineDash([]);

    ctx.save();
    ctx.translate(fp.x,fp.y);
    ctx.rotate(Math.atan2(fly.vy,fly.vx||.001));
    const fs=Math.max(.8,camera.zoom);
    ctx.globalAlpha=.76;ctx.fillStyle='#e9f5ff';
    ctx.beginPath();ctx.ellipse(-3*fs,-5*fs,8*fs,3.2*fs,-.35,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(-3*fs,5*fs,8*fs,3.2*fs,.35,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#191820';
    ctx.beginPath();ctx.ellipse(0,0,8*fs,4.5*fs,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#bb8cff';ctx.beginPath();ctx.arc(6*fs,-2*fs,2.3*fs,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(6*fs,2*fs,2.3*fs,0,Math.PI*2);ctx.fill();
    ctx.restore();

    const flyText=flySimulationBubble(fly)+' · '+Math.round(fly.z||36)+'cm';
    ctx.textAlign='left';ctx.font='9px ui-sans-serif,system-ui';
    const fw=Math.max(96,ctx.measureText(flyText).width+16);
    const fbx=Math.max(6,Math.min(width-fw-6,fp.x-fw/2));
    const fby=Math.max(6,fp.y-31);
    ctx.fillStyle='rgba(22,16,30,.9)';ctx.strokeStyle='#7458a0';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(fbx,fby,fw,23,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='#e4d5ff';ctx.fillText(flyText,fbx+8,fby+15);

    // Depth vignette/UI feel.
    const vignette=ctx.createRadialGradient(width*.5,height*.46,width*.08,width*.5,height*.46,width*.72);
    vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.32)');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  },[state,manualTarget,fly,cameraZoom,cameraFocus]);

  const circuits=useMemo(()=>dominantCircuits(state.neuro,6),[state.neuro]);
  const humanVision=useMemo(()=>perceiveHumanWorld(state,fly),[
    state.person.x,state.person.y,state.person.heading,state.person.currentAction,state.person.location,
    fly.x,fly.y
  ]);
  const flyVision=useMemo(()=>perceiveFlyWorld(fly,state),[
    fly.x,fly.y,fly.vx,fly.vy,state.person.x,state.person.y,state.person.heading
  ]);
  const relation=state.relationships[0];

  function tick(){
    setState(prev=>stepLifeSimulation(prev,10*prev.speed,manualTarget));
  }

  function reset(){
    const next=createLifeSimulation();
    setState(next);setAgent(createLifeAgentState());setFly(createFlySimulationState());setManualTarget(null);setCommand('');setScenarios([]);setAgentError('');
  }

  async function applyCommand(override?:string){
    const value=(override??command).trim();
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
        return {...normalized,plan:normalized.plan?.status==='running'?{...normalized.plan,status:'cancelled'}:normalized.plan,autonomy:{...normalized.autonomy,enabled:false,manualOverride:true,lastDecision:'Autonomia desativada pelo usuário.'}};
      });
      setCommand('');
      setAgentBusy(false);
      return;
    }

    const deterministic=wantsAutonomy?autonomousLifePlan(state,agent,value,fly):deterministicLifePlan(value,state);
    let selected=deterministic;
    try{
      const advisory=await localBrainAdvisory(value,[],{language:'pt-BR',researchContext:agentWorldObservation(state,agent,fly)});
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
            worldState:agentWorldObservation(state,agent,fly),
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
        ? {...started,autonomy:{...normalized.autonomy,enabled:true,manualOverride:true,decisionCount:normalized.autonomy.decisionCount+1,lastDecision:selected.summary}}
        : started;
    });
    setCommand('');
    setAgentBusy(false);
  }

  function pickPlace(event:React.MouseEvent<HTMLCanvasElement>){
    const el=canvas.current;if(!el)return;
    const rect=el.getBoundingClientRect();
    const width=Math.max(640,Math.floor(rect.width));
    const height=430;
    const sx=(event.clientX-rect.left)*(width/rect.width);
    const sy=(event.clientY-rect.top)*(height/rect.height);
    const camera:IsoCamera=cameraFocus==='human'
      ? cameraForFocus(state.person,width,height,cameraZoom)
      : cameraFocus==='fly'
        ? cameraForFocus({x:fly.x,y:fly.y,z:fly.z||36},width,height,cameraZoom)
        : {zoom:cameraZoom,offsetX:0,offsetY:10};
    const found=[...state.places].reverse().find(p=>pointInPolygon({x:sx,y:sy},projectedPlacePolygon(p,width,height,camera)));
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
        <p>Life-sim 2.5D open world · Humano + FlyWire Agent · visão local · memória persistente</p>
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
          <button onClick={()=>setCameraFocus(cameraFocus==='human'?'world':'human')} className={cameraFocus==='human'?'active':''} title="Seguir humano"><Crosshair size={13}/>Humano</button>
          <button onClick={()=>setCameraFocus(cameraFocus==='fly'?'world':'fly')} className={cameraFocus==='fly'?'active':''} title="Seguir mosca"><Bug size={13}/>Mosca</button>
          <button onClick={()=>setCameraZoom(z=>Math.max(.72,Math.round((z-.12)*100)/100))} title="Afastar câmera"><ZoomOut size={13}/></button>
          <button onClick={()=>setCameraZoom(z=>Math.min(1.5,Math.round((z+.12)*100)/100))} title="Aproximar câmera"><ZoomIn size={13}/></button>
          <button
            onClick={()=>setAgent(prev=>{
              const normalized=normalizeLifeAgentState(prev);
              const enabled=!normalized.autonomy.enabled;
              return {...normalized,autonomy:{...normalized.autonomy,enabled,manualOverride:true,lastDecision:enabled?'Autonomia ativada pelo usuário.':'Autonomia desativada pelo usuário.'}};
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
          <canvas ref={canvas} onClick={pickPlace} className="sim-canvas" aria-label="Simulação isométrica 2.5D com humano e mosca"/>
          <div className="sim-camera-badge">
            <span>2.5D</span>
            <b>{Math.round(cameraZoom*100)}%</b>
            <em>{cameraFocus==='world'?'mundo':cameraFocus}</em>
          </div>
        </div>
        <div className="sim-world-foot">
          <span><MapPin size={12}/>{state.person.location}</span>
          <span>{agent.plan?.status==='running'?'Executando plano da IA':manualTarget?'Destino manual: '+manualTarget:'Autonomia local ativa'}</span>
          <span>Mosca: {fly.behavior} · {fly.targetLabel}</span>
          <span>Visão: {humanVision.visible.length} humano · {flyVision.visible.length} mosca</span>
          <b>{state.person.currentAction}</b>
        </div>

        <div className="sim-command">
          <Sparkles size={16}/>
          <input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')applyCommand()}} placeholder="Ex.: vá ao mercado, compre comida, volte para casa, coma e depois estude"/>
          <button onClick={()=>{void applyCommand()}} disabled={!command.trim()||agentBusy}>{agentBusy?<Loader2 className="sim-spin" size={14}/>:<Send size={14}/>}</button>
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

        <section className="sim-panel">
          <div className="sim-panel-title"><Bug size={14}/><b>Mosca Predict</b><span>FlyWire FAFB v783</span></div>
          <div className="circuit-list">
            <div><span>salience</span><i><u style={{width:Math.round(fly.core.salience*100)+'%'}}/></i><b>{Math.round(fly.core.salience*100)}%</b></div>
            <div><span>exploration</span><i><u style={{width:Math.round(fly.core.exploration*100)+'%'}}/></i><b>{Math.round(fly.core.exploration*100)}%</b></div>
            <div><span>threat</span><i><u style={{width:Math.round(fly.core.threat*100)+'%'}}/></i><b>{Math.round(fly.core.threat*100)}%</b></div>
            <div><span>central complex</span><i><u style={{width:Math.round(fly.core.centralComplex*100)+'%'}}/></i><b>{Math.round(fly.core.centralComplex*100)}%</b></div>
            <div><span>mushroom body</span><i><u style={{width:Math.round(fly.core.mushroomBody*100)+'%'}}/></i><b>{Math.round(fly.core.mushroomBody*100)}%</b></div>
          </div>
          <small className="sim-note">Comportamento: {fly.behavior}. O agente visual usa o mesmo FlyCore persistente do chat /cognitive/fly.</small>
        </section>

        <section className="sim-panel">
          <div className="sim-panel-title"><Activity size={14}/><b>Percepção</b><span>visão local</span></div>
          <small className="sim-note"><b>Humano:</b> {humanVision.summary}</small>
          <small className="sim-note"><b>Mosca:</b> {flyVision.summary}</small>
          <div className="sim-metrics">
            {humanVision.visible.slice(0,4).map(item=><span key={'h-'+item.id}>{item.label} · {Math.round(item.distance)}</span>)}
            {flyVision.visible.slice(0,4).map(item=><span key={'f-'+item.id}>🪰 {item.label}</span>)}
          </div>
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
      .sim-canvas-wrap{position:relative;width:100%;height:430px;overflow:hidden;border-radius:16px}.sim-canvas{width:100%;height:430px;display:block;border:1px solid #283242;border-radius:16px;background:#182332;cursor:pointer;touch-action:manipulation}.sim-camera-badge{position:absolute;right:10px;top:10px;display:flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.12);background:rgba(8,12,18,.72);backdrop-filter:blur(10px);border-radius:999px;padding:6px 9px;font-size:9px;color:#93a0b5;pointer-events:none}.sim-camera-badge span{color:#76e0c1;font-weight:800}.sim-camera-badge b{color:#eef3f8}.sim-camera-badge em{font-style:normal;color:#b39cff}.sim-world-foot{display:grid;grid-template-columns:auto auto auto auto 1fr;gap:9px;align-items:center;padding:10px 4px 3px;font-size:10px;color:#79869a}.sim-world-foot span{display:flex;align-items:center;gap:4px}.sim-world-foot b{text-align:right;color:#cdd6e5;font-weight:600}
      .sim-command{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border-top:1px solid #202735;margin-top:9px;padding-top:10px;color:#8d7cf1}.sim-spin{animation:simspin .8s linear infinite}@keyframes simspin{to{transform:rotate(360deg)}}.sim-command input{min-width:0;border:1px solid #252d3d;background:#0a0e15;color:#eef3fa;border-radius:10px;padding:10px 11px;outline:0}.sim-command button{border:0;background:#6e55e7;color:white;border-radius:9px;width:34px;height:34px;display:grid;place-items:center}
      .sim-agent{margin-top:10px;border:1px solid #252d3d;border-radius:13px;background:#0a0f17;padding:11px}.sim-agent-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1c2432;padding-bottom:8px}.sim-agent-head>div{display:flex;gap:6px;align-items:center}.sim-agent-head b{font-size:10px}.sim-agent-head span{font-size:9px;color:#8290a5}.sim-plan{padding-top:9px;display:grid;gap:7px}.sim-plan>strong{font-size:11px}.sim-plan>small{color:#7c899e;font-size:9px}.sim-plan-steps{display:grid;gap:5px}.sim-plan-steps>div{display:grid;grid-template-columns:16px 145px 1fr;gap:6px;align-items:center;border:1px solid #1c2430;border-radius:8px;padding:6px 7px;color:#778398}.sim-plan-steps>div.done{color:#66cfae}.sim-plan-steps>div.current{border-color:#7560e6;color:#c7bcff;background:#141128}.sim-plan-steps>div.failed{border-color:#a64f62;color:#ff91a6}.sim-plan-steps span{font-size:9px}.sim-plan-steps small{font-size:8px;color:#6f7c90}.sim-agent-error{font-size:9px;color:#ff8ba0}.sim-agent-log{margin-top:8px;color:#8693a8;font-size:9px}.sim-agent-log>div{display:grid;grid-template-columns:34px 70px 1fr;gap:6px;padding:5px 0;border-top:1px solid #171e29}.sim-agent-log b{color:#76d9b7}.sim-agent-log small{color:#778398}
      .sim-side{display:flex;flex-direction:column;gap:12px}.sim-panel{padding:13px}.sim-panel-title{display:grid;grid-template-columns:auto auto 1fr;gap:6px;align-items:center;border-bottom:1px solid #202735;padding-bottom:9px;margin-bottom:10px;color:#9c8cff}.sim-panel-title b{font-size:11px;color:#eef2f8}.sim-panel-title span{text-align:right;color:#7d8799;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .need-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.need-grid>div span{display:flex;justify-content:space-between;font-size:9px;color:#8a95a8}.need-grid em{font-style:normal;color:#cbd3e1}.need-grid i,.circuit-list i{height:5px;background:#181f2b;border-radius:999px;display:block;overflow:hidden;margin-top:4px}.need-grid u,.circuit-list u{height:100%;display:block;background:linear-gradient(90deg,#5e58dc,#65d2ad);border-radius:inherit}.need-grid .stress u{background:linear-gradient(90deg,#ffb15d,#ef5d72)}
      .sim-metrics{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}.sim-metrics span{display:flex;align-items:center;gap:5px;border:1px solid #242c3a;background:#0c1119;border-radius:8px;padding:6px 8px;font-size:9px;color:#9da8ba}
      .sim-agent-vitals{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px}.sim-agent-vitals span{display:flex;justify-content:space-between;border:1px solid #1d2532;background:#0b1017;border-radius:7px;padding:5px 7px;font-size:8px;color:#7f8ba0}.sim-agent-vitals b{color:#c9d3e2}.circuit-list{display:flex;flex-direction:column;gap:7px}.circuit-list>div{display:grid;grid-template-columns:92px 1fr 30px;gap:7px;align-items:center;font-size:9px}.circuit-list span{color:#9aa5b7}.circuit-list b{text-align:right;font-size:9px}.circuit-list i{margin:0}.sim-note{display:block;color:#69768a;line-height:1.45;margin-top:10px}
      .memories{max-height:245px;overflow:auto}.memories article{display:grid;grid-template-columns:55px 1fr;gap:4px 7px;padding:8px 0;border-bottom:1px solid #171d27}.memories article b{font-size:8px;text-transform:uppercase;color:#927ff1}.memories article span{font-size:9px;color:#c4cddd}.memories article small{grid-column:2;color:#667286;font-size:8px}
      .sim-debug{max-width:1320px;margin:12px auto 0;border:1px solid #202735;border-radius:12px;background:#0a0e15;padding:8px 11px;color:#8390a4;font-size:10px}.sim-debug pre{white-space:pre-wrap;color:#c7d0df}
      @media(max-width:980px){.sim-layout{grid-template-columns:1fr}.sim-side{display:grid;grid-template-columns:1fr 1fr}.memories{grid-column:1/-1}}@media(max-width:640px){.sim-scenario-grid{grid-template-columns:1fr}.sim-shell{padding:10px}.sim-head{align-items:flex-start;flex-direction:column}.sim-head h1{font-size:31px}.sim-layout{display:block}.sim-side{display:flex;margin-top:12px}.sim-world-foot{grid-template-columns:1fr 1fr}.sim-world-foot b{grid-column:1/-1;text-align:left}.need-grid{grid-template-columns:1fr}.sim-toolbar{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}.sim-toolbar button,.sim-toolbar select{flex:0 0 auto}.sim-canvas-wrap,.sim-canvas{height:410px}.sim-world-card{padding:8px;border-radius:14px}.sim-camera-badge{top:8px;right:8px}}
    `}</style>
  </section>;
}
