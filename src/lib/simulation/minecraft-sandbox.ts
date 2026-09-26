import {
  createUnityGameObject,
  createUnityScene,
  unityComponent,
  v3,
  type UnitySceneSnapshot
} from '@/lib/unity-fabric';

export const VOXEL_CHUNK_SIZE=16;
export const VOXEL_WORLD_HEIGHT=128;
export const VOXEL_SEA_LEVEL=42;

export type VoxelDimension='overworld'|'infernal'|'void';
export type VoxelBiome='plains'|'forest'|'desert'|'mountains'|'taiga'|'swamp'|'ocean'|'badlands';
export type VoxelWeather='clear'|'rain'|'storm';

export type VoxelBlockId=
  |'air'|'bedrock'|'stone'|'cobblestone'|'dirt'|'grass'|'sand'|'water'|'lava'
  |'wood'|'leaves'|'planks'|'glass'|'coal_ore'|'iron_ore'|'gold_ore'|'diamond_ore'
  |'crafting_table'|'furnace'|'torch'|'chest'|'farmland'|'wheat'|'bricks'|'obsidian';

export interface VoxelBlockDef{
  id:VoxelBlockId;
  label:string;
  solid:boolean;
  transparent:boolean;
  hardness:number;
  drop:string|null;
  light:number;
}

export const VOXEL_BLOCKS:Record<VoxelBlockId,VoxelBlockDef>={
  air:{id:'air',label:'Ar',solid:false,transparent:true,hardness:0,drop:null,light:0},
  bedrock:{id:'bedrock',label:'Rocha-mãe',solid:true,transparent:false,hardness:999,drop:null,light:0},
  stone:{id:'stone',label:'Pedra',solid:true,transparent:false,hardness:2,drop:'cobblestone',light:0},
  cobblestone:{id:'cobblestone',label:'Pedregulho',solid:true,transparent:false,hardness:2,drop:'cobblestone',light:0},
  dirt:{id:'dirt',label:'Terra',solid:true,transparent:false,hardness:.6,drop:'dirt',light:0},
  grass:{id:'grass',label:'Grama',solid:true,transparent:false,hardness:.7,drop:'dirt',light:0},
  sand:{id:'sand',label:'Areia',solid:true,transparent:false,hardness:.5,drop:'sand',light:0},
  water:{id:'water',label:'Água',solid:false,transparent:true,hardness:0,drop:null,light:0},
  lava:{id:'lava',label:'Lava',solid:false,transparent:true,hardness:0,drop:null,light:11},
  wood:{id:'wood',label:'Tronco',solid:true,transparent:false,hardness:1.6,drop:'wood',light:0},
  leaves:{id:'leaves',label:'Folhas',solid:true,transparent:true,hardness:.25,drop:null,light:0},
  planks:{id:'planks',label:'Tábuas',solid:true,transparent:false,hardness:1.2,drop:'planks',light:0},
  glass:{id:'glass',label:'Vidro',solid:true,transparent:true,hardness:.35,drop:null,light:0},
  coal_ore:{id:'coal_ore',label:'Carvão',solid:true,transparent:false,hardness:2.2,drop:'coal',light:0},
  iron_ore:{id:'iron_ore',label:'Ferro bruto',solid:true,transparent:false,hardness:2.8,drop:'raw_iron',light:0},
  gold_ore:{id:'gold_ore',label:'Ouro bruto',solid:true,transparent:false,hardness:3,drop:'raw_gold',light:0},
  diamond_ore:{id:'diamond_ore',label:'Diamante',solid:true,transparent:false,hardness:3.5,drop:'diamond',light:0},
  crafting_table:{id:'crafting_table',label:'Bancada',solid:true,transparent:false,hardness:1.8,drop:'crafting_table',light:0},
  furnace:{id:'furnace',label:'Fornalha',solid:true,transparent:false,hardness:2.4,drop:'furnace',light:0},
  torch:{id:'torch',label:'Tocha',solid:false,transparent:true,hardness:.1,drop:'torch',light:13},
  chest:{id:'chest',label:'Baú',solid:true,transparent:false,hardness:1.5,drop:'chest',light:0},
  farmland:{id:'farmland',label:'Terra arada',solid:true,transparent:false,hardness:.6,drop:'dirt',light:0},
  wheat:{id:'wheat',label:'Trigo',solid:false,transparent:true,hardness:.15,drop:'wheat',light:0},
  bricks:{id:'bricks',label:'Tijolos',solid:true,transparent:false,hardness:2,drop:'bricks',light:0},
  obsidian:{id:'obsidian',label:'Obsidiana',solid:true,transparent:false,hardness:8,drop:'obsidian',light:0}
};

