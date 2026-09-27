import {
  advanceCognitiveWorkspace,
  createCognitiveState,
  type CognitiveState
} from '@/lib/cognitive/cognitive-workspace';
import {
  chunkSnapshot,
  executeVoxelPlan,
  localVoxelPlan,
  normalizeVoxelWorld,
  surfaceAt,
  type VoxelDimension,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';

export type MinecraftBrainId='human'|'macaque'|'mouse'|'fly';

export interface MinecraftBrainAgent{
  id:MinecraftBrainId;
  label:string;
  x:number;
  y:number;
  z:number;
  dimension:VoxelDimension;
  health:number;
  hunger:number;
  inventory:Record<string,number>;
  goal:string;
  publicThought:string;
  lastAction:string;
  decisions:number;
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
    dimension:'overworld',
    health:20,
    hunger:20,
    inventory:id==='human'?{wood_pickaxe:1,torch:4}:id==='mouse'?{food:1}:{},
    goal:'explorar e sobreviver',
    publicThought:'Observando o mundo voxel.',
    lastAction:'spawn',
    decisions:0
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

function chooseIntent(world:VoxelWorldState,brains:MinecraftBrainState,agent:MinecraftBrainAgent){
  const c=brains.cognitive;
  const has=(item:string)=>(agent.inventory[item]||0)>0;
  const oreNeed=!has('iron_ingot')&&!has('diamond');
  const dim=agent.dimension;
  const phase=(brains.tick+agent.decisions)%8;

  if(agent.health<8)return'evite monstros e procure segurança';
  if(agent.hunger<8&&Object.keys(agent.inventory).some(k=>/bread|food|meat|apple/.test(k)))return'coma para recuperar fome';

  if(agent.id==='human'){
    if(dim==='overworld'&&world.stats.chunksVisited>10&&has('obsidian')&&has('iron_ingot'))return'vá para o Nether e explore uma fortaleza';
    if(dim==='infernal'&&has('blaze_rod'))return'volte ao Overworld e procure uma stronghold';
    if(oreNeed)return'mine ferro carvão e diamante';
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

  if(c.fly.exploration>.45||phase<6)return'voe e explore rapidamente novos chunks, vilas, portais e estruturas';
  return'observe os arredores e mude para outra direção';
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

function executeAgent(world:VoxelWorldState,agent:MinecraftBrainAgent,intent:string,tick:number){
  const [dx,dz]=deterministicDirection(world.seed,tick,agent.id);
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
  const executed=executeVoxelPlan(shadow,plan);
  const result=executed.state;
  const nextAgent:MinecraftBrainAgent={
    ...agent,
    x:result.player.x,
    y:result.player.y,
    z:result.player.z,
    dimension:result.player.dimension,
    health:result.player.health,
    hunger:result.player.hunger,
    inventory:result.inventory,
    goal:intent,
    lastAction:executed.records.map(x=>x.action.type).join(' → ')||'observar',
    publicThought:intent,
    decisions:agent.decisions+1
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
    const intent=chooseIntent(world,state,agent);
    const executed=executeAgent(world,agent,intent,state.tick+agent.decisions);
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
