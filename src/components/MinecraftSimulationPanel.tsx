'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Activity,Download,MapPin,Play,Pause,RotateCcw,Sparkles,StepForward,Upload} from 'lucide-react';
import {
  CRAFT_RECIPES,
  VOXEL_BLOCKS,
  VOXEL_CHUNK_SIZE,
  attackVoxelMob,
  chunkSnapshot,
  craftVoxelItem,
  createVoxelWorld,
  eatVoxelFood,
  executeVoxelPlan,
  farmVoxelBlock,
  localVoxelPlan,
  currentVoxelContext,
  mineVoxelBlock,
  moveVoxelPlayer,
  normalizeVoxelWorld,
  parseVoxelPlan,
  placeVoxelBlock,
  raidVoxelDungeon,
  selectVoxelBlock,
  setVoxelMode,
  repairVoxelPlan,
  smeltVoxelItem,
  surfaceAt,
  tickVoxelWorld,
  tradeVoxelVillager,
  travelVoxelDimension,
  voxelUnityScene,
  voxelWorldSummary,
  type VoxelBlockId,
  type VoxelMob,
  type VoxelStructure,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';
import {
  UNITY_WEBGL_URL,
  postUnityMessage,
  unityWebGLConfigured
} from '@/lib/unity-fabric';
import {minecraftReferenceAudit} from '@/lib/simulation/minecraft-reference-fabric';
import {VoxelFirstPersonViewport} from '@/components/VoxelFirstPersonViewport';
import {setVoxelBioAIAutonomy,stepVoxelBioAI,voxelBioAISummary} from '@/lib/simulation/bioai-voxel-agent';
import {emitAppLearningEvent} from '@/lib/app-learning';
import styles from './MinecraftSimulationPanel.module.css';

const STORAGE='predictlm-minecraft-sandbox-v1';

const BLOCK_COLORS:Record<VoxelBlockId,string>={
  air:'#000000',
  bedrock:'#30343a',
  stone:'#777c82',
  cobblestone:'#676b70',
  dirt:'#765039',
  grass:'#4f8d45',
  sand:'#d5c58a',
  water:'#3f78bd',
  lava:'#e85b26',
  wood:'#7d5737',
  leaves:'#3e7d45',
  planks:'#a8784d',
  glass:'#a9d7df',
  coal_ore:'#51555a',
  iron_ore:'#9f8b78',
  gold_ore:'#d0aa3c',
  diamond_ore:'#48c4cf',
  crafting_table:'#8f623a',
  furnace:'#60666b',
  torch:'#e6c15b',
  chest:'#9b672e',
  farmland:'#5d3d2b',
  wheat:'#c4a840',
  bricks:'#9a4d3f',
  obsidian:'#2c2142'
};

type ToolMode='mine'|'place'|'inspect';

interface MinecraftSimulationPanelProps{
  world?:VoxelWorldState;
  onWorldChange?:(world:VoxelWorldState)=>void;
  embedded?:boolean;
}

function loadWorld(){
  if(typeof window==='undefined')return createVoxelWorld(827361);
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');
    return normalizeVoxelWorld(raw);
  }catch{return createVoxelWorld(827361)}
}

