import { advanceNeuroState, createNeuroState, type NeuroState } from './neurocore';
import { ENTITY_SELF_MODEL } from './entity-self-model';

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
  heading:number;
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

export interface LifeAutonomyState{
  destination:LifeLocation;
  commitmentTicks:number;
  decisionReason:string;
  recentLocations:LifeLocation[];
  reconsiderations:number;
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
  autonomy?:LifeAutonomyState;
}

const places:LifeWorldPlace[]=[
  {id:'Casa',x:42,y:360,w:260,h:170,label:'Casa',purpose:'descanso, alimentação, computador, celular e memória'},
  {id:'Trabalho',x:700,y:58,w:220,h:160,label:'Trabalho',purpose:'foco, renda, computadores e metas'},
  {id:'Café',x:410,y:245,w:180,h:125,label:'Café',purpose:'socialização, comida, conversa e pausa'},
  {id:'Parque',x:38,y:42,w:285,h:205,label:'Parque',purpose:'árvores, bancos, exploração e redução de estresse'},
  {id:'Mercado',x:735,y:365,w:205,h:150,label:'Mercado',purpose:'compras, prateleiras e necessidades práticas'},
  {id:'Clínica',x:385,y:45,w:205,h:145,label:'Clínica',purpose:'saúde, observação e recuperação'},
  {id:'Biblioteca',x:365,y:455,w:255,h:120,label:'Biblioteca',purpose:'livros, computador, aprendizado e criação'}
];

function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,v))}
function n(v:number){return Math.round(clamp(v))}
function norm(input:string){return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').trim()}
function hash(seed:number,tick:number){
  let x=(seed^(tick*2654435761))>>>0;
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)/4294967295;
}
function hashSalt(seed:number,tick:number,salt:string){
  let x=(seed^(tick*2654435761))>>>0;
  for(let i=0;i<salt.length;i++){
    x^=salt.charCodeAt(i);
    x=Math.imul(x,16777619);
  }
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)/4294967295;
}
function gumbel(seed:number,tick:number,salt:string){
  const u=Math.max(1e-6,Math.min(.999999,hashSalt(seed,tick,salt)));
  return -Math.log(-Math.log(u));
}
function place(id:LifeLocation){return places.find(x=>x.id===id)||places[0]}

export function createLifeSimulation(name=ENTITY_SELF_MODEL.displayName,seed=173){
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
      heading:-Math.PI/4,
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
    lastEvent:'Novo dia iniciado.',
    autonomy:{
      destination:'Casa',
      commitmentTicks:0,
      decisionReason:'observando o começo do dia antes de escolher uma atividade',
      recentLocations:['Casa'],
      reconsiderations:0
    }
  };
  return state;
}

function formatTime(minute:number){
  const normalized=((minute%(24*60))+(24*60))%(24*60);
  const h=Math.floor(normalized/60),m=normalized%60;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
}

