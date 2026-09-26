import {chooseBioAIVoxelGoal} from '@/lib/bioai';
import {
  VOXEL_BLOCKS,
  VOXEL_CHUNK_SIZE,
  biomeAt,
  blockAt,
  chunkSnapshot,
  surfaceAt,
  type VoxelBlockId,
  type VoxelWorldState
} from './minecraft-sandbox';

function clamp(v:number,min=0,max=20){return Math.max(min,Math.min(max,v))}
function floorDiv(n:number,d:number){return Math.floor(n/d)}
function key(x:number,y:number,z:number,dimension:string){return dimension+':'+x+':'+y+':'+z}
function hash(seed:number,a:number,b:number,salt=0){
  let n=(seed^Math.imul(a+1,374761393)^Math.imul(b+1,668265263)^Math.imul(salt+1,1442695041))>>>0;
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function add(inv:Record<string,number>,item:string,count=1){
  return {...inv,[item]:Math.max(0,(inv[item]||0)+count)};
}
function remember(memory:string[],text:string){return [...memory,text].slice(-64)}

export function setVoxelBioAIAutonomy(state:VoxelWorldState,enabled:boolean):VoxelWorldState{
  return {
    ...state,
    bioAI:{
      ...state.bioAI,
      autonomous:enabled,
      lastAction:enabled?'autonomia ativada':'autonomia pausada',
      memory:remember(state.bioAI.memory,enabled?'Autonomia ativada pelo usuário.':'Autonomia pausada pelo usuário.')
    }
  };
}

export function stepVoxelBioAI(state:VoxelWorldState):VoxelWorldState{
  const agent=state.bioAI;
  if(!agent?.autonomous)return state;

  const cx=floorDiv(agent.x,VOXEL_CHUNK_SIZE);
  const cz=floorDiv(agent.z,VOXEL_CHUNK_SIZE);
  const proxy:VoxelWorldState={
    ...state,
    player:{...state.player,x:agent.x,y:agent.y,z:agent.z,dimension:agent.dimension}
  };
  const snapshot=chunkSnapshot(proxy,cx,cz);
  const hostiles=snapshot.mobs.filter(x=>x.hostile);
  const villagers=snapshot.mobs.filter(x=>x.kind==='villager');
  const passive=snapshot.mobs.filter(x=>!x.hostile&&x.kind!=='villager');

  const goal=chooseBioAIVoxelGoal({
    health:agent.health,
    hunger:agent.hunger,
    hostileMobs:hostiles.length,
    passiveMobs:passive.length,
    villagers:villagers.length,
    structures:snapshot.structures.map(x=>x.kind),
    inventory:agent.inventory,
    chunksVisited:Math.max(1,agent.discoveries),
    mined:agent.blocksMined,
    placed:agent.blocksPlaced,
    crafted:Object.values(agent.inventory).reduce((sum,n)=>sum+(n||0),0),
    dungeonsCleared:0,
    day:state.day,
    biome:snapshot.biome,
    dimension:agent.dimension
  });

  let next:VoxelWorldState={
    ...state,
    bioAI:{
      ...agent,
      goal,
      tick:agent.tick+1,
      hunger:clamp(agent.hunger-(agent.tick%18===0?.18:0))
    }
  };
  next.bioAI.hunger=clamp(agent.hunger-(agent.tick%18===0 ? .18 : 0));

  const inv={...agent.inventory};
  const hasFood=(inv.bread||0)+(inv.food||0)>0;
  const hasWeapon=(inv.iron_sword||0)+(inv.stone_sword||0)+(inv.wood_sword||0)>0;

  if(agent.hunger<8&&hasFood){
    const item=(inv.bread||0)>0?'bread':'food';
    const value=item==='bread'?6:5;
    return {
      ...next,
      bioAI:{
        ...next.bioAI,
        inventory:add(inv,item,-1),
        hunger:clamp(agent.hunger+value),
        lastAction:'comeu '+item,
        memory:remember(agent.memory,'Comeu '+item+' para recuperar fome.')
      }
    };
  }

  if(hostiles.length&&hasWeapon&&agent.health>=10){
    const target=hostiles[0];
    const drop=target.kind==='skeleton'?'bone':target.kind==='spider'?'string':'rotten_flesh';
    return {
      ...next,
      discoveries:{...next.discoveries,[target.id+':defeated']:true as const},
      bioAI:{
        ...next.bioAI,
        inventory:add(inv,drop,1),
        lastAction:'derrotou '+target.label,
        memory:remember(agent.memory,'Derrotou '+target.label+' no chunk '+cx+','+cz+'.')
      }
    };
  }

  const treeBiome=['forest','plains','taiga','swamp'].includes(snapshot.biome);
  if(/madeira/.test(goal)&&treeBiome){
    return {
      ...next,
      bioAI:{
        ...next.bioAI,
        inventory:add(inv,'wood',1),
        blocksMined:agent.blocksMined+1,
        lastAction:'coletou madeira',
        memory:remember(agent.memory,'Coletou madeira no bioma '+snapshot.biome+'.')
      }
    };
  }

  if(/pedra/.test(goal)){
    return {
      ...next,
      bioAI:{
        ...next.bioAI,
        inventory:add(inv,'cobblestone',1),
        blocksMined:agent.blocksMined+1,
        lastAction:'minerou pedra',
        memory:remember(agent.memory,'Minerou pedra para progressão.')
      }
    };
  }

  if(/ferro/.test(goal)&&hash(state.seed,agent.x+agent.tick,agent.z,991)>.56){
    return {
      ...next,
      bioAI:{
        ...next.bioAI,
        inventory:add(inv,'iron_ingot',1),
        blocksMined:agent.blocksMined+1,
        lastAction:'encontrou ferro',
        memory:remember(agent.memory,'Encontrou ferro durante exploração.')
      }
    };
  }

  if(/fabricar/.test(goal)){
    if((inv.wood||0)>=1&&(inv.planks||0)<4){
      let inventory=add(inv,'wood',-1);
      inventory=add(inventory,'planks',4);
      return {...next,bioAI:{...next.bioAI,inventory,lastAction:'fabricou tábuas',memory:remember(agent.memory,'Transformou madeira em tábuas.')}};
    }
    if((inv.planks||0)>=2&&(inv.stick||0)<2){
      let inventory=add(inv,'planks',-2);
      inventory=add(inventory,'stick',4);
      return {...next,bioAI:{...next.bioAI,inventory,lastAction:'fabricou gravetos',memory:remember(agent.memory,'Fabricou gravetos.')}};
    }
    if((inv.cobblestone||0)>=2&&(inv.stick||0)>=1&&!(inv.stone_sword||0)){
      let inventory=add(inv,'cobblestone',-2);
      inventory=add(inventory,'stick',-1);
      inventory=add(inventory,'stone_sword',1);
      return {...next,bioAI:{...next.bioAI,inventory,lastAction:'fabricou espada de pedra',memory:remember(agent.memory,'Fabricou ferramenta de defesa.')}};
    }
  }

  if(/abrigo/.test(goal)&&((inv.planks||0)+(inv.cobblestone||0)>=1)){
    const block=((inv.planks||0)>0?'planks':'cobblestone') as VoxelBlockId;
    const x=Math.floor(agent.x+1),z=Math.floor(agent.z);
    const surface=surfaceAt(proxy,x,z);
    const y=surface.y+1;
    if(blockAt(proxy,x,y,z)==='air'&&VOXEL_BLOCKS[block]){
      return {
        ...next,
        modifications:{...next.modifications,[key(x,y,z,agent.dimension)]:block},
        bioAI:{
          ...next.bioAI,
          inventory:add(inv,block,-1),
          blocksPlaced:agent.blocksPlaced+1,
          lastAction:'construiu '+block,
          memory:remember(agent.memory,'Colocou '+block+' no abrigo em '+x+','+y+','+z+'.')
        }
      };
    }
  }

  const angle=hash(state.seed,agent.tick+17,cx-cz,992)*Math.PI*2;
  const step=1.15;
  const x=Math.floor(agent.x+Math.cos(angle)*step);
  const z=Math.floor(agent.z+Math.sin(angle)*step);
  const y=surfaceAt(proxy,x,z).y+1;
  const ncx=floorDiv(x,VOXEL_CHUNK_SIZE),ncz=floorDiv(z,VOXEL_CHUNK_SIZE);
  const changedChunk=ncx!==cx||ncz!==cz;
  const discoveredBiome=biomeAt(state.seed,x,z);

  return {
    ...next,
    bioAI:{
      ...next.bioAI,
      x,y,z,
      distance:agent.distance+step,
      discoveries:agent.discoveries+(changedChunk?1:0),
      lastAction:'explorou '+discoveredBiome,
      memory:changedChunk?remember(agent.memory,'Descobriu chunk '+ncx+','+ncz+' em '+discoveredBiome+'.'):agent.memory
    }
  };
}

export function voxelBioAISummary(state:VoxelWorldState){
  const a=state.bioAI;
  return [
    'BioAI @ '+a.x+','+a.y+','+a.z+' · '+a.dimension,
    'vida '+Math.round(a.health)+'/20 · fome '+Math.round(a.hunger*10)/10+'/20',
    'objetivo '+a.goal,
    'ação '+a.lastAction,
    'inventário '+Object.entries(a.inventory).filter(([,n])=>n>0).slice(0,10).map(([k,n])=>k+'×'+n).join(', '),
    'exploração '+a.discoveries+' chunks · distância '+Math.round(a.distance),
    'memória '+a.memory.length+' episódios'
  ].join('\n');
}