export interface VoxelPlayer{
  x:number;y:number;z:number;
  yaw:number;pitch:number;
  health:number;hunger:number;armor:number;
  experience:number;level:number;
  mode:'survival'|'creative';
  dimension:VoxelDimension;
  selected:string;
}

export interface VoxelMob{
  id:string;
  kind:'sheep'|'pig'|'cow'|'zombie'|'skeleton'|'spider'|'villager'|'dungeon_guard'|'boss';
  x:number;y:number;z:number;
  health:number;
  hostile:boolean;
  label:string;
}

export interface VoxelStructure{
  id:string;
  kind:'village'|'ruin'|'cave'|'dungeon'|'mineshaft'|'tower';
  x:number;z:number;
  label:string;
  discovered:boolean;
}

export interface VoxelEvent{
  id:string;
  tick:number;
  kind:string;
  text:string;
}

export interface VoxelWorldState{
  version:1;
  seed:number;
  tick:number;
  timeOfDay:number;
  day:number;
  weather:VoxelWeather;
  player:VoxelPlayer;
  inventory:Record<string,number>;
  modifications:Record<string,VoxelBlockId>;
  discoveries:Record<string,true>;
  achievements:string[];
  events:VoxelEvent[];
  stats:{mined:number;placed:number;crafted:number;mobsDefeated:number;distance:number;chunksVisited:number;dungeonsCleared:number};
}

export interface VoxelSurfaceCell{
  x:number;z:number;y:number;
  block:VoxelBlockId;
  biome:VoxelBiome;
  light:number;
}

export interface VoxelChunkSnapshot{
  cx:number;cz:number;
  biome:VoxelBiome;
  cells:VoxelSurfaceCell[];
  structures:VoxelStructure[];
  mobs:VoxelMob[];
}

export interface CraftRecipe{
  id:string;
  label:string;
  input:Record<string,number>;
  output:Record<string,number>;
  table?:boolean;
}

export const CRAFT_RECIPES:CraftRecipe[]=[
  {id:'planks',label:'Tábuas',input:{wood:1},output:{planks:4}},
  {id:'sticks',label:'Gravetos',input:{planks:2},output:{stick:4}},
  {id:'crafting_table',label:'Bancada',input:{planks:4},output:{crafting_table:1}},
  {id:'wood_pickaxe',label:'Picareta de madeira',input:{planks:3,stick:2},output:{wood_pickaxe:1},table:true},
  {id:'stone_pickaxe',label:'Picareta de pedra',input:{cobblestone:3,stick:2},output:{stone_pickaxe:1},table:true},
  {id:'iron_pickaxe',label:'Picareta de ferro',input:{iron_ingot:3,stick:2},output:{iron_pickaxe:1},table:true},
  {id:'furnace',label:'Fornalha',input:{cobblestone:8},output:{furnace:1},table:true},
  {id:'torch',label:'Tochas',input:{coal:1,stick:1},output:{torch:4}},
  {id:'chest',label:'Baú',input:{planks:8},output:{chest:1},table:true},
  {id:'bricks',label:'Tijolos',input:{cobblestone:4},output:{bricks:4},table:true}
];

export const SMELT_RECIPES:Record<string,{fuel:number;output:string}>={
  raw_iron:{fuel:1,output:'iron_ingot'},
  raw_gold:{fuel:1,output:'gold_ingot'},
  sand:{fuel:1,output:'glass'}
};

function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function floorDiv(n:number,d:number){return Math.floor(n/d)}
function key(x:number,y:number,z:number,dimension:VoxelDimension){return dimension+':'+x+':'+y+':'+z}
function chunkKey(cx:number,cz:number,dimension:VoxelDimension){return dimension+':'+cx+':'+cz}

function mix32(n:number){
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  return (n^(n>>>16))>>>0;
}

function hash2(seed:number,x:number,z:number,salt=0){
  const n=mix32(seed^Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(salt,1442695041));
  return n/4294967295;
}

