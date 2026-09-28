import {
  advanceCognitiveWorkspace,
  createCognitiveState,
  type CognitiveState
} from '@/lib/cognitive/cognitive-workspace';
import {
  blockAt,
  chunkSnapshot,
  executeVoxelPlan,
  mineVoxelBlock,
  localVoxelPlan,
  normalizeVoxelWorld,
  surfaceAt,
  type VoxelDimension,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';
import {minecraftNeuralDecision,type MinecraftNeuralAction} from '@/lib/simulation/minecraft-neural-controller';

export type MinecraftBrainId='human'|'macaque'|'mouse'|'fly';

export interface MinecraftBrainAgent{
  id:MinecraftBrainId;
  label:string;
  x:number;
  y:number;
  z:number;
  yaw:number;
  pitch:number;
  dimension:VoxelDimension;
  health:number;
  hunger:number;
  inventory:Record<string,number>;
  goal:string;
  publicThought:string;
  lastAction:string;
  decisions:number;
  neuralAction:MinecraftNeuralAction;
  neuralSpikes:number;
}

export interface MinecraftBrainState{
  version:1;
  tick:number;
  cognitive:CognitiveState;
  agents:Record<MinecraftBrainId,MinecraftBrainAgent>;
}

const LABELS:Record<MinecraftBrainId,string>={
  human:'Cérebro Humano',
  macaque:'Cérebro Macaco',
  mouse:'Cérebro Camundongo',
  fly:'Cérebro Mosca'
};

function spawn(world:VoxelWorldState,id:MinecraftBrainId,dx:number,dz:number):MinecraftBrainAgent{
  const x=world.player.x+dx,z=world.player.z+dz;
  return{
    id,
    label:LABELS[id],
    x,
    y:surfaceAt(world,x,z).y+1,
    z,
    yaw:id==='human'?0:id==='macaque'?Math.PI*.5:id==='mouse'?Math.PI:id==='fly'?-Math.PI*.5:0,
    pitch:0,
    dimension:'overworld',
    health:20,
    hunger:20,
    inventory:id==='human'?{wood_pickaxe:1,torch:4}:id==='mouse'?{food:1}:{},
    goal:'explorar e sobreviver',
    publicThought:'Observando o mundo voxel.',
    lastAction:'spawn',
    decisions:0,
    neuralAction:'explore',
    neuralSpikes:0
  };
}

export function createMinecraftBrainState(world:VoxelWorldState):MinecraftBrainState{
  return{
    version:1,
    tick:0,
    cognitive:createCognitiveState(),
    agents:{
      human:spawn(world,'human',2,1),
      macaque:spawn(world,'macaque',-2,1),
      mouse:spawn(world,'mouse',1,-2),
      fly:spawn(world,'fly',-1,-2)
    }
  };
}

export function normalizeMinecraftBrainState(input:any,world:VoxelWorldState):MinecraftBrainState{
  const fresh=createMinecraftBrainState(world);
  if(!input||input.version!==1)return fresh;
  const agents={...fresh.agents};
  for(const id of Object.keys(agents) as MinecraftBrainId[]){
    const candidate=input.agents?.[id];
    if(candidate)agents[id]={...agents[id],...candidate,id,label:LABELS[id],inventory:{...agents[id].inventory,...candidate.inventory}};
  }
  return{
    ...fresh,
    ...input,
    cognitive:input.cognitive?.version===1?input.cognitive:fresh.cognitive,
    agents
  };
}

function observation(world:VoxelWorldState,agent:MinecraftBrainAgent){
  const shadow=normalizeVoxelWorld({
    ...world,
    player:{...world.player,x:agent.x,y:agent.y,z:agent.z,dimension:agent.dimension},
    inventory:agent.inventory
  });
  const cx=Math.floor(agent.x/16),cz=Math.floor(agent.z/16);
  const snapshot=chunkSnapshot(shadow,cx,cz);
  return [
    agent.label,
    'dimensão '+agent.dimension,
    'posição '+agent.x+','+agent.y+','+agent.z,
    'bioma '+snapshot.biome,
    'estruturas '+(snapshot.structures.map(x=>x.kind).join(', ')||'nenhuma'),
    'mobs '+(snapshot.mobs.map(x=>x.kind).join(', ')||'nenhum'),
    'inventário '+Object.entries(agent.inventory).filter(([,n])=>n>0).slice(0,10).map(([k,n])=>k+'×'+n).join(', ')
  ].join(' · ');
}

function deterministicDirection(seed:number,tick:number,id:MinecraftBrainId){
  const salt={human:11,macaque:23,mouse:37,fly:53}[id];
  const n=Math.abs(Math.imul(seed^(tick+salt),1103515245)+12345);
  return [
    [1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]
  ][n%8] as [number,number];
}

function chooseIntent(world:VoxelWorldState,brains:MinecraftBrainState,agent:MinecraftBrainAgent,neuralAction:MinecraftNeuralAction){
  const c=brains.cognitive;
  const has=(item:string)=>(agent.inventory[item]||0)>0;
  const count=(item:string)=>agent.inventory[item]||0;
  const dim=agent.dimension;
  const phase=(brains.tick+agent.decisions)%10;

  if(agent.health<8)return'evite monstros e procure segurança';
  if(agent.hunger<8&&Object.keys(agent.inventory).some(k=>/bread|food|meat|apple/.test(k)))return'coma para recuperar fome';

  // Minecraft progression precedes free wandering so the agents can actually advance.
  if(dim==='overworld'){
    if(count('wood')<1&&count('planks')<4)return'minerar madeira de uma árvore próxima';
    if(count('planks')<4&&count('wood')>0)return'fabricar Tábuas';
    if(count('cobblestone')<3)return'minerar pedra para avançar';
    if(count('raw_iron')>0&&!has('iron_ingot'))return'fundir raw_iron na fornalha';
    if(!has('iron_ingot'))return'minerar ferro e carvão';
    if(!has('diamond')&&phase<4)return'minerar diamante e explorar cavernas';
    if(world.stats.chunksVisited>8&&has('obsidian')&&has('iron_ingot'))return'vá para o Nether e explore uma fortaleza';
  }

  if(dim==='infernal'){
    if(!has('blaze_rod'))return'ataque blaze e explore uma fortaleza do Nether';
    return'volte ao Overworld e procure uma stronghold';
  }

  if(dim==='void')return'explore o End, enfrente guardiões e procure uma cidade do End';

  if(neuralAction==='seek_social')return'encontre outro cérebro no mundo e coopere';
  if(neuralAction==='avoid_threat')return'evite monstros hostis e procure terreno seguro';
  if(neuralAction==='forage')return'procure comida, árvores e recursos próximos';
  if(neuralAction==='build')return'construa abrigo com cama, baú, iluminação e móveis';

  if(agent.id==='human'){
    if(phase===0)return'construa e equipe um abrigo com cama mesa cadeira baú e iluminação';
    if(phase===1)return'fabrique equipamentos melhores';
    return'explore novos chunks vilas cavernas e masmorras';
  }

  if(agent.id==='macaque'){
    if(phase===0)return'procure comida e uma vila';
    if(phase===1)return'explore árvores terreno alto e estruturas';
    if(phase===2)return'lute contra um monstro hostil próximo';
    return'explore novos chunks e colete recursos';
  }

  if(agent.id==='mouse'){
    if(phase<=2)return'mine pedra carvão ferro e túneis seguros';
    if(phase===3)return'construa um abrigo pequeno com iluminação e baú';
    return'explore cavernas e procure comida';
  }

  if(c.fly.exploration>.45||phase<8)return'voe e explore rapidamente novos chunks, vilas, portais e estruturas';
  return'observe os arredores e mude para outra direção';
}

function nearestPeer(brains:MinecraftBrainState,agent:MinecraftBrainAgent){
  return (Object.values(brains.agents) as MinecraftBrainAgent[])
    .filter(other=>other.id!==agent.id&&other.dimension===agent.dimension)
    .map(other=>({other,d:Math.hypot(other.x-agent.x,other.z-agent.z)}))
    .sort((a,b)=>a.d-b.d)[0]||null;
}

function directedDirection(world:VoxelWorldState,brains:MinecraftBrainState,agent:MinecraftBrainAgent,intent:string,tick:number):[number,number]{
  if(/outro cérebro|coopere|reúna|reuna/i.test(intent)){
    const peer=nearestPeer(brains,agent);
    if(peer&&peer.d>.75)return[Math.sign(peer.other.x-agent.x),Math.sign(peer.other.z-agent.z)];
  }
  if(/evite monstros|seguran/i.test(intent)){
    const shadow=normalizeVoxelWorld({...world,player:{...world.player,x:agent.x,y:agent.y,z:agent.z,dimension:agent.dimension}});
    const cx=Math.floor(agent.x/16),cz=Math.floor(agent.z/16);
    const hostile=chunkSnapshot(shadow,cx,cz).mobs
      .filter(m=>m.hostile)
      .sort((a,b)=>Math.hypot(a.x-agent.x,a.z-agent.z)-Math.hypot(b.x-agent.x,b.z-agent.z))[0];
    if(hostile)return[Math.sign(agent.x-hostile.x)||1,Math.sign(agent.z-hostile.z)];
  }
  return deterministicDirection(world.seed,tick,agent.id);
}

function resourceIds(intent:string){
  const q=intent.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  if(q.includes('madeira'))return new Set(['wood']);
  if(q.includes('diamante'))return new Set(['diamond_ore']);
  if(q.includes('ferro'))return new Set(['iron_ore','coal_ore']);
  if(q.includes('pedra'))return new Set(['stone','cobblestone','coal_ore']);
  return null;
}

function tryMineResource(world:VoxelWorldState,agent:MinecraftBrainAgent,intent:string){
  const wanted=resourceIds(intent);
  if(!wanted)return null;
  const shadow=normalizeVoxelWorld({
    ...world,
    player:{...world.player,x:agent.x,y:agent.y,z:agent.z,dimension:agent.dimension,health:agent.health,hunger:agent.hunger},
    inventory:agent.inventory
  });
  const wood=wanted.has('wood');
  const radius=wood?7:3;
  let best:{x:number;y:number;z:number;d:number}|null=null;
  for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
    const x=Math.floor(agent.x)+dx,z=Math.floor(agent.z)+dz;
    const top=surfaceAt(shadow,x,z).y;
    const yMin=wood?Math.max(1,top-8):1;
    const yMax=wood?Math.min(127,top+1):Math.min(top,62);
    for(let y=yMax;y>=yMin;y--){
      const id=blockAt(shadow,x,y,z);
      if(!wanted.has(id))continue;
      const d=Math.hypot(dx,dz)+Math.abs(y-agent.y)*.05;
      if(!best||d<best.d)best={x,y,z,d};
      break;
    }
  }
  if(!best)return null;
  const mined=mineVoxelBlock(shadow,best.x,best.y,best.z);
  return mined.ok?mined:null;
}

