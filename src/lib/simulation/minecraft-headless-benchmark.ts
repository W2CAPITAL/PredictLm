import {
  chunkSnapshot,
  createVoxelWorld,
  eatVoxelFood,
  moveVoxelPlayer,
  craftVoxelItem,
  attackVoxelMob,
  surfaceAt,
  tickVoxelWorld,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';
import {
  COGNITIVE_BENCHMARK_TASKS,
  runHeadlessExperiment,
  type BenchmarkControllerId,
  type CognitiveController,
  type ControllerAction,
  type HeadlessEnvironment,
  type SensoriumObservation,
  type StepOutcome,
  type ExperimentResult,
  defaultExperimentSpec
} from '@/lib/simulation/cognitive-world-contract';

function inventoryTotal(inv:Record<string,number>){
  return Object.values(inv).reduce((a,b)=>a+Math.max(0,b||0),0);
}

function dist2d(a:{x:number;z:number},b:{x:number;z:number}){
  return Math.hypot(a.x-b.x,a.z-b.z);
}

export class MinecraftHeadlessBenchmarkEnvironment implements HeadlessEnvironment{
  private world:VoxelWorldState=createVoxelWorld(827361);
  private task=COGNITIVE_BENCHMARK_TASKS[0].id;
  private start={x:0,z:0};
  private maxDistanceFromStart=0;
  private visitedResource=false;
  private sawThreat=false;
  private startInventoryTotal=0;

  reset(seed:number,task:typeof this.task){
    this.world=createVoxelWorld(seed);
    this.task=task;
    this.start={x:this.world.player.x,z:this.world.player.z};
    this.maxDistanceFromStart=0;
    this.visitedResource=false;
    this.sawThreat=false;
    this.startInventoryTotal=inventoryTotal(this.world.inventory);
    return this.observe();
  }

  snapshot(){
    return{
      world:this.world,
      task:this.task,
      start:this.start,
      maxDistanceFromStart:this.maxDistanceFromStart,
      visitedResource:this.visitedResource,
      sawThreat:this.sawThreat,
      startInventoryTotal:this.startInventoryTotal
    };
  }

  restore(state:any){
    if(!state?.world)throw new Error('checkpoint inválido');
    this.world=state.world;
    this.task=state.task;
    this.start=state.start;
    this.maxDistanceFromStart=state.maxDistanceFromStart||0;
    this.visitedResource=!!state.visitedResource;
    this.sawThreat=!!state.sawThreat;
    this.startInventoryTotal=state.startInventoryTotal||0;
    return this.observe();
  }

  private observe():SensoriumObservation{
    const p=this.world.player;
    const cx=Math.floor(p.x/16),cz=Math.floor(p.z/16);
    const snap=chunkSnapshot(this.world,cx,cz,10);
    const visibleGrid=[] as SensoriumObservation['visibleGrid'];
    for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
      const s=surfaceAt(this.world,p.x+dx,p.z+dz);
      visibleGrid.push({dx,dz,surface:s.block,height:s.y});
      if(['wood','wheat','coal_ore','iron_ore','gold_ore','diamond_ore'].includes(s.block))this.visitedResource=true;
    }
    const entities=snap.mobs
      .map(m=>({id:m.id,kind:m.kind,hostile:m.hostile,dx:m.x-p.x,dz:m.z-p.z}))
      .filter(e=>Math.abs(e.dx)<=10&&Math.abs(e.dz)<=10);
    if(entities.some(e=>e.hostile))this.sawThreat=true;
    return{
      tick:this.world.tick,
      seed:this.world.seed,
      position:{x:p.x,y:p.y,z:p.z,dimension:p.dimension},
      hp:p.health,
      hunger:p.hunger,
      inventory:{...this.world.inventory},
      visibleGrid,
      entities,
      structures:snap.structures.map(s=>s.kind),
      goal:this.task,
      partialObservability:1,
      actionDelayTicks:0
    };
  }

  apply(action:ControllerAction):StepOutcome{
    const before=this.world;
    const beforeItems=inventoryTotal(before.inventory);
    const beforePos={x:before.player.x,z:before.player.z};
    const events:string[]=[];
    let replanned=false;

    if(action.type==='move'){
      this.world=moveVoxelPlayer(this.world,action.dx||0,action.dz||0);
      events.push('move');
    }else if(action.type==='craft'){
      const result=craftVoxelItem(this.world,action.recipe||action.target||'planks');
      this.world=result.state;
      events.push(result.ok?'craft:ok':'craft:failed');
      replanned=!result.ok;
    }else if(action.type==='interact'&&action.target==='food'){
      const item=(this.world.inventory.bread||0)>0?'bread':(this.world.inventory.food||0)>0?'food':'apple';
      const result=eatVoxelFood(this.world,item);
      this.world=result.state;
      events.push(result.ok?'eat:ok':'eat:failed');
      replanned=!result.ok;
    }else if(action.type==='attack'){
      const p=this.world.player;
      const snap=chunkSnapshot(this.world,Math.floor(p.x/16),Math.floor(p.z/16),12);
      const target=snap.mobs
        .filter(m=>m.hostile)
        .sort((a,b)=>dist2d(a,p)-dist2d(b,p))[0];
      if(target){
        const result=attackVoxelMob(this.world,target);
        this.world=result.state;
        events.push('attack');
      }else{
        events.push('attack:none');
        replanned=true;
      }
    }else{
      events.push(action.type);
    }

    this.world=tickVoxelWorld(this.world,1);
    const afterPos={x:this.world.player.x,z:this.world.player.z};
    const distanceDelta=dist2d(beforePos,afterPos);
    this.maxDistanceFromStart=Math.max(this.maxDistanceFromStart,dist2d(this.start,afterPos));
    const itemsDelta=Math.max(0,inventoryTotal(this.world.inventory)-beforeItems);
    const objectiveReached=this.objectiveReached();
    return{
      observation:this.observe(),
      reward:objectiveReached?1:itemsDelta>0?.2:distanceDelta>0?.02:0,
      events,
      done:objectiveReached||this.world.player.health<=0,
      objectiveReached,
      distanceDelta,
      itemsDelta,
      death:this.world.player.health<=0,
      replanned,
      cooperationEvent:false
    };
  }

  private objectiveReached(){
    const w=this.world;
    const distanceHome=dist2d(this.start,w.player);
    switch(this.task){
      case'explore':return w.stats.chunksVisited>=4||this.maxDistanceFromStart>=24;
      case'remember-base':return this.maxDistanceFromStart>=10&&distanceHome<=3;
      case'find-food':return (w.inventory.food||0)+(w.inventory.bread||0)+(w.inventory.apple||0)>0;
      case'avoid-threat':return this.sawThreat&&w.player.health>=16&&w.tick>=40;
      case'craft-minimum':return w.stats.crafted>=1;
      case'long-path':return this.maxDistanceFromStart>=48;
      case'multi-objective':return this.maxDistanceFromStart>=20&&inventoryTotal(w.inventory)>this.startInventoryTotal&&w.player.health>0;
      case'memory-probe':return this.visitedResource&&this.maxDistanceFromStart>=12&&distanceHome<=4;
      case'distractor':return this.maxDistanceFromStart>=18&&w.player.health>0;
      case'planning-3-step':return w.stats.crafted>=3;
      case'cooperation':return false;
      case'competition':return false;
      default:return false;
    }
  }
}

export function runMinecraftHeadlessBenchmark(
  controller:CognitiveController,
  options:{seed?:number;task?:Parameters<typeof defaultExperimentSpec>[1];actionBudget?:number}={}
):ExperimentResult{
  const spec=defaultExperimentSpec(controller.id as BenchmarkControllerId,options.task||'explore',options.seed||827361);
  if(options.actionBudget)spec.actionBudget=options.actionBudget;
  return runHeadlessExperiment(spec,controller,new MinecraftHeadlessBenchmarkEnvironment());
}
