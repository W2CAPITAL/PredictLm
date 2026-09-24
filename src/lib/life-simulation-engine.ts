import { advanceNeuroState, createNeuroState, type NeuroState } from './neurocore';

export type LifeLocation='Casa'|'Trabalho'|'Café'|'Parque'|'Mercado'|'Clínica'|'Biblioteca';

export interface LifeNeedState{
  energy:number;
  hunger:number;
  social:number;
  fun:number;
  focus:number;
  stress:number;
  health:number;
}

export interface LifeRelation{
  id:string;
  name:string;
  affinity:number;
  trust:number;
  lastContact:number;
}

export interface LifeMemory{
  id:string;
  tick:number;
  day:number;
  minute:number;
  summary:string;
  valence:number;
  salience:number;
  kind:'routine'|'social'|'goal'|'event'|'warning';
}

export interface LifePerson{
  id:string;
  name:string;
  age:number;
  gender:'female';
  x:number;
  y:number;
  location:LifeLocation;
  money:number;
  occupation:string;
  currentAction:string;
  goal:string;
  mood:string;
}

export interface LifeWorldPlace{
  id:LifeLocation;
  x:number;
  y:number;
  w:number;
  h:number;
  label:string;
  purpose:string;
}

export interface LifeSimulationState{
  version:1;
  seed:number;
  tick:number;
  day:number;
  minute:number;
  running:boolean;
  speed:1|2|4|8;
  person:LifePerson;
  needs:LifeNeedState;
  relationships:LifeRelation[];
  memories:LifeMemory[];
  neuro:NeuroState;
  places:LifeWorldPlace[];
  lastEvent:string;
}

const places:LifeWorldPlace[]=[
  {id:'Casa',x:50,y:210,w:120,h:90,label:'Casa',purpose:'descanso, alimentação e memória'},
  {id:'Trabalho',x:465,y:48,w:135,h:95,label:'Trabalho',purpose:'foco, renda e metas'},
  {id:'Café',x:270,y:180,w:105,h:70,label:'Café',purpose:'socialização e pausa'},
  {id:'Parque',x:55,y:48,w:145,h:100,label:'Parque',purpose:'lazer, saúde e redução de estresse'},
  {id:'Mercado',x:465,y:215,w:120,h:80,label:'Mercado',purpose:'compras e necessidades práticas'},
  {id:'Clínica',x:255,y:45,w:110,h:80,label:'Clínica',purpose:'saúde e recuperação'},
  {id:'Biblioteca',x:230,y:285,w:155,h:62,label:'Biblioteca',purpose:'aprendizado, foco e curiosidade'}
];

function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,v))}
function n(v:number){return Math.round(clamp(v))}
function norm(input:string){return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').trim()}
function hash(seed:number,tick:number){
  let x=(seed^(tick*2654435761))>>>0;
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)/4294967295;
}
function place(id:LifeLocation){return places.find(x=>x.id===id)||places[0]}

export function createLifeSimulation(name='Lia',seed=173){
  const home=place('Casa');
  const state:LifeSimulationState={
    version:1,
    seed,
    tick:0,
    day:1,
    minute:7*60+30,
    running:false,
    speed:1,
    person:{
      id:'lia',
      name:name||'Lia',
      age:27,
      gender:'female',
      x:home.x+home.w/2,
      y:home.y+home.h/2,
      location:'Casa',
      money:850,
      occupation:'Analista de projetos',
      currentAction:'Acordando e organizando o dia',
      goal:'Manter uma vida equilibrada e avançar em um projeto pessoal',
      mood:'neutra'
    },
    needs:{energy:78,hunger:72,social:64,fun:60,focus:74,stress:22,health:86},
    relationships:[
      {id:'mara',name:'Mara',affinity:72,trust:76,lastContact:0},
      {id:'nina',name:'Nina',affinity:61,trust:64,lastContact:0}
    ],
    memories:[{
      id:'m0',tick:0,day:1,minute:7*60+30,summary:'Começou uma nova simulação com um objetivo pessoal definido.',valence:.7,salience:.72,kind:'goal'
    }],
    neuro:createNeuroState(),
    places:[...places],
    lastEvent:'Novo dia iniciado.'
  };
  return state;
}