function mergeSharedWorld(base:VoxelWorldState,executed:VoxelWorldState){
  return{
    ...base,
    modifications:executed.modifications,
    discoveries:executed.discoveries,
    achievements:Array.from(new Set([...base.achievements,...executed.achievements])),
    events:executed.events.slice(-120),
    stats:executed.stats
  };
}

function executeAgent(world:VoxelWorldState,brains:MinecraftBrainState,agent:MinecraftBrainAgent,intent:string,tick:number,neuralAction:MinecraftNeuralAction,neuralSpikes:number){
  const mined=tryMineResource(world,agent,intent);
  if(mined){
    const result=mined.state;
    const nextAgent:MinecraftBrainAgent={
      ...agent,
      inventory:result.inventory,
      goal:intent,
      lastAction:'mine',
      publicThought:intent,
      decisions:agent.decisions+1,
      neuralAction,
      neuralSpikes
    };
    return{world:mergeSharedWorld(world,result),agent:nextAgent};
  }

  const [dx,dz]=directedDirection(world,brains,agent,intent,tick);
  let instruction=intent;
  if(/explore|observe|voe|árvores|arvores/.test(intent))instruction+='; mova '+(3+(tick%5))+' passos para '+dx+','+dz;

  const shadow=normalizeVoxelWorld({
    ...world,
    player:{
      ...world.player,
      x:agent.x,y:agent.y,z:agent.z,
      dimension:agent.dimension,
      health:agent.health,
      hunger:agent.hunger
    },
    inventory:agent.inventory
  });
  const plan=localVoxelPlan(instruction,shadow);
  const directedPlan={
    ...plan,
    actions:plan.actions.map(action=>action.type==='move'?{...action,dx,dz}:action)
  };
  const executed=executeVoxelPlan(shadow,directedPlan);
  const result=executed.state;
  const facingYaw=Math.atan2(dx,dz);
  const nextAgent:MinecraftBrainAgent={
    ...agent,
    x:result.player.x,
    y:agent.id==='fly'?surfaceAt(result,result.player.x,result.player.z).y+2.6:result.player.y,
    z:result.player.z,
    yaw:facingYaw,
    pitch:agent.id==='fly'?Math.sin((tick+agent.decisions)*.55)*.16:agent.id==='mouse'?-0.08:0,
    dimension:result.player.dimension,
    health:result.player.health,
    hunger:result.player.hunger,
    inventory:result.inventory,
    goal:intent,
    lastAction:executed.records.map(x=>x.action.type).join(' → ')||'observar',
    publicThought:intent,
    decisions:agent.decisions+1,
    neuralAction,
    neuralSpikes
  };
  return{world:mergeSharedWorld(world,result),agent:nextAgent};
}

