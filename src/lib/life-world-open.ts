import type {LifeLocation,LifeSimulationState} from './life-simulation-engine';

export const LIFE_WORLD_WIDTH=960;
export const LIFE_WORLD_HEIGHT=600;

export type WorldObjectKind=
  |'bed'|'sofa'|'tv'|'fridge'|'stove'|'shower'|'computer'|'phone'|'desk'
  |'tree'|'bench'|'fountain'|'bookshelf'|'table'|'coffee'|'shelf'|'treadmill'
  |'clinic_bed'|'plant'|'lamp'|'art'|'trash'|'door';

export interface LifeWorldObject{
  id:string;
  label:string;
  kind:WorldObjectKind;
  location:LifeLocation;
  x:number;
  y:number;
  z:number;
  w:number;
  h:number;
  affordances:string[];
  salience:number;
  flyAttraction:number;
}

export interface VisionItem{
  id:string;
  label:string;
  kind:string;
  distance:number;
  angle:number;
  salience:number;
  x:number;
  y:number;
}

export interface VisionSnapshot{
  actor:'human'|'fly';
  fovDeg:number;
  range:number;
  visible:VisionItem[];
  seesOtherAgent:boolean;
  otherAgentDistance:number|null;
  summary:string;
}

export const WORLD_OBJECTS:LifeWorldObject[]=[
  {id:'home-bed',label:'Cama',kind:'bed',location:'Casa',x:118,y:454,z:8,w:44,h:28,affordances:['rest','sleep'],salience:.56,flyAttraction:.08},
  {id:'home-sofa',label:'Sofá',kind:'sofa',location:'Casa',x:196,y:438,z:10,w:38,h:24,affordances:['rest','watch','talk'],salience:.48,flyAttraction:.1},
  {id:'home-tv',label:'TV',kind:'tv',location:'Casa',x:236,y:402,z:18,w:24,h:9,affordances:['watch','fun'],salience:.52,flyAttraction:.16},
  {id:'home-fridge',label:'Geladeira',kind:'fridge',location:'Casa',x:88,y:390,z:24,w:18,h:16,affordances:['eat','food'],salience:.64,flyAttraction:.74},
  {id:'home-stove',label:'Fogão',kind:'stove',location:'Casa',x:128,y:388,z:19,w:22,h:14,affordances:['cook','food'],salience:.58,flyAttraction:.58},
  {id:'home-shower',label:'Chuveiro',kind:'shower',location:'Casa',x:60,y:462,z:20,w:18,h:18,affordances:['shower','health'],salience:.45,flyAttraction:.05},
  {id:'home-pc',label:'Computador',kind:'computer',location:'Casa',x:232,y:468,z:16,w:22,h:16,affordances:['study','work','create'],salience:.78,flyAttraction:.14},
  {id:'home-phone',label:'Celular',kind:'phone',location:'Casa',x:190,y:470,z:12,w:8,h:6,affordances:['message','talk','research'],salience:.75,flyAttraction:.18},
  {id:'home-plant',label:'Planta',kind:'plant',location:'Casa',x:278,y:414,z:22,w:15,h:15,affordances:['observe'],salience:.28,flyAttraction:.45},

  {id:'work-pc1',label:'PC do trabalho',kind:'computer',location:'Trabalho',x:780,y:112,z:16,w:24,h:16,affordances:['work','research'],salience:.82,flyAttraction:.12},
  {id:'work-pc2',label:'Notebook',kind:'computer',location:'Trabalho',x:848,y:156,z:14,w:20,h:14,affordances:['work','create'],salience:.7,flyAttraction:.1},
  {id:'work-phone',label:'Celular',kind:'phone',location:'Trabalho',x:822,y:102,z:9,w:7,h:5,affordances:['message','talk'],salience:.62,flyAttraction:.15},
  {id:'work-coffee',label:'Cafeteira',kind:'coffee',location:'Trabalho',x:720,y:172,z:20,w:18,h:14,affordances:['drink','pause'],salience:.46,flyAttraction:.67},
  {id:'work-plant',label:'Planta grande',kind:'plant',location:'Trabalho',x:900,y:98,z:30,w:20,h:20,affordances:['observe'],salience:.24,flyAttraction:.38},

  {id:'cafe-table1',label:'Mesa do café',kind:'table',location:'Café',x:476,y:308,z:9,w:24,h:24,affordances:['eat','talk'],salience:.5,flyAttraction:.7},
  {id:'cafe-table2',label:'Mesa da janela',kind:'table',location:'Café',x:548,y:340,z:9,w:24,h:24,affordances:['eat','talk','observe'],salience:.55,flyAttraction:.72},
  {id:'cafe-coffee',label:'Balcão',kind:'coffee',location:'Café',x:506,y:270,z:18,w:36,h:14,affordances:['eat','drink','talk'],salience:.66,flyAttraction:.82},

  {id:'park-tree1',label:'Árvore antiga',kind:'tree',location:'Parque',x:116,y:106,z:52,w:24,h:24,affordances:['observe','shade'],salience:.5,flyAttraction:.88},
  {id:'park-tree2',label:'Árvore',kind:'tree',location:'Parque',x:214,y:138,z:46,w:22,h:22,affordances:['observe','shade'],salience:.44,flyAttraction:.82},
  {id:'park-tree3',label:'Árvore',kind:'tree',location:'Parque',x:92,y:190,z:42,w:20,h:20,affordances:['observe','shade'],salience:.4,flyAttraction:.8},
  {id:'park-bench',label:'Banco',kind:'bench',location:'Parque',x:170,y:170,z:6,w:32,h:10,affordances:['rest','talk','observe'],salience:.46,flyAttraction:.22},
  {id:'park-fountain',label:'Fonte',kind:'fountain',location:'Parque',x:248,y:84,z:14,w:28,h:28,affordances:['observe','relax'],salience:.7,flyAttraction:.5},

  {id:'market-shelf1',label:'Prateleira de comida',kind:'shelf',location:'Mercado',x:790,y:438,z:18,w:50,h:10,affordances:['buy','food'],salience:.76,flyAttraction:.76},
  {id:'market-shelf2',label:'Prateleira',kind:'shelf',location:'Mercado',x:850,y:474,z:18,w:50,h:10,affordances:['buy'],salience:.55,flyAttraction:.42},
  {id:'market-phone',label:'Terminal',kind:'phone',location:'Mercado',x:900,y:418,z:12,w:10,h:8,affordances:['pay'],salience:.4,flyAttraction:.12},

  {id:'clinic-bed',label:'Maca',kind:'clinic_bed',location:'Clínica',x:462,y:102,z:11,w:38,h:18,affordances:['health','rest'],salience:.66,flyAttraction:.04},
  {id:'clinic-pc',label:'Computador clínico',kind:'computer',location:'Clínica',x:554,y:122,z:16,w:22,h:14,affordances:['research'],salience:.5,flyAttraction:.08},
  {id:'clinic-plant',label:'Planta',kind:'plant',location:'Clínica',x:422,y:168,z:20,w:14,h:14,affordances:['observe'],salience:.22,flyAttraction:.34},

  {id:'library-books1',label:'Estante de livros',kind:'bookshelf',location:'Biblioteca',x:408,y:500,z:30,w:12,h:52,affordances:['study','read'],salience:.72,flyAttraction:.08},
  {id:'library-books2',label:'Estante',kind:'bookshelf',location:'Biblioteca',x:520,y:524,z:30,w:12,h:52,affordances:['study','read'],salience:.66,flyAttraction:.08},
  {id:'library-pc',label:'Computador público',kind:'computer',location:'Biblioteca',x:470,y:548,z:16,w:22,h:14,affordances:['study','research','create'],salience:.76,flyAttraction:.1},
  {id:'library-phone',label:'Celular carregando',kind:'phone',location:'Biblioteca',x:500,y:558,z:8,w:7,h:5,affordances:['message'],salience:.5,flyAttraction:.14},

  {id:'world-tree1',label:'Árvore da rua',kind:'tree',location:'Parque',x:348,y:232,z:45,w:20,h:20,affordances:['observe'],salience:.32,flyAttraction:.84},
  {id:'world-tree2',label:'Árvore da rua',kind:'tree',location:'Parque',x:628,y:356,z:48,w:22,h:22,affordances:['observe'],salience:.34,flyAttraction:.86},
  {id:'world-bench',label:'Banco da praça',kind:'bench',location:'Parque',x:606,y:296,z:6,w:30,h:10,affordances:['rest','observe','talk'],salience:.4,flyAttraction:.18},
  {id:'world-lamp',label:'Poste de luz',kind:'lamp',location:'Parque',x:676,y:246,z:52,w:8,h:8,affordances:['observe'],salience:.58,flyAttraction:.92}
];