function smooth(t:number){return t*t*(3-2*t)}
function valueNoise(seed:number,x:number,z:number,scale:number,salt=0){
  const fx=x/scale,fz=z/scale;
  const x0=Math.floor(fx),z0=Math.floor(fz);
  const tx=smooth(fx-x0),tz=smooth(fz-z0);
  const a=hash2(seed,x0,z0,salt),b=hash2(seed,x0+1,z0,salt);
  const c=hash2(seed,x0,z0+1,salt),d=hash2(seed,x0+1,z0+1,salt);
  const ab=a+(b-a)*tx,cd=c+(d-c)*tx;
  return ab+(cd-ab)*tz;
}

function fractal(seed:number,x:number,z:number){
  return valueNoise(seed,x,z,96,1)*.48+
    valueNoise(seed,x,z,48,2)*.28+
    valueNoise(seed,x,z,24,3)*.16+
    valueNoise(seed,x,z,12,4)*.08;
}

export function biomeAt(seed:number,x:number,z:number):VoxelBiome{
  const temperature=valueNoise(seed,x,z,180,20);
  const moisture=valueNoise(seed,x,z,150,21);
  const continental=valueNoise(seed,x,z,260,22);
  const ridge=Math.abs(valueNoise(seed,x,z,84,23)-.5)*2;
  if(continental<.26)return'ocean';
  if(ridge>.77)return'mountains';
  if(temperature>.72&&moisture<.38)return'desert';
  if(temperature>.67&&moisture<.55)return'badlands';
  if(temperature<.35)return'taiga';
  if(moisture>.72)return'swamp';
  if(moisture>.48)return'forest';
  return'plains';
}

export function terrainHeight(seed:number,x:number,z:number,dimension:VoxelDimension='overworld'){
  if(dimension==='infernal'){
    const n=fractal(seed+7001,x,z);
    return clamp(Math.floor(24+n*48),12,82);
  }
  if(dimension==='void'){
    const islands=valueNoise(seed+9001,x,z,38,7);
    return islands>.74?Math.floor(48+(islands-.74)*72):4;
  }
  const biome=biomeAt(seed,x,z);
  const n=fractal(seed,x,z);
  const broad=valueNoise(seed,x,z,330,11);
  let base=34+n*28+(broad-.5)*16;
  if(biome==='mountains')base+=18+Math.abs(n-.5)*35;
  if(biome==='ocean')base-=15;
  if(biome==='desert')base-=2;
  if(biome==='swamp')base-=5;
  return clamp(Math.floor(base),5,VOXEL_WORLD_HEIGHT-12);
}

function treeMask(seed:number,x:number,z:number,biome:VoxelBiome){
  if(!['forest','plains','taiga','swamp'].includes(biome))return false;
  const chance=biome==='forest'?.075:biome==='taiga'?.06:.022;
  return hash2(seed,x,z,61)<chance&&hash2(seed,x>>1,z>>1,62)>.25;
}

function naturalBlockAt(seed:number,x:number,y:number,z:number,dimension:VoxelDimension):VoxelBlockId{
  if(y<0||y>=VOXEL_WORLD_HEIGHT)return'air';
  if(y===0)return'bedrock';
  const h=terrainHeight(seed,x,z,dimension);
  const biome=biomeAt(seed,x,z);

  if(dimension==='infernal'){
    if(y>h)return y<20?'lava':'air';
    if(y===h)return hash2(seed,x,z,102)>.9?'obsidian':'stone';
    if(y<h-12&&hash2(seed,x+y,z,103)>.982)return'gold_ore';
    return'stone';
  }
  if(dimension==='void'){
    if(h<=4||y>h)return'air';
    if(y===h)return hash2(seed,x,z,110)>.85?'obsidian':'stone';
    return y<h-4?'stone':'dirt';
  }

  if(y>h){
    if(y<=VOXEL_SEA_LEVEL)return'water';
    if(treeMask(seed,x,z,biome)){
      const trunk=4+(hash2(seed,x,z,63)>.55?1:0);
      if(y>h&&y<=h+trunk)return'wood';
      const dy=y-(h+trunk);
      if(dy>=-1&&dy<=2){
        const spread=dy===2?1:2;
        for(let dx=-spread;dx<=spread;dx++)for(let dz=-spread;dz<=spread;dz++){
          if(dx===0&&dz===0&&dy<0)continue;
          if(treeMask(seed,x-dx,z-dz,biome))return'leaves';
        }
      }
    }
    return'air';
  }

  if(y===h){
    if(biome==='desert'||biome==='badlands'||biome==='ocean')return'sand';
    return'grass';
  }
  if(y>=h-3)return biome==='desert'||biome==='badlands'?'sand':'dirt';

  const ore=hash2(seed,x+y*17,z,40);
  if(y<18&&ore>.994)return'diamond_ore';
  if(y<34&&ore>.988)return'gold_ore';
  if(y<58&&ore>.976)return'iron_ore';
  if(y<78&&ore>.962)return'coal_ore';
  return'stone';
}