export function stepMinecraftBrains(worldInput:VoxelWorldState,stateInput:MinecraftBrainState){
  let world=normalizeVoxelWorld(worldInput);
  let state=normalizeMinecraftBrainState(stateInput,world);
  const ids:MinecraftBrainId[]=['human','macaque','mouse','fly'];

  for(const id of ids){
    const agent=state.agents[id];
    const seen=observation(world,agent);
    state={...state,cognitive:advanceCognitiveWorkspace(state.cognitive,seen)};
    const peer=nearestPeer(state,agent);
    const shadow=normalizeVoxelWorld({...world,player:{...world.player,x:agent.x,y:agent.y,z:agent.z,dimension:agent.dimension}});
    const local=chunkSnapshot(shadow,Math.floor(agent.x/16),Math.floor(agent.z/16));
    const hostileCount=local.mobs.filter(m=>m.hostile).length;
    const neural=minecraftNeuralDecision({
      seed:world.seed,
      tick:state.tick+agent.decisions,
      hunger01:Math.max(0,Math.min(1,(20-agent.hunger)/20)),
      threat01:Math.max(0,Math.min(1,hostileCount/3)),
      novelty01:Math.max(0,Math.min(1,state.cognitive.fly.exploration)),
      socialDistance:peer?.d??24,
      shelterNeed01:(agent.inventory.bed||0)>0?.15:.8
    });
    const intent=chooseIntent(world,state,agent,neural.action);
    const executed=executeAgent(world,state,agent,intent,state.tick+agent.decisions,neural.action,neural.totalSpikes);
    world=executed.world;
    state={
      ...state,
      agents:{...state.agents,[id]:executed.agent}
    };
  }

  return{
    world,
    brains:{...state,tick:state.tick+1}
  };
}

export function minecraftBrainSummary(state:MinecraftBrainState){
  return (Object.keys(state.agents) as MinecraftBrainId[]).map(id=>{
    const a=state.agents[id];
    return a.label+' · '+a.dimension+' · '+a.x+','+a.y+','+a.z+' · '+a.lastAction+' · '+a.goal;
  }).join('\n');
}