const normAngle=(a:number)=>{
  let x=a;
  while(x>Math.PI)x-=Math.PI*2;
  while(x<-Math.PI)x+=Math.PI*2;
  return x;
};

function visibleObjects(
  x:number,y:number,heading:number,range:number,fovDeg:number,
  attraction:(obj:LifeWorldObject)=>number=()=>1
){
  const half=(fovDeg*Math.PI/180)/2;
  return WORLD_OBJECTS.map(obj=>{
    const dx=obj.x-x,dy=obj.y-y;
    const distance=Math.hypot(dx,dy);
    const angle=normAngle(Math.atan2(dy,dx)-heading);
    const close=distance<38;
    const visible=distance<=range&&(close||Math.abs(angle)<=half);
    if(!visible)return null;
    return {
      id:obj.id,label:obj.label,kind:obj.kind,distance,angle,
      salience:obj.salience*attraction(obj),x:obj.x,y:obj.y
    } satisfies VisionItem;
  }).filter(Boolean) as VisionItem[];
}

export function perceiveHumanWorld(
  state:LifeSimulationState,
  fly?:{x:number;y:number}
):VisionSnapshot{
  const heading=Number.isFinite(state.person.heading)?state.person.heading:0;
  const visible=visibleObjects(state.person.x,state.person.y,heading,190,125)
    .sort((a,b)=>(b.salience/(1+b.distance/80))-(a.salience/(1+a.distance/80)))
    .slice(0,12);
  const otherDistance=fly?Math.hypot(fly.x-state.person.x,fly.y-state.person.y):null;
  const seesOther=otherDistance!=null&&otherDistance<115;
  return {
    actor:'human',fovDeg:125,range:190,visible,
    seesOtherAgent:seesOther,otherAgentDistance:otherDistance,
    summary:'Humano enxerga '+(visible.map(x=>x.label).join(', ')||'apenas o ambiente próximo')+(seesOther?' e a Mosca Predict':'')+'.'
  };
}