function chooseDestination(state:LifeSimulationState){
  const {needs,person,minute}=state;
  const hour=minute/60;
  const prior=state.autonomy||{
    destination:person.location,
    commitmentTicks:0,
    decisionReason:'estado legado sem decisão registrada',
    recentLocations:[person.location],
    reconsiderations:0
  };
  const urgentHealth=needs.health<38;
  const urgentEnergy=needs.energy<24;
  const urgentHunger=needs.hunger<22;
  const interrupted=urgentHealth||urgentEnergy||urgentHunger;

  if(prior.commitmentTicks>0&&!interrupted){
    return {
      destination:prior.destination,
      reason:'mantendo a intenção anterior por mais '+prior.commitmentTicks+' ciclo(s), em vez de trocar de tarefa a cada tick',
      commitmentTicks:prior.commitmentTicks-1,
      reconsidered:false
    };
  }

  const options:Array<{id:LifeLocation;score:number;reason:string}>=[
    {id:'Casa',score:(100-needs.energy)*1.02+(100-needs.hunger)*.72+(hour>=22||hour<6?38:0),reason:'descanso, alimentação e recuperação'},
    {id:'Trabalho',score:(hour>=8&&hour<=17?34:3)+needs.focus*.30+(person.money<450?22:0),reason:'foco, renda e continuidade de projeto'},
    {id:'Café',score:(100-needs.social)*.62+(100-needs.fun)*.24+(hour>=11&&hour<=20?8:0),reason:'contato social, pausa e observação'},
    {id:'Parque',score:(100-needs.fun)*.42+needs.stress*.58+(100-needs.health)*.20,reason:'novidade, movimento e redução de estresse'},
    {id:'Mercado',score:(100-needs.hunger)*.52+(person.money>30?6:-28),reason:'resolver alimentação e recursos práticos'},
    {id:'Clínica',score:(100-needs.health)*1.62+needs.stress*.25,reason:'recuperar saúde quando o estado corporal exige'},
    {id:'Biblioteca',score:(100-needs.focus)*.10+state.neuro.curiosity*36+(person.goal?12:0),reason:'aprender, criar e avançar o objetivo'}
  ];

  const recent=prior.recentLocations||[];
  const curiosity=Math.max(0,Math.min(1,state.neuro.curiosity||0));
  for(const option of options){
    const repeats=recent.filter(x=>x===option.id).length;
    option.score-=repeats*8.5;
    if(repeats===0)option.score+=curiosity*8;
    if(option.id===person.location)option.score+=9;
    if(option.id===prior.destination)option.score+=6;
    if(urgentHealth&&option.id==='Clínica')option.score+=80;
    if(urgentEnergy&&option.id==='Casa')option.score+=62;
    if(urgentHunger&&(option.id==='Casa'||option.id==='Mercado'))option.score+=42;
  }

  const temperature=6+curiosity*7;
  const ranked=options
    .map(option=>({...option,choiceScore:option.score+gumbel(state.seed,state.tick,'dest:'+option.id)*temperature}))
    .sort((a,b)=>b.choiceScore-a.choiceScore);
  const chosen=ranked[0]||{id:'Casa' as LifeLocation,score:0,choiceScore:0,reason:'recuperação básica'};
  const commitmentTicks=chosen.id===person.location
    ? 1+Math.floor(hashSalt(state.seed,state.tick,'stay:'+chosen.id)*3)
    : 2+Math.floor(hashSalt(state.seed,state.tick,'commit:'+chosen.id)*5);
  const reason=(interrupted?'interrompeu o plano anterior; ':'')+chosen.reason+
    (recent.includes(chosen.id)?'; aceitou repetir o local porque a utilidade atual compensou a repetição':'; favoreceu uma opção menos repetida');

  return {destination:chosen.id,reason,commitmentTicks,reconsidered:true};
}

const ACTIONS:Record<LifeLocation,string[]>={
  Casa:[
    'Preparando algo para comer e reorganizando a cozinha',
    'Descansando sem iniciar uma nova tarefa imediatamente',
    'Usando o computador no projeto pessoal',
    'Arrumando a casa e pensando no próximo passo',
    'Lendo mensagens e escolhendo quais merecem resposta'
  ],
  Trabalho:[
    'Trabalhando com foco em uma tarefa importante',
    'Revisando o que já foi feito antes de continuar',
    'Fazendo uma pausa curta para reduzir erro e fadiga',
    'Organizando prioridades e bloqueios do projeto'
  ],
  Café:[
    'Conversando e observando o ambiente',
    'Fazendo uma pausa em silêncio e olhando ao redor',
    'Respondendo uma mensagem enquanto toma algo',
    'Anotando uma ideia que surgiu durante a pausa'
  ],
  Parque:[
    'Caminhando sem rota rígida e prestando atenção ao ambiente',
    'Sentando por alguns minutos para descansar',
    'Observando uma área diferente do parque',
    'Refletindo sobre o objetivo enquanto caminha'
  ],
  Mercado:[
    'Comparando o que realmente precisa comprar',
    'Resolvendo compras de alimentação',
    'Mudando a lista depois de verificar o que está disponível'
  ],
  Clínica:[
    'Cuidando da saúde e aguardando observação',
    'Reavaliando sintomas e nível de cansaço',
    'Descansando enquanto acompanha a recuperação'
  ],
  Biblioteca:[
    'Estudando um assunto ligado ao objetivo atual',
    'Explorando uma estante por curiosidade',
    'Organizando novas ideias no computador',
    'Lendo antes de decidir a próxima atividade'
  ]
};