function formatTime(minute:number){
  const normalized=((minute%(24*60))+(24*60))%(24*60);
  const h=Math.floor(normalized/60),m=normalized%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

function chooseDestination(state:LifeSimulationState):LifeLocation{
  const {needs,person,minute}=state;
  const hour=minute/60;
  const options:Array<{id:LifeLocation;score:number}>=[
    {id:'Casa',score:(100-needs.energy)*1.15+(100-needs.hunger)*.95+(hour>=22||hour<6?42:0)},
    {id:'Trabalho',score:(hour>=8&&hour<=17?42:4)+needs.focus*.36+(person.money<450?20:0)},
    {id:'Café',score:(100-needs.social)*.72+(100-needs.fun)*.32+(hour>=11&&hour<=20?10:0)},
    {id:'Parque',score:(100-needs.fun)*.5+needs.stress*.72+(100-needs.health)*.3},
    {id:'Mercado',score:(100-needs.hunger)*.58+(person.money>30?8:-30)},
    {id:'Clínica',score:(100-needs.health)*1.8+needs.stress*.35},
    {id:'Biblioteca',score:(100-needs.focus)*.16+state.neuro.curiosity*42+(person.goal?15:0)}
  ];
  options.sort((a,b)=>b.score-a.score);
  return options[0]?.id||'Casa';
}

function destinationAction(location:LifeLocation){
  if(location==='Casa')return 'Cuidando de si e recuperando energia';
  if(location==='Trabalho')return 'Trabalhando com foco em uma tarefa importante';
  if(location==='Café')return 'Conversando e observando o ambiente';
  if(location==='Parque')return 'Caminhando e reduzindo a tensão';
  if(location==='Mercado')return 'Resolvendo compras e necessidades práticas';
  if(location==='Clínica')return 'Cuidando da saúde';
  return 'Estudando e organizando novas ideias';
}

function moveToward(state:LifeSimulationState,target:LifeWorldPlace){
  const cx=target.x+target.w/2,cy=target.y+target.h/2;
  const dx=cx-state.person.x,dy=cy-state.person.y;
  const dist=Math.max(1,Math.hypot(dx,dy));
  const step=Math.min(22,dist);
  const x=state.person.x+(dx/dist)*step;
  const y=state.person.y+(dy/dist)*step;
  const reached=dist<=24;
  return {x,y,reached};
}

function updateNeeds(state:LifeSimulationState,location:LifeLocation,reached:boolean){
  const v={...state.needs};
  v.energy-=1.1;
  v.hunger-=1.15;
  v.social-=.45;
  v.fun-=.38;
  v.focus-=.36;
  v.stress+=.32;
  v.health-=.08;

  if(reached){
    if(location==='Casa'){v.energy+=4.8;v.hunger+=3.7;v.stress-=2.8;v.health+=.4}
    if(location==='Trabalho'){v.focus+=2.1;v.stress+=1.25}
    if(location==='Café'){v.social+=4.6;v.fun+=2.1;v.stress-=1.3;v.hunger+=1.4}
    if(location==='Parque'){v.fun+=3.6;v.stress-=3.9;v.health+=1.8;v.energy-=.2}
    if(location==='Mercado'){v.hunger+=2.7;v.stress-=.6}
    if(location==='Clínica'){v.health+=5.4;v.stress-=1.6}
    if(location==='Biblioteca'){v.focus+=3.3;v.fun+=.9;v.stress-=.7}
  }
  return {
    energy:n(v.energy),hunger:n(v.hunger),social:n(v.social),fun:n(v.fun),
    focus:n(v.focus),stress:n(v.stress),health:n(v.health)
  };
}

function maybeEvent(state:LifeSimulationState){
  const roll=hash(state.seed,state.tick);
  if(roll>.965)return {summary:'Recebeu uma mensagem inesperada de uma amiga.',kind:'social' as const,valence:.68,salience:.55};
  if(roll<.018)return {summary:'Surgiu uma despesa imprevista que exige reorganizar o orçamento.',kind:'event' as const,valence:.28,salience:.72};
  if(roll>.91&&roll<.925)return {summary:'Teve uma ideia útil para o projeto pessoal e decidiu registrar.',kind:'goal' as const,valence:.82,salience:.78};
  if(state.needs.health<35)return {summary:'O corpo deu sinais claros de cansaço; a saúde virou prioridade.',kind:'warning' as const,valence:.18,salience:.92};
  return null;
}

function mood(state:LifeSimulationState){
  const n=state.needs;
  const avg=(n.energy+n.hunger+n.social+n.fun+n.focus+n.health+(100-n.stress))/7;
  if(n.stress>72)return 'sobrecarregada';
  if(avg>78)return 'bem-disposta';
  if(avg>62)return 'estável';
  if(avg>46)return 'cansada';
  return 'fragilizada';
}

function addMemory(state:LifeSimulationState,summary:string,kind:LifeMemory['kind'],valence:number,salience:number){
  const memory:LifeMemory={id:'m'+state.tick+'-'+Math.floor(hash(state.seed,state.tick+9)*9999),tick:state.tick,day:state.day,minute:state.minute,summary,valence,salience,kind};
  return [memory,...state.memories].sort((a,b)=>b.salience-a.salience||b.tick-a.tick).slice(0,24);
}

export function applySimulationInstruction(state:LifeSimulationState,instruction:string){
  const q=norm(instruction);
  let next={...state,person:{...state.person},memories:[...state.memories]};
  const name=instruction.match(/(?:nome|chama(?:da)?|personagem)\s*(?:é|e|:)?\s*([A-Za-zÀ-ÿ]{2,24})/i)?.[1];
  if(name)next.person.name=name;
  const goal=instruction.match(/(?:objetivo|meta)\s*(?:é|e|:)?\s*(.+)$/i)?.[1]?.trim();
  if(goal)next.person.goal=goal.slice(0,180);

  const dest:LifeLocation|null=
    /trabalh/.test(q)?'Trabalho':
    /parque|caminh/.test(q)?'Parque':
    /cafe|café|social|amig/.test(q)?'Café':
    /mercado|compr/.test(q)?'Mercado':
    /clinic|saude|saúde|medic/.test(q)?'Clínica':
    /biblioteca|estud|aprend/.test(q)?'Biblioteca':
    /casa|descans|dorm/.test(q)?'Casa':null;

  if(dest){
    next.person.currentAction='Decidiu ir para '+dest+' por instrução externa';
    next.lastEvent='Instrução recebida: '+instruction.slice(0,120);
  }
  if(goal||name){
    next.memories=addMemory(next,'Instrução recebida: '+instruction.slice(0,160),'goal',.62,.78);
  }
  return {state:next,forcedDestination:dest};
}

export function stepLifeSimulation(input:LifeSimulationState,minutes=10,forcedDestination?:LifeLocation|null){
  const state:LifeSimulationState={
    ...input,
    tick:input.tick+1,
    minute:input.minute+minutes,
    person:{...input.person},
    needs:{...input.needs},
    relationships:input.relationships.map(x=>({...x})),
    memories:[...input.memories],
    places:[...input.places],
    neuro:{...input.neuro,circuits:{...input.neuro.circuits}}
  };

  if(state.minute>=24*60){state.minute-=24*60;state.day+=1}
  const destination=forcedDestination||chooseDestination(state);
  const target=place(destination);
  const moved=moveToward(state,target);
  state.person.x=moved.x;state.person.y=moved.y;
  if(moved.reached)state.person.location=destination;
  state.person.currentAction=moved.reached?destinationAction(destination):'Indo para '+destination;
  state.needs=updateNeeds(state,destination,moved.reached);

  if(moved.reached&&destination==='Trabalho'){
    state.person.money+=7;
  }
  if(moved.reached&&destination==='Mercado'&&state.person.money>=8){
    state.person.money-=8;
    state.needs.hunger=n(state.needs.hunger+5);
  }
  if(moved.reached&&destination==='Café'&&state.person.money>=5){
    state.person.money-=5;
    const rel=state.relationships[0];
    rel.affinity=n(rel.affinity+1.2);
    rel.trust=n(rel.trust+.5);
    rel.lastContact=state.tick;
  }

  const evt=maybeEvent(state);
  if(evt){
    state.lastEvent=evt.summary;
    state.memories=addMemory(state,evt.summary,evt.kind,evt.valence,evt.salience);
    if(evt.summary.includes('despesa'))state.person.money=Math.max(0,state.person.money-45);
    if(evt.kind==='social')state.needs.social=n(state.needs.social+8);
  }else{
    state.lastEvent=state.person.currentAction+' · '+formatTime(state.minute);
    if(state.tick%8===0){
      state.memories=addMemory(state,state.person.currentAction,'routine',.54,.34);
    }
  }

  state.person.mood=mood(state);
  state.neuro=advanceNeuroState(state.neuro,[
    'simulação de vida',
    state.person.currentAction,
    state.lastEvent,
    'objetivo '+state.person.goal,
    'estresse '+state.needs.stress,
    'energia '+state.needs.energy,
    'social '+state.needs.social
  ].join(' · '));

  return state;
}

export function simulationClock(state:LifeSimulationState){
  return 'Dia '+state.day+' · '+formatTime(state.minute);
}

export function simulationSummary(state:LifeSimulationState){
  return [
    state.person.name+' · '+simulationClock(state),
    'Local: '+state.person.location,
    'Ação: '+state.person.currentAction,
    'Humor: '+state.person.mood,
    'Objetivo: '+state.person.goal,
    'Energia '+state.needs.energy+' · Fome '+state.needs.hunger+' · Social '+state.needs.social+' · Diversão '+state.needs.fun+' · Foco '+state.needs.focus+' · Estresse '+state.needs.stress+' · Saúde '+state.needs.health,
    'Dinheiro: R$ '+state.person.money.toFixed(0),
    'Evento: '+state.lastEvent
  ].join('\n');
}