export function perceiveFlyWorld(
  fly:{x:number;y:number;vx:number;vy:number},
  state:LifeSimulationState
):VisionSnapshot{
  const heading=Math.atan2(fly.vy,fly.vx||.001);
  const visible=visibleObjects(fly.x,fly.y,heading,165,320,obj=>.45+obj.flyAttraction)
    .sort((a,b)=>(b.salience/(1+b.distance/70))-(a.salience/(1+a.distance/70)))
    .slice(0,16);
  const otherDistance=Math.hypot(state.person.x-fly.x,state.person.y-fly.y);
  return {
    actor:'fly',fovDeg:320,range:165,visible,
    seesOtherAgent:otherDistance<150,otherAgentDistance:otherDistance,
    summary:'Mosca percebe '+(visible.map(x=>x.label).join(', ')||'movimento e contraste do ambiente')+(otherDistance<150?' e o humano':'')+'.'
  };
}

export function worldObject(id:string){
  return WORLD_OBJECTS.find(x=>x.id===id)||null;
}

export function objectsAt(location:LifeLocation){
  return WORLD_OBJECTS.filter(x=>x.location===location);
}

export function objectUtility(
  obj:LifeWorldObject,
  state:LifeSimulationState,
  tick:number
){
  const n=state.needs;
  let score=obj.salience*12;
  if(obj.affordances.includes('rest'))score+=(100-n.energy)*.55+n.stress*.16;
  if(obj.affordances.includes('food')||obj.affordances.includes('eat')||obj.affordances.includes('cook'))score+=(100-n.hunger)*.62;
  if(obj.affordances.includes('talk')||obj.affordances.includes('message'))score+=(100-n.social)*.42;
  if(obj.affordances.includes('study')||obj.affordances.includes('research'))score+=(100-n.focus)*.22+state.neuro.curiosity*26;
  if(obj.affordances.includes('work'))score+=(state.person.money<400?28:8)+n.focus*.18;
  if(obj.affordances.includes('health'))score+=(100-n.health)*.62;
  if(obj.affordances.includes('observe')||obj.affordances.includes('relax'))score+=(100-n.fun)*.22+n.stress*.25;
  if(obj.affordances.includes('create'))score+=state.neuro.curiosity*20;
  let h=(state.seed^(tick*2654435761))>>>0;
  for(let i=0;i<obj.id.length;i++){
    h^=obj.id.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  h^=h<<13;h^=h>>>17;h^=h<<5;
  const jitter=((h>>>0)/4294967295)*11;
  return score+jitter;
}