function destinationAction(location:LifeLocation,state:LifeSimulationState){
  const variants=ACTIONS[location]||['Observando o ambiente antes de agir'];
  const recent=state.person.currentAction;
  const filtered=variants.filter(x=>x!==recent);
  const pool=filtered.length?filtered:variants;
  const idx=Math.floor(hashSalt(state.seed,state.tick,'action:'+location)*pool.length);
  return pool[Math.max(0,Math.min(pool.length-1,idx))];
}

function moveToward(state:LifeSimulationState,target:LifeWorldPlace){
  const cx=target.x+target.w/2,cy=target.y+target.h/2;
  const dx=cx-state.person.x,dy=cy-state.person.y;
  const dist=Math.max(1,Math.hypot(dx,dy));
  const step=Math.min(26,dist);
  const x=state.person.x+(dx/dist)*step;
  const y=state.person.y+(dy/dist)*step;
  const reached=dist<=28;
  const heading=Math.atan2(dy,dx);
  return {x,y,reached,heading};
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
    neuro:{...input.neuro,circuits:{...input.neuro.circuits}},
    autonomy:input.autonomy?{...input.autonomy,recentLocations:[...input.autonomy.recentLocations]}:undefined
  };

  if(state.minute>=24*60){state.minute-=24*60;state.day+=1}
  const autonomous=forcedDestination
    ? {
        destination:forcedDestination,
        reason:'seguindo uma instrução externa explícita até o destino solicitado',
        commitmentTicks:Math.max(2,state.autonomy?.commitmentTicks||0),
        reconsidered:false
      }
    : chooseDestination(state);
  const destination=autonomous.destination;
  const target=place(destination);
  const moved=moveToward(state,target);
  state.person.x=moved.x;state.person.y=moved.y;state.person.heading=moved.heading;
  if(moved.reached)state.person.location=destination;
  state.person.currentAction=moved.reached?destinationAction(destination,state):'Indo para '+destination;
  state.needs=updateNeeds(state,destination,moved.reached);
  const priorAutonomy=state.autonomy||{
    destination:input.person.location,
    commitmentTicks:0,
    decisionReason:'estado legado',
    recentLocations:[input.person.location],
    reconsiderations:0
  };
  state.autonomy={
    destination,
    commitmentTicks:autonomous.commitmentTicks,
    decisionReason:autonomous.reason,
    recentLocations:(moved.reached
      ? [...priorAutonomy.recentLocations.filter((_,i,all)=>i>=Math.max(0,all.length-5)),destination]
      : priorAutonomy.recentLocations
    ).slice(-6),
    reconsiderations:priorAutonomy.reconsiderations+(autonomous.reconsidered?1:0)
  };

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
    'Evento: '+state.lastEvent,
    'Decisão autônoma: '+(state.autonomy?.decisionReason||'não registrada')
  ].join('\n');
}


export interface LifeScenarioResult{
  id:'baseline'|'upside'|'downside'|'adversarial'|'third-path'|'second-order'|'reversal';
  label:string;
  premise:string;
  horizonMinutes:number;
  finalState:LifeSimulationState;
  summary:string;
  signals:string[];
}

function cloneScenarioState(input:LifeSimulationState,seedOffset:number){
  return {
    ...input,
    seed:input.seed+seedOffset,
    running:false,
    person:{...input.person},
    needs:{...input.needs},
    relationships:input.relationships.map(x=>({...x})),
    memories:[...input.memories],
    places:[...input.places],
    neuro:{...input.neuro,circuits:{...input.neuro.circuits}}
  };
}