export function createVoxelWorld(seed=Math.floor(Math.random()*2_000_000_000)):VoxelWorldState{
  const x=0,z=0;
  const y=terrainHeight(seed,x,z)+2;
  return{
    version:1,
    seed,
    tick:0,
    timeOfDay:9000,
    day:1,
    weather:'clear',
    player:{x,y,z,yaw:0,pitch:0,health:20,hunger:20,armor:0,experience:0,level:0,mode:'survival',dimension:'overworld',selected:'dirt'},
    inventory:{wood_pickaxe:1,torch:8},
    modifications:{},
    discoveries:{},
    achievements:[],
    events:[{id:'spawn',tick:0,kind:'world',text:'Novo mundo voxel iniciado.'}],
    stats:{mined:0,placed:0,crafted:0,mobsDefeated:0,distance:0,chunksVisited:1,dungeonsCleared:0}
  };
}

export function normalizeVoxelWorld(input:any):VoxelWorldState{
  const fresh=createVoxelWorld(Number(input?.seed)||undefined);
  if(!input||input.version!==1)return fresh;
  return{
    ...fresh,
    ...input,
    player:{...fresh.player,...input.player},
    inventory:{...fresh.inventory,...input.inventory},
    modifications:{...input.modifications},
    discoveries:{...input.discoveries},
    achievements:Array.isArray(input.achievements)?input.achievements.slice(-120):[],
    events:Array.isArray(input.events)?input.events.slice(-120):fresh.events,
    stats:{...fresh.stats,...input.stats}
  };
}

export function blockAt(state:VoxelWorldState,x:number,y:number,z:number):VoxelBlockId{
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const changed=state.modifications[key(ix,iy,iz,state.player.dimension)];
  return changed||naturalBlockAt(state.seed,ix,iy,iz,state.player.dimension);
}

export function surfaceAt(state:VoxelWorldState,x:number,z:number):VoxelSurfaceCell{
  const ix=Math.floor(x),iz=Math.floor(z);
  for(let y=VOXEL_WORLD_HEIGHT-1;y>=0;y--){
    const block=blockAt(state,ix,y,iz);
    if(block!=='air'){
      return{
        x:ix,z:iz,y,block,
        biome:biomeAt(state.seed,ix,iz),
        light:Math.max(0,15-Math.floor(Math.abs(state.timeOfDay-6000)/1200))
      };
    }
  }
  return{x:ix,z:iz,y:0,block:'bedrock',biome:'plains',light:8};
}

export function structureForChunk(state:VoxelWorldState,cx:number,cz:number):VoxelStructure[]{
  const seed=state.seed+(state.player.dimension==='infernal'?3000:state.player.dimension==='void'?6000:0);
  const r=hash2(seed,cx,cz,200);
  const baseX=cx*VOXEL_CHUNK_SIZE+Math.floor(hash2(seed,cx,cz,201)*VOXEL_CHUNK_SIZE);
  const baseZ=cz*VOXEL_CHUNK_SIZE+Math.floor(hash2(seed,cx,cz,202)*VOXEL_CHUNK_SIZE);
  let kind:VoxelStructure['kind']|null=null;
  if(r>.986)kind='dungeon';
  else if(r>.97)kind='village';
  else if(r>.945)kind='mineshaft';
  else if(r>.92)kind='ruin';
  else if(r>.885)kind='cave';
  else if(r>.872)kind='tower';
  if(!kind)return[];
  const id=chunkKey(cx,cz,state.player.dimension)+':'+kind;
  return[{id,kind,x:baseX,z:baseZ,label:kind==='dungeon'?'Masmorra procedural':kind[0].toUpperCase()+kind.slice(1),discovered:!!state.discoveries[id]}];
}

