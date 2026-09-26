import {createLifeSimulation,type LifeLocation,type LifeSimulationState} from '@/lib/life-simulation-engine';
import {createVoxelWorld,normalizeVoxelWorld,type VoxelWorldState} from './minecraft-sandbox';

export interface LifeVoxelWorldState{
  version:1;
  kind:'predictlm-lifevoxel';
  worldId:string;
  seed:number;
  createdAt:number;
  updatedAt:number;
  life:LifeSimulationState;
  voxel:VoxelWorldState;
}

const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

function stableWorldId(seed:number){
  return 'lifevoxel-'+Math.abs(seed|0).toString(36);
}

function minuteToVoxelTime(minute:number){
  const normalized=((Number(minute||0)%1440)+1440)%1440;
  return Math.round(normalized/1440*24000)%24000;
}

function voxelTimeToMinute(timeOfDay:number){
  const normalized=((Number(timeOfDay||0)%24000)+24000)%24000;
  return Math.round(normalized/24000*1440)%1440;
}

function lifeNeedToHearts(value:number){
  return clamp(Number(value||0)/5,0,20);
}

function heartsToLifeNeed(value:number){
  return clamp(Math.round(Number(value||0)*5),0,100);
}

export function createLifeVoxelWorld(name?:string,seed=827361):LifeVoxelWorldState{
  const life=createLifeSimulation(name,seed);
  const voxel=createVoxelWorld(seed);
  const now=Date.now();
  return syncLifeToVoxel({
    version:1,
    kind:'predictlm-lifevoxel',
    worldId:stableWorldId(seed),
    seed,
    createdAt:now,
    updatedAt:now,
    life,
    voxel
  },life);
}

export function normalizeLifeVoxelWorld(
  raw:any,
  legacyLife?:LifeSimulationState|null,
  legacyVoxel?:VoxelWorldState|null
):LifeVoxelWorldState{
  if(raw?.version===1&&raw?.kind==='predictlm-lifevoxel'&&raw.life&&raw.voxel){
    const voxel=normalizeVoxelWorld(raw.voxel);
    const seed=Number(raw.seed)||voxel.seed||827361;
    const lifeFresh=createLifeSimulation(raw.life?.person?.name,seed);
    const life:LifeSimulationState={
      ...lifeFresh,
      ...raw.life,
      version:1,
      seed,
      person:{...lifeFresh.person,...raw.life.person},
      needs:{...lifeFresh.needs,...raw.life.needs},
      relationships:Array.isArray(raw.life.relationships)?raw.life.relationships:lifeFresh.relationships,
      memories:Array.isArray(raw.life.memories)?raw.life.memories.slice(0,80):lifeFresh.memories,
      neuro:raw.life.neuro||lifeFresh.neuro,
      places:Array.isArray(raw.life.places)?raw.life.places:lifeFresh.places,
      objectInteraction:raw.life.objectInteraction||null
    };
    return syncLifeToVoxel({
      version:1,
      kind:'predictlm-lifevoxel',
      worldId:String(raw.worldId||stableWorldId(seed)),
      seed,
      createdAt:Number(raw.createdAt)||Date.now(),
      updatedAt:Number(raw.updatedAt)||Date.now(),
      life,
      voxel:{...voxel,seed}
    },life);
  }

  const voxel=legacyVoxel?normalizeVoxelWorld(legacyVoxel):createVoxelWorld(legacyLife?.seed||827361);
  const seed=Number(voxel.seed||legacyLife?.seed)||827361;
  const lifeBase=legacyLife||createLifeSimulation(undefined,seed);
  const life={...lifeBase,seed} as LifeSimulationState;
  const now=Date.now();
  return syncLifeToVoxel({
    version:1,
    kind:'predictlm-lifevoxel',
    worldId:stableWorldId(seed),
    seed,
    createdAt:now,
    updatedAt:now,
    life,
    voxel:{...voxel,seed}
  },life);
}

export function syncLifeToVoxel(world:LifeVoxelWorldState,life:LifeSimulationState):LifeVoxelWorldState{
  const voxel=world.voxel;
  const latestMemory=life.memories?.[0]?.summary||'';
  const memory=latestMemory&&voxel.bioAI?.memory?.[voxel.bioAI.memory.length-1]!==latestMemory
    ?[...(voxel.bioAI?.memory||[]),latestMemory].slice(-64)
    :(voxel.bioAI?.memory||[]);
  const nextVoxel:VoxelWorldState={
    ...voxel,
    seed:world.seed,
    day:Math.max(1,life.day),
    timeOfDay:minuteToVoxelTime(life.minute),
    player:{
      ...voxel.player,
      health:lifeNeedToHearts(life.needs.health),
      hunger:lifeNeedToHearts(life.needs.hunger)
    },
    bioAI:{
      ...voxel.bioAI,
      health:lifeNeedToHearts(life.needs.health),
      hunger:lifeNeedToHearts(life.needs.hunger),
      memory
    }
  };
  return {...world,life:{...life,seed:world.seed},voxel:nextVoxel,updatedAt:Date.now()};
}

export function syncVoxelToLife(world:LifeVoxelWorldState,voxel:VoxelWorldState):LifeVoxelWorldState{
  const life=world.life;
  const latestAction=voxel.bioAI?.lastAction||'';
  const actionChanged=latestAction&&latestAction!==life.lastEvent;
  const nextLife:LifeSimulationState={
    ...life,
    seed:world.seed,
    day:Math.max(1,voxel.day||life.day),
    minute:voxelTimeToMinute(voxel.timeOfDay),
    needs:{
      ...life.needs,
      health:heartsToLifeNeed(voxel.bioAI?.health??voxel.player.health),
      hunger:heartsToLifeNeed(voxel.bioAI?.hunger??voxel.player.hunger)
    },
    lastEvent:actionChanged?'LifeVoxel · '+latestAction:life.lastEvent
  };
  return {...world,life:nextLife,voxel:{...voxel,seed:world.seed},updatedAt:Date.now()};
}

export function updateLifeVoxelLife(world:LifeVoxelWorldState,life:LifeSimulationState){
  return syncLifeToVoxel({...world,life},life);
}

export function updateLifeVoxelVoxel(world:LifeVoxelWorldState,voxel:VoxelWorldState){
  return syncVoxelToLife({...world,voxel},voxel);
}

export function lifeVoxelPoi(seed:number,location:LifeLocation){
  const order:LifeLocation[]=['Casa','Trabalho','Café','Parque','Mercado','Clínica','Biblioteca'];
  const index=Math.max(0,order.indexOf(location));
  const angle=index/order.length*Math.PI*2;
  const ring=18+(index%3)*9;
  const jitter=((seed>>>((index%4)*4))&15)-7;
  return {
    x:Math.round(Math.cos(angle)*ring+jitter),
    z:Math.round(Math.sin(angle)*ring-jitter),
    label:location
  };
}

export function lifeVoxelSummary(world:LifeVoxelWorldState){
  return [
    'LifeVoxel '+world.worldId+' · seed '+world.seed,
    'dia '+world.life.day+' · minuto '+world.life.minute+' · voxel '+Math.round(world.voxel.timeOfDay),
    'vida '+world.life.person.name+' · '+world.life.person.location+' · '+world.life.person.currentAction,
    'BioAI '+world.voxel.bioAI.goal+' · '+world.voxel.bioAI.lastAction,
    'posição voxel '+world.voxel.bioAI.x+','+world.voxel.bioAI.y+','+world.voxel.bioAI.z,
    'memórias sociais '+world.life.memories.length+' · memórias mundo '+world.voxel.bioAI.memory.length
  ].join('\n');
}