function runScenarioTrajectory(
  input:LifeSimulationState,
  instruction:string,
  config:{
    id:LifeScenarioResult['id'];
    label:string;
    premise:string;
    seedOffset:number;
    steps:number;
    modifier?:(state:LifeSimulationState)=>void;
    ignoreForcedDestination?:boolean;
  }
):LifeScenarioResult{
  let current=cloneScenarioState(input,config.seedOffset);
  config.modifier?.(current);
  const parsed=applySimulationInstruction(current,instruction);
  current=parsed.state;
  const forced=config.ignoreForcedDestination?null:parsed.forcedDestination;
  for(let i=0;i<config.steps;i++)current=stepLifeSimulation(current,10,forced);
  const signals=[
    'humor '+current.person.mood,
    'estresse '+current.needs.stress,
    'energia '+current.needs.energy,
    'saúde '+current.needs.health,
    'dinheiro R$ '+current.person.money.toFixed(0),
    'local '+current.person.location
  ];
  return {
    id:config.id,
    label:config.label,
    premise:config.premise,
    horizonMinutes:config.steps*10,
    finalState:current,
    summary:current.person.currentAction+' · '+current.lastEvent,
    signals
  };
}

export function simulateLifeScenarios(
  state:LifeSimulationState,
  instruction:string,
  options?:{deep?:boolean}
):LifeScenarioResult[]{
  const deep=options?.deep!==false;
  const scenarios:LifeScenarioResult[]=[
    runScenarioTrajectory(state,instruction,{
      id:'baseline',label:'Baseline',
      premise:'Trajetória mais direta sem vantagem ou choque extra.',
      seedOffset:11,steps:6
    }),
    runScenarioTrajectory(state,instruction,{
      id:'upside',label:'Favorável',
      premise:'A atividade começa com mais energia/foco e menos estresse.',
      seedOffset:101,steps:6,
      modifier:s=>{s.needs.energy=n(s.needs.energy+12);s.needs.focus=n(s.needs.focus+10);s.needs.stress=n(s.needs.stress-14);}
    }),
    runScenarioTrajectory(state,instruction,{
      id:'downside',label:'Adverso',
      premise:'A atividade encontra desgaste, menor energia e pressão financeira.',
      seedOffset:202,steps:6,
      modifier:s=>{s.needs.energy=n(s.needs.energy-16);s.needs.stress=n(s.needs.stress+18);s.person.money=Math.max(0,s.person.money-35);}
    }),
    runScenarioTrajectory(state,instruction,{
      id:'adversarial',label:'Reação externa',
      premise:'O ambiente social/operacional reage pior e aumenta a pressão.',
      seedOffset:303,steps:6,
      modifier:s=>{s.needs.social=n(s.needs.social-14);s.needs.stress=n(s.needs.stress+12);s.relationships=s.relationships.map(r=>({...r,affinity:n(r.affinity-4),trust:n(r.trust-3)}));}
    }),
    runScenarioTrajectory(state,instruction,{
      id:'third-path',label:'Terceira via',
      premise:'A instrução vira objetivo, mas a autonomia pode escolher outro caminho para satisfazê-lo.',
      seedOffset:404,steps:6,ignoreForcedDestination:true
    })
  ];

  if(deep){
    scenarios.push(
      runScenarioTrajectory(state,instruction,{
        id:'second-order',label:'Segunda ordem',
        premise:'Mesmo plano observado por mais tempo para revelar consequências atrasadas.',
        seedOffset:505,steps:18
      }),
      runScenarioTrajectory(state,instruction,{
        id:'reversal',label:'Mundo de reversão',
        premise:'Uma condição material muda e testa se a conclusão inicial continua robusta.',
        seedOffset:606,steps:8,
        modifier:s=>{
          s.needs.health=n(s.needs.health-24);
          s.needs.stress=n(s.needs.stress+22);
          s.person.money=Math.max(0,s.person.money-90);
        },
        ignoreForcedDestination:true
      })
    );
  }

  return scenarios;
}

export function summarizeLifeScenarios(results:LifeScenarioResult[]){
  if(!results.length)return 'Nenhum cenário calculado.';
  const rows=results.map(x=>x.label+': '+x.summary+' | '+x.signals.join(' · '));
  return [
    'Simulações contrafactuais — não são previsões certas.',
    ...rows
  ].join('\n');
}