export function mobsForChunk(state:VoxelWorldState,cx:number,cz:number):VoxelMob[]{
  const daylight=state.timeOfDay>=0&&state.timeOfDay<12000;
  const count=1+Math.floor(hash2(state.seed,cx,cz,320)*4);
  const out:VoxelMob[]=[];
  for(let i=0;i<count;i++){
    const x=cx*VOXEL_CHUNK_SIZE+Math.floor(hash2(state.seed+i,cx,cz,321)*VOXEL_CHUNK_SIZE);
    const z=cz*VOXEL_CHUNK_SIZE+Math.floor(hash2(state.seed+i,cx,cz,322)*VOXEL_CHUNK_SIZE);
    const y=terrainHeight(state.seed,x,z,state.player.dimension)+1;
    const r=hash2(state.seed+i,cx,cz,323);
    let kind:VoxelMob['kind'];
    if(daylight)kind=r>.88?'villager':r>.58?'cow':r>.28?'pig':'sheep';
    else kind=r>.82?'spider':r>.45?'skeleton':'zombie';
    const hostile=!daylight&&kind!=='villager';
    out.push({id:chunkKey(cx,cz,state.player.dimension)+':mob:'+i,kind,x,y,z,health:hostile?20:10,hostile,label:kind.replace('_',' ')});
  }
  for(const structure of structureForChunk(state,cx,cz)){
    if(structure.kind==='dungeon'){
      out.push({id:structure.id+':guard',kind:'dungeon_guard',x:structure.x,y:terrainHeight(state.seed,structure.x,structure.z)+1,z:structure.z,health:34,hostile:true,label:'Guardião da masmorra'});
    }
  }
  return out;
}

export function chunkSnapshot(state:VoxelWorldState,cx:number,cz:number,radius=16):VoxelChunkSnapshot{
  const cells:VoxelSurfaceCell[]=[];
  const size=Math.max(4,Math.min(VOXEL_CHUNK_SIZE,Math.floor(radius)));
  for(let lx=0;lx<size;lx++)for(let lz=0;lz<size;lz++){
    cells.push(surfaceAt(state,cx*VOXEL_CHUNK_SIZE+lx,cz*VOXEL_CHUNK_SIZE+lz));
  }
  const centerX=cx*VOXEL_CHUNK_SIZE+8,centerZ=cz*VOXEL_CHUNK_SIZE+8;
  return{
    cx,cz,
    biome:biomeAt(state.seed,centerX,centerZ),
    cells,
    structures:structureForChunk(state,cx,cz),
    mobs:mobsForChunk(state,cx,cz)
  };
}

export function chunksAroundPlayer(state:VoxelWorldState,radius=1){
  const cx=floorDiv(state.player.x,VOXEL_CHUNK_SIZE);
  const cz=floorDiv(state.player.z,VOXEL_CHUNK_SIZE);
  const out:VoxelChunkSnapshot[]=[];
  for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)out.push(chunkSnapshot(state,cx+dx,cz+dz));
  return out;
}

function withEvent(state:VoxelWorldState,kind:string,text:string){
  return{
    ...state,
    events:[...state.events,{id:state.tick+':'+kind+':'+state.events.length,tick:state.tick,kind,text}].slice(-120)
  };
}

function addItem(inventory:Record<string,number>,item:string,count=1){
  return{...inventory,[item]:Math.max(0,(inventory[item]||0)+count)};
}

function hasItems(inventory:Record<string,number>,needs:Record<string,number>){
  return Object.entries(needs).every(([item,count])=>(inventory[item]||0)>=count);
}

function consumeItems(inventory:Record<string,number>,needs:Record<string,number>){
  const next={...inventory};
  for(const [item,count] of Object.entries(needs))next[item]=Math.max(0,(next[item]||0)-count);
  return next;
}