function shade(hex:string,amount:number){
  const raw=hex.replace('#','');
  const n=parseInt(raw,16);
  const r=Math.max(0,Math.min(255,(n>>16)+amount));
  const g=Math.max(0,Math.min(255,((n>>8)&255)+amount));
  const b=Math.max(0,Math.min(255,(n&255)+amount));
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

export function MinecraftSimulationPanel({world:controlledWorld,onWorldChange,embedded=false}:MinecraftSimulationPanelProps={}){
  const [internalWorld,setInternalWorld]=useState<VoxelWorldState>(()=>createVoxelWorld(827361));
  const world=controlledWorld??internalWorld;
  const setWorld=(updater:VoxelWorldState|((prev:VoxelWorldState)=>VoxelWorldState))=>{
    if(controlledWorld!==undefined){
      const next=typeof updater==='function'?(updater as (prev:VoxelWorldState)=>VoxelWorldState)(controlledWorld):updater;
      onWorldChange?.(next);
    }else{
      setInternalWorld(updater as any);
    }
  };
  const [hydrated,setHydrated]=useState(false);
  const [running,setRunning]=useState(false);
  const [tool,setTool]=useState<ToolMode>('mine');
  const [selected,setSelected]=useState<VoxelBlockId>('dirt');
  const [message,setMessage]=useState('Mundo procedural pronto.');
  const [command,setCommand]=useState('');
  const [planning,setPlanning]=useState(false);
  const [lastPlan,setLastPlan]=useState('');
  const [viewRadius,setViewRadius]=useState(10);
  const [renderMode,setRenderMode]=useState<'first-person'|'isometric'|'unity'>('first-person');
  const canvas=useRef<HTMLCanvasElement>(null);
  const unityFrame=useRef<HTMLIFrameElement>(null);
  const saveInput=useRef<HTMLInputElement>(null);
  const hitCells=useRef<Array<{x:number;z:number;points:[number,number][];depth:number}>>([]);
  const audit=useMemo(()=>minecraftReferenceAudit(),[]);

  useEffect(()=>{
    if(controlledWorld!==undefined){
      setHydrated(true);
      return;
    }
    setInternalWorld(loadWorld());
    setHydrated(true);
  },[controlledWorld!==undefined]);

  useEffect(()=>{
    if(!hydrated||controlledWorld!==undefined)return;
    try{localStorage.setItem(STORAGE,JSON.stringify(world))}catch{}
  },[world,hydrated,controlledWorld]);

  useEffect(()=>{
    if(!running)return;
    const timer=window.setInterval(()=>setWorld(prev=>stepVoxelBioAI(tickVoxelWorld(prev,1))),450);
    return()=>window.clearInterval(timer);
  },[running]);

  useEffect(()=>{
    if(renderMode!=='unity'||!unityWebGLConfigured())return;
    const scene=voxelUnityScene(world,Math.min(10,viewRadius));
    postUnityMessage(unityFrame.current?.contentWindow||null,{type:'predictlm:scene',scene});
  },[world,renderMode,viewRadius]);

  const context=useMemo(()=>currentVoxelContext(world),[world]);
  const chunk=context.snapshot;
  const currentStructures=chunk.structures;
  const currentMobs=chunk.mobs;
  const inventoryBlocks=useMemo(
    ()=>Object.entries(world.inventory)
      .filter(([id,count])=>count>0&&id in VOXEL_BLOCKS)
      .map(([id])=>id as VoxelBlockId),
    [world.inventory]
  );

  useEffect(()=>{
    const el=canvas.current;
    if(!el||renderMode!=='isometric')return;
    const ctx=el.getContext('2d');
    if(!ctx)return;

    const rect=el.getBoundingClientRect();
    const width=Math.max(720,Math.floor(rect.width||920));
    const height=540;
    if(el.width!==width)el.width=width;
    if(el.height!==height)el.height=height;

    ctx.clearRect(0,0,width,height);
    const gradient=ctx.createLinearGradient(0,0,0,height);
    const night=world.timeOfDay>=12000;
    gradient.addColorStop(0,night?'#06101e':'#17384a');
    gradient.addColorStop(1,night?'#0c1419':'#1b2a27');
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,width,height);

    const tile=Math.max(18,Math.min(34,Math.floor(width/(viewRadius*2.5))));
    const centerX=width*.5;
    const centerY=height*.28;
    const baseY=surfaceAt(world,world.player.x,world.player.z).y;
    const cells:Array<{x:number;z:number;y:number;block:VoxelBlockId;depth:number}>=[];
    for(let dx=-viewRadius;dx<=viewRadius;dx++)for(let dz=-viewRadius;dz<=viewRadius;dz++){
      const x=world.player.x+dx,z=world.player.z+dz;
      const cell=surfaceAt(world,x,z);
      cells.push({...cell,depth:dx+dz});
    }
    cells.sort((a,b)=>a.depth-b.depth||a.y-b.y);
    const hits:Array<{x:number;z:number;points:[number,number][];depth:number}>=[];

    for(const cell of cells){
      const dx=cell.x-world.player.x,dz=cell.z-world.player.z;
      const sx=centerX+(dx-dz)*(tile*.5);
      const sy=centerY+(dx+dz)*(tile*.25)-(cell.y-baseY)*3;
      const top:[number,number][]=[
        [sx,sy-tile*.22],
        [sx+tile*.5,sy],
        [sx,sy+tile*.22],
        [sx-tile*.5,sy]
      ];
      const depth=Math.max(4,Math.min(18,6+(cell.y-baseY)*.18));
      const base=BLOCK_COLORS[cell.block]||'#6b7280';

      ctx.beginPath();
      ctx.moveTo(top[3][0],top[3][1]);
      ctx.lineTo(top[2][0],top[2][1]);
      ctx.lineTo(top[2][0],top[2][1]+depth);
      ctx.lineTo(top[3][0],top[3][1]+depth);
      ctx.closePath();
      ctx.fillStyle=shade(base,-28);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(top[1][0],top[1][1]);
      ctx.lineTo(top[2][0],top[2][1]);
      ctx.lineTo(top[2][0],top[2][1]+depth);
      ctx.lineTo(top[1][0],top[1][1]+depth);
      ctx.closePath();
      ctx.fillStyle=shade(base,-42);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(top[0][0],top[0][1]);
      for(let i=1;i<top.length;i++)ctx.lineTo(top[i][0],top[i][1]);
      ctx.closePath();
      ctx.fillStyle=base;
      ctx.fill();
      ctx.strokeStyle='rgba(4,9,13,.24)';
      ctx.lineWidth=1;
      ctx.stroke();

      hits.push({x:cell.x,z:cell.z,points:top,depth:cell.depth});
    }

    hitCells.current=hits.reverse();

    for(const structure of currentStructures){
      const dx=structure.x-world.player.x,dz=structure.z-world.player.z;
      if(Math.abs(dx)>viewRadius||Math.abs(dz)>viewRadius)continue;
      const cell=surfaceAt(world,structure.x,structure.z);
      const sx=centerX+(dx-dz)*(tile*.5);
      const sy=centerY+(dx+dz)*(tile*.25)-(cell.y-baseY)*3-18;
      ctx.fillStyle=structure.kind==='dungeon'?'#b36dff':'#f0c66a';
      ctx.beginPath();ctx.arc(sx,sy,5,0,Math.PI*2);ctx.fill();
      ctx.font='10px system-ui';ctx.fillStyle='#eaf5f6';ctx.fillText(structure.label,sx+8,sy+3);
    }

    const px=centerX,py=centerY-16;
    ctx.fillStyle='#55ead1';
    ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d8fff8';ctx.lineWidth=2;ctx.stroke();
    ctx.font='10px system-ui';ctx.fillStyle='#d8fff8';ctx.fillText('Você',px+11,py+3);

    ctx.fillStyle='rgba(3,10,14,.66)';
    ctx.fillRect(12,12,250,52);
    ctx.fillStyle='#d8e9e7';
    ctx.font='12px system-ui';
    ctx.fillText('Chunk '+context.cx+','+context.cz+' · '+chunk.biome,22,32);
    ctx.fillStyle='#91aaa7';
    ctx.fillText('Dia '+world.day+' · '+Math.floor(world.timeOfDay)+' · '+world.weather,22,50);
  },[world,viewRadius,renderMode,currentStructures,context.cx,context.cz,chunk.biome]);

  useEffect(()=>{
    if(renderMode!=='isometric')return;
    const onKey=(e:KeyboardEvent)=>{
      if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName))return;
      const key=e.key.toLowerCase();
      let dx=0,dz=0;
      if(key==='w'||key==='arrowup')dz=-1;
      if(key==='s'||key==='arrowdown')dz=1;
      if(key==='a'||key==='arrowleft')dx=-1;
      if(key==='d'||key==='arrowright')dx=1;
      if(!dx&&!dz)return;
      e.preventDefault();
      setWorld(prev=>moveVoxelPlayer(prev,dx,dz));
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[renderMode]);

  function pointInPoly(x:number,y:number,points:[number,number][]){
    let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const xi=points[i][0],yi=points[i][1],xj=points[j][0],yj=points[j][1];
      const intersect=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi);
      if(intersect)inside=!inside;
    }
    return inside;
  }

  function mineAt(x:number,y:number,z:number){
    const result=mineVoxelBlock(world,x,y,z);
    setWorld(result.state);setMessage(result.message);
    emitAppLearningEvent({surface:'simulation/voxel',action:'mine '+x+','+y+','+z,kind:'simulation',success:result.ok,novelty:.5,salience:result.ok ? .55 : .8});
  }
  function placeAt(x:number,y:number,z:number){
    const result=placeVoxelBlock(world,x,y,z,selected);
    setWorld(result.state);setMessage(result.message);
    emitAppLearningEvent({surface:'simulation/voxel',action:'place '+selected,kind:'simulation',success:result.ok,novelty:.52,salience:result.ok ? .55 : .8});
  }

  function handleCanvasClick(e:React.MouseEvent<HTMLCanvasElement>){
    const el=canvas.current;if(!el)return;
    const rect=el.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(el.width/rect.width);
    const y=(e.clientY-rect.top)*(el.height/rect.height);
    const hit=hitCells.current.find(cell=>pointInPoly(x,y,cell.points));
    if(!hit)return;
    const surface=surfaceAt(world,hit.x,hit.z);
    if(tool==='mine'){
      mineAt(hit.x,surface.y,hit.z);
    }else if(tool==='place'){
      placeAt(hit.x,surface.y+1,hit.z);
    }else{
      setMessage(hit.x+','+surface.y+','+hit.z+' · '+VOXEL_BLOCKS[surface.block].label+' · '+surface.biome);
    }
  }

  async function runVoxelCommand(){
    const instruction=command.trim();
    if(!instruction||planning)return;
    setPlanning(true);
    setMessage('Game Studio está planejando ações executáveis no Voxel World…');
    try{
      let plan=null;
      try{
        const response=await fetch('/api/chat',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            mode:'voxel-plan',
            prompt:instruction,
            worldState:voxelWorldSummary(world)
          })
        });
        const data=await response.json().catch(()=>({}));
        if(response.ok&&data?.content)plan=parseVoxelPlan(String(data.content));
      }catch{}
      if(!plan)plan=localVoxelPlan(instruction,world);
      plan=repairVoxelPlan(plan,world);
      const executed=executeVoxelPlan(world,plan);
      setWorld(executed.state);
      setLastPlan(plan.summary+'\n'+executed.records.map((r,i)=>(i+1)+'. '+r.action.type+' · '+r.message).join('\n'));
      setMessage(executed.ok?'Plano executado no estado real do mundo.':'O plano não encontrou nenhuma ação executável.');
      setCommand('');
    }finally{
      setPlanning(false);
    }
  }

  function move(dx:number,dz:number){setWorld(prev=>moveVoxelPlayer(prev,dx,dz))}
  function reset(){
    const seed=world.seed;
    setWorld(createVoxelWorld(seed));
    setMessage('Mundo reiniciado com a mesma seed.');
  }
  function newWorld(){
    setWorld(createVoxelWorld());
    setMessage('Novo mundo procedural criado.');
  }
  function exportWorld(){
    const payload=JSON.stringify({
      format:'predictlm-voxel-save',
      exportedAt:new Date().toISOString(),
      world
    },null,2);
    const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;
    a.download='predictlm-voxel-'+world.seed+'-day-'+world.day+'.json';
    a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1200);
    setMessage('Save exportado.');
  }
  async function importWorld(file:File|null){
    if(!file)return;
    try{
      const raw=JSON.parse(await file.text());
      const candidate=raw?.format==='predictlm-voxel-save'?raw.world:raw;
      const restored=normalizeVoxelWorld(candidate);
      setWorld(restored);
      setMessage('Save importado: seed '+restored.seed+', dia '+restored.day+'.');
    }catch{
      setMessage('Save inválido; nenhum dado do mundo foi alterado.');
    }finally{
      if(saveInput.current)saveInput.current.value='';
    }
  }
  function craft(id:string){
    const result=craftVoxelItem(world,id);
    setWorld(result.state);setMessage(result.message);
  }
  function smelt(item:string){
    const result=smeltVoxelItem(world,item);
    setWorld(result.state);setMessage(result.message);
  }
  function attack(mob:VoxelMob){
    const result=attackVoxelMob(world,mob);
    setWorld(result.state);setMessage(result.message);
  }
  function trade(mob:VoxelMob){
    const result=tradeVoxelVillager(world,mob);
    setWorld(result.state);setMessage(result.message);
  }
  function eat(item:string){
    const result=eatVoxelFood(world,item);
    setWorld(result.state);setMessage(result.message);
  }
  function farm(plant=false){
    const result=farmVoxelBlock(world,world.player.x,world.player.z,plant);
    setWorld(result.state);setMessage(result.message);
  }
  function raid(structure:VoxelStructure){
    const result=raidVoxelDungeon(world,structure);
    setWorld(result.state);setMessage(result.message);
  }

  useEffect(()=>{
    if(!hydrated||world.bioAI.tick===0||world.bioAI.tick%4!==0)return;
    emitAppLearningEvent({
      surface:'simulation/voxel-bioai',
      action:world.bioAI.lastAction,
      kind:'simulation',
      success:true,
      novelty:.62,
      uncertainty:.34,
      salience:.62,
      metadata:{tick:world.bioAI.tick,biome:surfaceAt(world,world.bioAI.x,world.bioAI.z).biome,discoveries:world.bioAI.discoveries}
    });
  },[hydrated,world.bioAI.tick,world.bioAI.lastAction,world.bioAI.x,world.bioAI.z,world.bioAI.discoveries]);

  const unityReady=unityWebGLConfigured();

  return <section className={styles.shell}>
    <header className={styles.header}>
      <div>
        <span><Activity size={13}/> VOXEL WORLD · MINECRAFT-CLASS SANDBOX</span>
        <h2>Mundo quase infinito</h2>
        <p>Chunks procedurais sem limite prático em X/Z, sobrevivência/criativo, mineração, construção, crafting, mobs, estruturas, masmorras e persistência local.</p>
      </div>
      <div className={styles.badges}>
        <b>{world.player.mode}</b>
        <span>seed {world.seed}</span>
        <span>{audit.primary.length} clones + {audit.secondary.length} refs Dungeons</span>
      </div>
    </header>

    <div className={styles.commandBar}>
      <div>
        <Sparkles size={15}/>
        <input
          value={command}
          onChange={e=>setCommand(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void runVoxelCommand()}}}
          placeholder="Diga o que fazer no mundo: explore, mine ferro, construa abrigo, procure uma dungeon…"
        />
        <button onClick={()=>void runVoxelCommand()} disabled={!command.trim()||planning}>{planning?'Planejando…':'Executar no mundo'}</button>
      </div>
      {lastPlan?<pre>{lastPlan}</pre>:null}
    </div>

    <div className={styles.toolbar}>
      <button className={running?styles.active:''} onClick={()=>setRunning(v=>!v)}>{running?<><Pause size={13}/>Pausar</>:<><Play size={13}/>Rodar mundo</>}</button>
      <button onClick={()=>setWorld(prev=>stepVoxelBioAI(tickVoxelWorld(prev,1)))}><StepForward size={13}/>Tick</button>
      <button className={tool==='mine'?styles.active:''} onClick={()=>setTool('mine')}>Minerar</button>
      <button className={tool==='place'?styles.active:''} onClick={()=>setTool('place')}>Colocar</button>
      <button className={tool==='inspect'?styles.active:''} onClick={()=>setTool('inspect')}>Inspecionar</button>
      <button onClick={()=>setWorld(prev=>setVoxelMode(prev,prev.player.mode==='survival'?'creative':'survival'))}>Modo: {world.player.mode}</button>
      <select value={selected} onChange={e=>{const id=e.target.value as VoxelBlockId;setSelected(id);setWorld(prev=>selectVoxelBlock(prev,id))}}>
        {[...new Set<VoxelBlockId>(['dirt','cobblestone','planks','glass','torch','crafting_table','furnace','chest',...inventoryBlocks])].map(id=><option key={id} value={id}>{VOXEL_BLOCKS[id]?.label||id} · {world.inventory[id]||0}</option>)}
      </select>
      <select value={viewRadius} onChange={e=>setViewRadius(Number(e.target.value))}>
        <option value={7}>Visão 15×15</option><option value={10}>Visão 21×21</option><option value={12}>Visão 25×25</option>
      </select>
      <button className={renderMode==='first-person'?styles.active:''} onClick={()=>setRenderMode('first-person')}>1ª pessoa 3D</button>
      <button className={renderMode==='isometric'?styles.active:''} onClick={()=>setRenderMode('isometric')}>Isométrico</button>
      <button disabled={!unityReady} className={renderMode==='unity'?styles.active:''} onClick={()=>unityReady&&setRenderMode('unity')}>Unity {unityReady?'WebGL':'bridge'}</button>
      <button className={world.bioAI.autonomous?styles.active:''} onClick={()=>setWorld(prev=>setVoxelBioAIAutonomy(prev,!prev.bioAI.autonomous))}>BioAI {world.bioAI.autonomous?'jogando':'pausada'}</button>
      <button onClick={reset}><RotateCcw size={13}/>Reset</button>
      <button onClick={newWorld}><Sparkles size={13}/>Nova seed</button>
      <button onClick={exportWorld}><Download size={13}/>Exportar save</button>
      <button onClick={()=>saveInput.current?.click()}><Upload size={13}/>Importar save</button>
      <input ref={saveInput} hidden type="file" accept="application/json,.json" onChange={e=>void importWorld(e.target.files?.[0]||null)}/>
    </div>

    <div className={styles.layout}>
      <main className={styles.world}>
        {renderMode==='unity'&&unityReady?
          <iframe ref={unityFrame} className={styles.unityFrame} src={UNITY_WEBGL_URL} title="PredictLM Unity WebGL Simulation" onLoad={()=>postUnityMessage(unityFrame.current?.contentWindow||null,{type:'predictlm:scene',scene:voxelUnityScene(world,Math.min(10,viewRadius))})}/>:
          renderMode==='first-person'?
            <VoxelFirstPersonViewport world={world} radius={viewRadius} selected={selected} onMove={move} onMine={mineAt} onPlace={placeAt}/>:
            <canvas ref={canvas} onClick={handleCanvasClick} className={styles.canvas} aria-label="Mundo voxel procedural interativo"/>
        }
        <div className={styles.worldFoot}>
          <span><MapPin size={12}/>{world.player.x},{world.player.y},{world.player.z}</span>
          <span>chunk {context.cx},{context.cz} · {chunk.biome}</span>
          <span>dia {world.day} · {world.weather}</span>
          <b>{message}</b>
        </div>
        <div className={styles.movePad}>
          <span/>
          <button onClick={()=>move(0,-1)}>W</button>
          <span/>
          <button onClick={()=>move(-1,0)}>A</button>
          <button onClick={()=>move(0,1)}>S</button>
          <button onClick={()=>move(1,0)}>D</button>
        </div>
      </main>

      <aside className={styles.side}>
        <section>
          <header><b>Sobrevivência</b><span>{world.player.dimension}</span></header>
          <div className={styles.vitals}>
            <label>Vida <b>{Math.round(world.player.health)}/20</b><i><em style={{width:(world.player.health/20*100)+'%'}}/></i></label>
            <label>Fome <b>{Math.round(world.player.hunger*10)/10}/20</b><i><em style={{width:(world.player.hunger/20*100)+'%'}}/></i></label>
            <label>XP <b>{world.player.experience}</b><i><em style={{width:Math.min(100,world.player.experience%100)+'%'}}/></i></label>
          </div>
          <div className={styles.dimensionButtons}>
            {(['overworld','infernal','void'] as const).map(dim=><button key={dim} className={world.player.dimension===dim?styles.active:''} onClick={()=>setWorld(prev=>travelVoxelDimension(prev,dim))}>{dim}</button>)}
          </div>
          <div className={styles.dimensionButtons}>
            <button onClick={()=>eat(world.inventory.bread>0?'bread':'food')}>Comer</button>
            <button onClick={()=>farm(false)}>Arar</button>
            <button onClick={()=>farm(true)}>Plantar</button>
          </div>
        </section>

        <section>
          <header><b>Inventário</b><span>{Object.values(world.inventory).reduce((a,b)=>a+b,0)} itens</span></header>
          <div className={styles.inventory}>
            {Object.entries(world.inventory).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]).slice(0,28).map(([item,count])=><button key={item} onClick={()=>item in VOXEL_BLOCKS&&setSelected(item as VoxelBlockId)}><b>{item}</b><span>{count}</span></button>)}
          </div>
        </section>

        <section>
          <header><b>Crafting</b><span>{CRAFT_RECIPES.length} receitas-base</span></header>
          <div className={styles.list}>
            {CRAFT_RECIPES.map(recipe=><button key={recipe.id} onClick={()=>craft(recipe.id)}><b>{recipe.label}</b><span>{Object.entries(recipe.input).map(([k,n])=>k+'×'+n).join(' · ')}</span></button>)}
            <button onClick={()=>smelt('raw_iron')}><b>Fundir ferro</b><span>raw_iron + combustível</span></button>
            <button onClick={()=>smelt('raw_gold')}><b>Fundir ouro</b><span>raw_gold + combustível</span></button>
            <button onClick={()=>smelt('sand')}><b>Fazer vidro</b><span>sand + combustível</span></button>
          </div>
        </section>

        <section>
          <header><b>BioAI jogadora</b><span>{world.bioAI.autonomous?'autônoma':'pausada'}</span></header>
          <div className={styles.list}>
            <button onClick={()=>setWorld(prev=>stepVoxelBioAI(prev))}><b>{world.bioAI.goal}</b><span>{world.bioAI.lastAction}</span></button>
            <small>{voxelBioAISummary(world)}</small>
          </div>
        </section>

        <section>
          <header><b>Mundo vivo</b><span>{currentMobs.length} mobs</span></header>
          <div className={styles.list}>
            {currentMobs.map(mob=><button key={mob.id} onClick={()=>mob.kind==='villager'?trade(mob):attack(mob)}><b>{mob.label}</b><span>{mob.kind==='villager'?'trocar · 1 esmeralda':(mob.hostile?'hostil':'passivo')+' · HP '+mob.health}</span></button>)}
            {!currentMobs.length?<small>Nenhum mob neste chunk.</small>:null}
          </div>
        </section>

        <section>
          <header><b>Conquistas</b><span>{world.achievements.length}</span></header>
          <div className={styles.achievements}>
            {world.achievements.slice(-12).map(id=><span key={id}>{id.replace(/-/g,' ')}</span>)}
            {!world.achievements.length?<small>Mine, construa, explore, lute e conclua masmorras para liberar conquistas.</small>:null}
          </div>
        </section>

        <section>
          <header><b>Estruturas / Dungeons</b><span>referência secundária</span></header>
          <div className={styles.list}>
            {currentStructures.map(s=><button key={s.id} onClick={()=>s.kind==='dungeon'?raid(s):setMessage(s.label+' em '+s.x+','+s.z)}><b>{s.label}</b><span>{s.kind==='dungeon'?'explorar / saquear':'descobrir'}</span></button>)}
            {!currentStructures.length?<small>Continue explorando: estruturas são procedurais e raras.</small>:null}
          </div>
        </section>
      </aside>
    </div>

    <details className={styles.details}>
      <summary>Estado e implementação do mundo</summary>
      <pre>{voxelWorldSummary(world)}</pre>
      <p>Referências registradas: {audit.registered}/{audit.expected}. As referências sem licença verificada são usadas somente como inspiração arquitetural; nenhum asset proprietário do Minecraft é incorporado.</p>
      <p>Unity: {unityReady?'WebGL configurado e sincronizado por scene snapshots.':'fabric de GameObject/Transform/Component ativo; falta uma URL de build Unity WebGL para executar o runtime Unity real no navegador.'}</p>
    </details>
  </section>;
}