export function moveVoxelPlayer(state:VoxelWorldState,dx:number,dz:number){
  const len=Math.hypot(dx,dz)||1;
  const step=state.player.mode==='creative'?2.4:1.25;
  const x=Math.floor(state.player.x+dx/len*step);
  const z=Math.floor(state.player.z+dz/len*step);
  const y=surfaceAt(state,x,z).y+1;
  const oldChunk=chunkKey(floorDiv(state.player.x,VOXEL_CHUNK_SIZE),floorDiv(state.player.z,VOXEL_CHUNK_SIZE),state.player.dimension);
  const newChunk=chunkKey(floorDiv(x,VOXEL_CHUNK_SIZE),floorDiv(z,VOXEL_CHUNK_SIZE),state.player.dimension);
  const discoveries={...state.discoveries};
  let chunksVisited=state.stats.chunksVisited;
  if(!discoveries[newChunk]){
    discoveries[newChunk]=true;
    chunksVisited+=1;
  }
  let next:VoxelWorldState={
    ...state,
    player:{...state.player,x,y,z,yaw:Math.atan2(dx,dz)},
    discoveries,
    stats:{...state.stats,distance:state.stats.distance+step,chunksVisited}
  };
  if(oldChunk!==newChunk)next=withEvent(next,'explore','Novo chunk explorado '+newChunk+'.');
  for(const structure of structureForChunk(next,floorDiv(x,VOXEL_CHUNK_SIZE),floorDiv(z,VOXEL_CHUNK_SIZE))){
    const dist=Math.hypot(structure.x-x,structure.z-z);
    if(dist<8&&!discoveries[structure.id]){
      next={...next,discoveries:{...next.discoveries,[structure.id]:true}};
      next=withEvent(next,'structure','Descoberta: '+structure.label+'.');
    }
  }
  return next;
}

export function mineVoxelBlock(state:VoxelWorldState,x:number,y:number,z:number){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const block=blockAt(state,ix,iy,iz);
  if(block==='air'||block==='water'||block==='lava')return{state,ok:false,message:'Não há bloco minerável aqui.'};
  if(block==='bedrock')return{state,ok:false,message:'A rocha-mãe não pode ser quebrada no modo sobrevivência.'};
  const def=VOXEL_BLOCKS[block];
  let inventory={...state.inventory};
  if(def.drop)inventory=addItem(inventory,def.drop,1);
  const modifications={...state.modifications,[key(ix,iy,iz,state.player.dimension)]:'air' as VoxelBlockId};
  let next:VoxelWorldState={...state,inventory,modifications,stats:{...state.stats,mined:state.stats.mined+1}};
  next=withEvent(next,'mine','Minerou '+def.label+' em '+ix+','+iy+','+iz+'.');
  return{state:next,ok:true,message:'Minerou '+def.label+'.',drop:def.drop};
}

export function placeVoxelBlock(state:VoxelWorldState,x:number,y:number,z:number,block?:VoxelBlockId){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);
  const chosen=(block||state.player.selected) as VoxelBlockId;
  if(!VOXEL_BLOCKS[chosen]||chosen==='air'||chosen==='water'||chosen==='lava')return{state,ok:false,message:'Bloco inválido.'};
  if(blockAt(state,ix,iy,iz)!=='air'&&blockAt(state,ix,iy,iz)!=='water')return{state,ok:false,message:'O espaço já está ocupado.'};
  if(state.player.mode!=='creative'&&(state.inventory[chosen]||0)<=0)return{state,ok:false,message:'Você não possui '+VOXEL_BLOCKS[chosen].label+'.'};
  const inventory=state.player.mode==='creative'?state.inventory:addItem(state.inventory,chosen,-1);
  const modifications={...state.modifications,[key(ix,iy,iz,state.player.dimension)]:chosen};
  let next:VoxelWorldState={...state,inventory,modifications,stats:{...state.stats,placed:state.stats.placed+1}};
  next=withEvent(next,'place','Colocou '+VOXEL_BLOCKS[chosen].label+' em '+ix+','+iy+','+iz+'.');
  return{state:next,ok:true,message:'Bloco colocado.'};
}

export function craftVoxelItem(state:VoxelWorldState,recipeId:string){
  const recipe=CRAFT_RECIPES.find(x=>x.id===recipeId);
  if(!recipe)return{state,ok:false,message:'Receita desconhecida.'};
  if(!hasItems(state.inventory,recipe.input))return{state,ok:false,message:'Materiais insuficientes para '+recipe.label+'.'};
  let inventory=consumeItems(state.inventory,recipe.input);
  for(const [item,count] of Object.entries(recipe.output))inventory=addItem(inventory,item,count);
  let next:VoxelWorldState={...state,inventory,stats:{...state.stats,crafted:state.stats.crafted+1}};
  next=withEvent(next,'craft','Criou '+recipe.label+'.');
  return{state:next,ok:true,message:'Criado: '+recipe.label+'.'};
}

export function smeltVoxelItem(state:VoxelWorldState,item:string){
  const recipe=SMELT_RECIPES[item];
  if(!recipe)return{state,ok:false,message:'Esse item não pode ser fundido.'};
  if((state.inventory[item]||0)<1)return{state,ok:false,message:'Item ausente.'};
  const coal=state.inventory.coal||0;
  const wood=state.inventory.wood||0;
  if(coal<recipe.fuel&&wood<recipe.fuel)return{state,ok:false,message:'É necessário combustível.'};
  let inventory=addItem(state.inventory,item,-1);
  inventory=coal>=recipe.fuel?addItem(inventory,'coal',-recipe.fuel):addItem(inventory,'wood',-recipe.fuel);
  inventory=addItem(inventory,recipe.output,1);
  let next:VoxelWorldState={...state,inventory};
  next=withEvent(next,'smelt','Fundiu '+item+' → '+recipe.output+'.');
  return{state:next,ok:true,message:'Fundição concluída.'};
}

export function attackVoxelMob(state:VoxelWorldState,mob:VoxelMob){
  const damage=state.inventory.iron_sword?8:state.inventory.stone_sword?6:state.inventory.wood_sword?4:2;
  const defeated=damage>=mob.health||state.player.mode==='creative';
  let next={...state};
  if(defeated){
    let inventory={...next.inventory};
    if(mob.kind==='zombie')inventory=addItem(inventory,'rotten_flesh',1);
    if(mob.kind==='skeleton')inventory=addItem(inventory,'bone',2);
    if(mob.kind==='spider')inventory=addItem(inventory,'string',1);
    if(['cow','pig','sheep'].includes(mob.kind))inventory=addItem(inventory,'food',1);
    if(mob.kind==='dungeon_guard'||mob.kind==='boss')inventory=addItem(inventory,'emerald',2+Math.floor(hash2(state.seed,state.tick,mob.id.length,520)*5));
    next={...next,inventory,stats:{...next.stats,mobsDefeated:next.stats.mobsDefeated+1},player:{...next.player,experience:next.player.experience+5}};
    next=withEvent(next,'combat','Derrotou '+mob.label+'.');
    return{state:next,ok:true,message:'Derrotou '+mob.label+'.'};
  }
  next={...next,player:{...next.player,health:clamp(next.player.health-(mob.hostile?3:1),0,20)}};
  next=withEvent(next,'combat','Atacou '+mob.label+'; o combate continua.');
  return{state:next,ok:true,message:'Causou '+damage+' de dano.'};
}

export function raidVoxelDungeon(state:VoxelWorldState,structure:VoxelStructure){
  if(structure.kind!=='dungeon')return{state,ok:false,message:'Essa estrutura não é uma masmorra.'};
  if(!state.discoveries[structure.id])return{state,ok:false,message:'Explore a estrutura antes de entrar.'};
  const clearedKey=structure.id+':cleared';
  if(state.discoveries[clearedKey])return{state,ok:false,message:'Masmorra já concluída.'};
  let inventory={...state.inventory};
  const roll=hash2(state.seed,structure.x,structure.z,700);
  inventory=addItem(inventory,'emerald',2+Math.floor(roll*6));
  inventory=addItem(inventory,roll>.76?'diamond':roll>.42?'gold_ingot':'iron_ingot',1+Math.floor(roll*2));
  if(roll>.84)inventory=addItem(inventory,'artifact',1);
  const discoveries={...state.discoveries,[clearedKey]:true};
  let next:VoxelWorldState={
    ...state,inventory,discoveries,
    player:{...state.player,experience:state.player.experience+18},
    stats:{...state.stats,dungeonsCleared:state.stats.dungeonsCleared+1}
  };
  next=withEvent(next,'dungeon','Concluiu '+structure.label+' e abriu o baú de recompensa.');
  return{state:next,ok:true,message:'Masmorra concluída; saque adicionado ao inventário.'};
}

export function setVoxelMode(state:VoxelWorldState,mode:'survival'|'creative'){
  return withEvent({...state,player:{...state.player,mode}},'mode','Modo '+mode+' ativado.');
}

export function travelVoxelDimension(state:VoxelWorldState,dimension:VoxelDimension){
  const y=terrainHeight(state.seed,0,0,dimension)+2;
  return withEvent({...state,player:{...state.player,dimension,x:0,y,z:0}},'dimension','Entrou na dimensão '+dimension+'.');
}

export function tickVoxelWorld(state:VoxelWorldState,steps=1){
  let next={...state};
  for(let i=0;i<Math.max(1,Math.floor(steps));i++){
    const time=(next.timeOfDay+90)%24000;
    const wrapped=time<next.timeOfDay;
    const day=next.day+(wrapped?1:0);
    const hunger=next.player.mode==='creative'?20:clamp(next.player.hunger-(next.tick%22===0?.25:0),0,20);
    let health=next.player.health;
    if(hunger<=0&&next.tick%8===0)health=clamp(health-1,0,20);
    if(hunger>17&&health<20&&next.tick%12===0)health=clamp(health+1,0,20);
    const weatherRoll=hash2(next.seed,day,Math.floor(time/1000),850);
    const weather:VoxelWeather=weatherRoll>.985?'storm':weatherRoll>.94?'rain':weatherRoll<.75?'clear':next.weather;
    next={...next,tick:next.tick+1,timeOfDay:time,day,weather,player:{...next.player,hunger,health}};
  }
  return next;
}

export function selectVoxelBlock(state:VoxelWorldState,item:string){
  return{...state,player:{...state.player,selected:item}};
}

export function currentVoxelContext(state:VoxelWorldState){
  const cx=floorDiv(state.player.x,VOXEL_CHUNK_SIZE),cz=floorDiv(state.player.z,VOXEL_CHUNK_SIZE);
  const snapshot=chunkSnapshot(state,cx,cz);
  return{cx,cz,snapshot};
}

export function voxelWorldSummary(state:VoxelWorldState){
  const {cx,cz,snapshot}=currentVoxelContext(state);
  const daylight=state.timeOfDay<12000?'dia':'noite';
  return[
    'Seed '+state.seed+' · dia '+state.day+' · '+daylight+' · '+state.weather,
    'Dimensão '+state.player.dimension+' · chunk '+cx+','+cz+' · bioma '+snapshot.biome,
    'Posição '+state.player.x+','+state.player.y+','+state.player.z,
    'Vida '+state.player.health+'/20 · fome '+Math.round(state.player.hunger*10)/10+'/20 · nível '+state.player.level,
    'Inventário '+Object.entries(state.inventory).filter(([,n])=>n>0).slice(0,14).map(([k,n])=>k+'×'+n).join(', '),
    'Estruturas '+(snapshot.structures.map(x=>x.label).join(', ')||'nenhuma neste chunk'),
    'Mobs '+snapshot.mobs.map(x=>x.kind).join(', ')
  ].join('\n');
}

export function voxelUnityScene(state:VoxelWorldState,viewRadius=8):UnitySceneSnapshot{
  const objects=[];
  const r=Math.max(3,Math.min(12,Math.floor(viewRadius)));
  for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
    const x=state.player.x+dx,z=state.player.z+dz;
    const cell=surfaceAt(state,x,z);
    objects.push(createUnityGameObject(
      'block:'+cell.x+':'+cell.y+':'+cell.z,
      VOXEL_BLOCKS[cell.block].label,
      v3(cell.x,cell.y,cell.z),
      [
        unityComponent('MeshRenderer',{block:cell.block,biome:cell.biome}),
        unityComponent('BoxCollider',{solid:VOXEL_BLOCKS[cell.block].solid}),
        unityComponent('VoxelBlock',{light:cell.light})
      ]
    ));
  }
  objects.push(createUnityGameObject(
    'player',
    'Player',
    v3(state.player.x,state.player.y,state.player.z),
    [
      unityComponent('CharacterController',{mode:state.player.mode}),
      unityComponent('Camera',{yaw:state.player.yaw,pitch:state.player.pitch}),
      unityComponent('Inventory',{slots:state.inventory}),
      unityComponent('Survival',{health:state.player.health,hunger:state.player.hunger})
    ]
  ));
  return createUnityScene(
    'predictlm-voxel-world',
    objects,
    state.tick,
    state.timeOfDay,
    {seed:state.seed,day:state.day,weather:state.weather,dimension:state.player.dimension}
  );
}
