import {
  applySimulationInstruction,
  createLifeSimulation,
  simulationSummary,
  stepLifeSimulation,
  type LifeLocation,
  type LifeMemory,
  type LifeSimulationState
} from './life-simulation-engine';
import {
  LIFE_WORLD_HEIGHT,
  LIFE_WORLD_WIDTH,
  WORLD_OBJECTS,
  objectUtility,
  objectsAt,
  perceiveHumanWorld,
  worldObject
} from './life-world-open';

export type LifeAgentActionType=
  |'move'|'buy_food'|'eat'|'rest'|'work'|'study'|'socialize'
  |'exercise'|'healthcare'|'wait'|'set_goal'|'speak'
  |'cook'|'clean_home'|'shower'|'create'|'message_friend'
  |'approach_object'|'use_object'|'wander';

export interface LifeAgentAction{
  id:string;
  type:LifeAgentActionType;
  target?:LifeLocation;
  objectId?:string;
  minutes?:number;
  text?:string;
  reason?:string;
}

export interface LifeAgentPlan{
  id:string;
  objective:string;
  source:'provider'|'local'|'deterministic';
  actions:LifeAgentAction[];
  cursor:number;
  status:'planned'|'running'|'done'|'failed'|'cancelled';
  summary:string;
  createdAt:number;
}

export interface LifeActionRecord{
  id:string;
  tick:number;
  action:LifeAgentAction;
  ok:boolean;
  before:string;
  after:string;
  message:string;
}

export interface LifeAgentState{
  plan:LifeAgentPlan|null;
  history:LifeActionRecord[];
  inventory:{food:number};
  knowledge:number;
  skills:{career:number;cooking:number;fitness:number;logic:number;social:number;creativity:number};
  home:{cleanliness:number;comfort:number};
  autonomy:{enabled:boolean;decisionCount:number;lastDecision:string};
}

export interface LifeAgentExecution{
  state:LifeSimulationState;
  agent:LifeAgentState;
  record:LifeActionRecord;
}

function clamp(v:number,min=0,max=100){return Math.max(min,Math.min(max,v))}
function norm(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}
function actionId(index:number){return 'a-'+Date.now().toString(36)+'-'+index.toString(36)}
function planId(){return 'p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function cloneState(input:LifeSimulationState):LifeSimulationState{
  return {
    ...input,
    person:{...input.person},
    needs:{...input.needs},
    relationships:input.relationships.map(x=>({...x})),
    memories:[...input.memories],
    places:[...input.places],
    neuro:{...input.neuro,circuits:{...input.neuro.circuits}}
  };
}

export function createLifeAgentState():LifeAgentState{
  return {
    plan:null,
    history:[],
    inventory:{food:2},
    knowledge:0,
    skills:{career:18,cooking:12,fitness:16,logic:20,social:18,creativity:14},
    home:{cleanliness:76,comfort:72},
    autonomy:{enabled:false,decisionCount:0,lastDecision:'Aguardando instrução.'}
  };
}

export function normalizeLifeAgentState(raw:any):LifeAgentState{
  const base=createLifeAgentState();
  if(!raw||typeof raw!=='object')return base;
  return {
    plan:raw.plan&&typeof raw.plan==='object'?raw.plan:null,
    history:Array.isArray(raw.history)?raw.history.slice(-60):[],
    inventory:{food:Math.max(0,Number(raw.inventory?.food??base.inventory.food)||0)},
    knowledge:clamp(Number(raw.knowledge??0)||0),
    skills:{
      career:clamp(Number(raw.skills?.career??base.skills.career)||0),
      cooking:clamp(Number(raw.skills?.cooking??base.skills.cooking)||0),
      fitness:clamp(Number(raw.skills?.fitness??base.skills.fitness)||0),
      logic:clamp(Number(raw.skills?.logic??base.skills.logic)||0),
      social:clamp(Number(raw.skills?.social??base.skills.social)||0),
      creativity:clamp(Number(raw.skills?.creativity??base.skills.creativity)||0)
    },
    home:{
      cleanliness:clamp(Number(raw.home?.cleanliness??base.home.cleanliness)||0),
      comfort:clamp(Number(raw.home?.comfort??base.home.comfort)||0)
    },
    autonomy:{
      enabled:Boolean(raw.autonomy?.enabled??base.autonomy.enabled),
      decisionCount:Math.max(0,Number(raw.autonomy?.decisionCount??0)||0),
      lastDecision:String(raw.autonomy?.lastDecision||base.autonomy.lastDecision).slice(0,240)
    }
  };
}

const LOCATIONS:LifeLocation[]=['Casa','Trabalho','Café','Parque','Mercado','Clínica','Biblioteca'];

function safeLocation(value:any):LifeLocation|undefined{
  const raw=String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  return LOCATIONS.find(x=>x.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'')===raw);
}

export function sanitizeAgentActions(raw:any[]):LifeAgentAction[]{
  const allowed=new Set<LifeAgentActionType>([
    'move','buy_food','eat','rest','work','study','socialize',
    'exercise','healthcare','wait','set_goal','speak',
    'cook','clean_home','shower','create','message_friend',
    'approach_object','use_object','wander'
  ]);
  const out:LifeAgentAction[]=[];
  for(const [index,row] of (Array.isArray(raw)?raw:[]).entries()){
    const type=String(row?.type||'') as LifeAgentActionType;
    if(!allowed.has(type))continue;
    const target=safeLocation(row?.target);
    const minutes=Math.max(5,Math.min(240,Number(row?.minutes||0)||30));
    out.push({
      id:String(row?.id||actionId(index)),
      type,
      ...(target?{target}:{}),
      ...(row?.objectId?{objectId:String(row.objectId).slice(0,80)}:{}),
      ...(type==='wait'||type==='rest'||type==='work'||type==='study'||type==='socialize'||type==='exercise'||type==='healthcare'||type==='cook'||type==='clean_home'||type==='shower'||type==='create'||type==='wander'?{minutes}:{}),
      ...(row?.text?{text:String(row.text).slice(0,220)}:{}),
      ...(row?.reason?{reason:String(row.reason).slice(0,180)}:{})
    });
    if(out.length>=12)break;
  }
  return out;
}

function pushMove(actions:LifeAgentAction[],target:LifeLocation,reason:string){
  const last=actions[actions.length-1];
  if(last?.type==='move'&&last.target===target)return;
  actions.push({id:actionId(actions.length),type:'move',target,reason});
}

export function deterministicLifePlan(instruction:string,state:LifeSimulationState):LifeAgentPlan{
  const q=norm(instruction);
  const actions:LifeAgentAction[]=[];
  const setGoal=instruction.match(/(?:objetivo|meta)\s*(?:é|e|:)?\s*(.+)$/i)?.[1]?.trim();
  if(setGoal)actions.push({id:actionId(actions.length),type:'set_goal',text:setGoal.slice(0,180),reason:'objetivo explícito'});

  const wantsMarket=/\b(mercado|compr|comida|mantimento)\b/.test(q);
  const wantsHome=/\b(volte? (?:para )?casa|va (?:para )?casa|casa|descans|dorm)\b/.test(q);
  const wantsStudy=/\b(estud|aprend|biblioteca|curso|ler)\b/.test(q);
  const wantsWork=/\b(trabalh|emprego|renda|ganhar dinheiro)\b/.test(q);
  const wantsSocial=/\b(convers|social|amig|cafe|café|encontr)\b/.test(q);
  const wantsExercise=/\b(exerc|caminh|correr|trein|parque)\b/.test(q);
  const wantsHealth=/\b(clinic|saude|saúde|medic|consulta)\b/.test(q);
  const wantsEat=/\b(coma|comer|alimente|fome)\b/.test(q);
  const wantsCook=/\b(cozinhe|cozinhar|prepare (?:uma )?refeicao|prepare (?:uma )?refeição)\b/.test(q);
  const wantsClean=/\b(limpe|limpar|arrume|arrumar|faxina|casa limpa)\b/.test(q);
  const wantsShower=/\b(banho|tome banho|ducha|higiene)\b/.test(q);
  const wantsCreate=/\b(crie algo|desenhe|escreva|pinte|projeto criativo|criatividade)\b/.test(q);
  const wantsMessage=/\b(mensagem|mande mensagem|fale com mara|fale com nina|telefone|celular)\b/.test(q);
  const wantsAutonomy=/\b(decida|aja sozinha|aja por conta|autonomia|faca o que achar melhor|faça o que achar melhor|viva sua vida)\b/.test(q);

  if(wantsMarket){
    pushMove(actions,'Mercado','compras exigem presença no mercado');
    actions.push({id:actionId(actions.length),type:'buy_food',reason:'abastecer comida'});
  }
  if(wantsWork){
    pushMove(actions,'Trabalho','o trabalho ocorre no local de trabalho');
    actions.push({id:actionId(actions.length),type:'work',minutes:60,reason:'executar trabalho e gerar renda'});
  }
  if(wantsSocial){
    pushMove(actions,'Café','ambiente social');
    actions.push({id:actionId(actions.length),type:'socialize',minutes:40,reason:'fortalecer relações'});
  }
  if(wantsExercise){
    pushMove(actions,'Parque','atividade física no parque');
    actions.push({id:actionId(actions.length),type:'exercise',minutes:35,reason:'saúde e estresse'});
  }
  if(wantsHealth){
    pushMove(actions,'Clínica','cuidado de saúde');
    actions.push({id:actionId(actions.length),type:'healthcare',minutes:35,reason:'recuperar saúde'});
  }
  if(wantsStudy){
    pushMove(actions,'Biblioteca','ambiente de estudo');
    actions.push({id:actionId(actions.length),type:'study',minutes:50,reason:'aumentar conhecimento'});
  }
  if(wantsHome){
    pushMove(actions,'Casa','retornar para casa');
    if(/descans|dorm/.test(q))actions.push({id:actionId(actions.length),type:'rest',minutes:70,reason:'recuperar energia'});
  }
  if(wantsEat){
    if(!wantsMarket&&state.person.location!=='Casa'&&state.person.location!=='Café')pushMove(actions,'Casa','comer em local apropriado');
    actions.push({id:actionId(actions.length),type:'eat',reason:'reduzir fome'});
  }
  if(wantsCook){
    pushMove(actions,'Casa','cozinhar exige estar em casa');
    actions.push({id:actionId(actions.length),type:'cook',minutes:35,reason:'preparar uma refeição'});
  }
  if(wantsClean){
    pushMove(actions,'Casa','limpeza ocorre em casa');
    actions.push({id:actionId(actions.length),type:'clean_home',minutes:35,reason:'melhorar o ambiente doméstico'});
  }
  if(wantsShower){
    pushMove(actions,'Casa','banho ocorre em casa');
    actions.push({id:actionId(actions.length),type:'shower',minutes:20,reason:'higiene e recuperação'});
  }
  if(wantsCreate){
    const target:LifeLocation=state.person.location==='Casa'?'Casa':'Biblioteca';
    pushMove(actions,target,'atividade criativa precisa de um local estável');
    actions.push({id:actionId(actions.length),type:'create',minutes:45,reason:'avançar criatividade e projeto pessoal'});
  }
  if(wantsMessage){
    actions.push({id:actionId(actions.length),type:'message_friend',text:'Enviar uma mensagem breve para uma relação próxima.',reason:'manter vínculo social'});
  }
  if(wantsAutonomy&&!actions.length)return autonomousLifePlan(state,createLifeAgentState(),instruction);

  if(!actions.length){
    const parsed=applySimulationInstruction(state,instruction);
    if(parsed.forcedDestination)pushMove(actions,parsed.forcedDestination,'destino entendido do comando');
    else actions.push({id:actionId(0),type:'speak',text:instruction.slice(0,180),reason:'registrar instrução sem inventar ação física'});
  }

  return {
    id:planId(),
    objective:instruction.slice(0,240),
    source:'deterministic',
    actions:sanitizeAgentActions(actions),
    cursor:0,
    status:'planned',
    summary:'Plano local criado a partir da instrução.',
    createdAt:Date.now()
  };
}

export function autonomousLifePlan(
  state:LifeSimulationState,
  agentInput:LifeAgentState,
  instruction='Decida o que fazer agora',
  fly?:{x:number;y:number}
):LifeAgentPlan{
  const agent=normalizeLifeAgentState(agentInput);
  const vision=perceiveHumanWorld(state,fly);
  const visibleObjects=vision.visible.map(v=>worldObject(v.id)).filter(Boolean) as NonNullable<ReturnType<typeof worldObject>>[];
  const localObjects=objectsAt(state.person.location);
  const candidateMap=new Map<string,NonNullable<ReturnType<typeof worldObject>>>();
  for(const obj of [...visibleObjects,...localObjects])candidateMap.set(obj.id,obj);

  // If the current view has nothing useful, use remembered world knowledge to
  // choose a destination, then visual perception takes over again after travel.
  if(candidateMap.size<3){
    for(const obj of WORLD_OBJECTS)candidateMap.set(obj.id,obj);
  }

  const ranked=[...candidateMap.values()]
    .map(obj=>({
      obj,
      visible:visibleObjects.some(v=>v.id===obj.id),
      score:objectUtility(obj,state,state.tick)
        +(visibleObjects.some(v=>v.id===obj.id)?16:0)
        -(obj.location===state.person.location?0:14)
    }))
    .sort((a,b)=>b.score-a.score);

  const top=ranked.slice(0,Math.min(4,ranked.length));
  const phase=Math.abs(Math.sin((state.tick+1)*12.9898+(agent.autonomy.decisionCount+1)*4.1414));
  const pick=top.length?top[Math.min(top.length-1,Math.floor(phase*top.length))]:null;
  const actions:LifeAgentAction[]=[];

  if(pick){
    const obj=pick.obj;
    if(obj.location!==state.person.location)pushMove(actions,obj.location,'memória espacial indicou um local com possibilidade relevante');
    actions.push({
      id:actionId(actions.length),
      type:'approach_object',
      objectId:obj.id,
      reason:(pick.visible?'objeto percebido':'objeto lembrado')+' · utilidade '+Math.round(pick.score)
    });
    actions.push({
      id:actionId(actions.length),
      type:'use_object',
      objectId:obj.id,
      minutes:20+Math.round(phase*35),
      reason:'interagir com '+obj.label+' de acordo com necessidades, curiosidade e objetivo atual'
    });

    const socialDrive=100-state.needs.social;
    const wantsSpeech=(socialDrive>42||vision.seesOtherAgent||state.neuro.circuits.social>.62)
      && Math.abs(Math.sin((state.tick+7)*3.71))>.62;
    if(wantsSpeech){
      actions.push({
        id:actionId(actions.length),
        type:'speak',
        text:vision.seesOtherAgent
          ? 'Estou percebendo algo aqui. Vou ver o que acontece.'
          : 'Vou '+(obj.affordances[0]||'explorar')+' um pouco.',
        reason:'fala opcional escolhida pelo estado social/perceptivo'
      });
    }
  }else{
    actions.push({id:actionId(0),type:'wander',minutes:20,reason:'explorar o ambiente sem destino obrigatório'});
  }

  return {
    id:planId(),
    objective:instruction.slice(0,240),
    source:'deterministic',
    actions:sanitizeAgentActions(actions),
    cursor:0,
    status:'planned',
    summary:'Escolha autônoma não linear baseada em visão, necessidades, memória espacial, curiosidade, distância e variação interna.',
    createdAt:Date.now()
  };
}

export function parseProviderLifePlan(content:string,instruction:string,state:LifeSimulationState):LifeAgentPlan|null{
  const text=String(content||'').trim();
  const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate=fenced||text.match(/\{[\s\S]*\}/)?.[0]||'';
  if(!candidate)return null;
  try{
    const data=JSON.parse(candidate);
    const actions=sanitizeAgentActions(data?.actions||[]);
    if(!actions.length)return null;
    return {
      id:planId(),
      objective:String(data?.objective||instruction).slice(0,240),
      source:'provider',
      actions,
      cursor:0,
      status:'planned',
      summary:String(data?.summary||'Plano criado pela IA.').slice(0,280),
      createdAt:Date.now()
    };
  }catch{return null}
}

function observation(state:LifeSimulationState,agent:LifeAgentState){
  return [
    'local '+state.person.location,
    'dinheiro R$ '+state.person.money.toFixed(0),
    'energia '+state.needs.energy,
    'fome '+state.needs.hunger,
    'social '+state.needs.social,
    'foco '+state.needs.focus,
    'estresse '+state.needs.stress,
    'saúde '+state.needs.health,
    'comida '+agent.inventory.food,
    'conhecimento '+agent.knowledge
  ].join(' · ');
}

function remember(state:LifeSimulationState,summary:string,kind:LifeMemory['kind']='goal',salience=.7){
  const memory:LifeMemory={
    id:'agent-'+state.tick+'-'+Math.random().toString(36).slice(2,7),
    tick:state.tick,day:state.day,minute:state.minute,
    summary:summary.slice(0,220),valence:.58,salience,kind
  };
  state.memories=[memory,...state.memories].slice(0,24);
}

function travel(input:LifeSimulationState,target:LifeLocation){
  let state=cloneState(input);
  let guard=0;
  while(state.person.location!==target&&guard<28){
    state=stepLifeSimulation(state,5,target);
    guard++;
  }
  return state;
}

function runMinutes(input:LifeSimulationState,minutes:number,target?:LifeLocation){
  let state=cloneState(input);
  const steps=Math.max(1,Math.ceil(minutes/10));
  for(let i=0;i<steps;i++)state=stepLifeSimulation(state,Math.min(10,minutes-i*10),target||state.person.location);
  return state;
}

export function executeLifeAgentAction(
  input:LifeSimulationState,
  agentInput:LifeAgentState,
  action:LifeAgentAction
):LifeAgentExecution{
  const beforeState=cloneState(input);
  let state=cloneState(input);
  const agent=normalizeLifeAgentState(agentInput);
  const before=observation(state,agent);
  let ok=true;
  let message='Ação executada.';

  if(action.type==='move'){
    if(!action.target){ok=false;message='Destino ausente.'}
    else{
      state=travel(state,action.target);
      ok=state.person.location===action.target;
      message=ok?'Chegou a '+action.target+'.':'Não conseguiu chegar a '+action.target+'.';
    }
  }else if(action.type==='buy_food'){
    if(state.person.location!=='Mercado'){ok=false;message='Precisa estar no Mercado para comprar comida.'}
    else if(state.person.money<20){ok=false;message='Dinheiro insuficiente para a compra.'}
    else{
      state.person.money-=20;
      agent.inventory.food+=3;
      state.person.currentAction='Comprando comida no mercado';
      state.lastEvent='Comprou 3 unidades de comida por R$ 20.';
      state=runMinutes(state,20,'Mercado');
      message=state.lastEvent;
    }
  }else if(action.type==='eat'){
    if(state.person.location==='Café'&&state.person.money>=10){
      state.person.money-=10;
      state.needs.hunger=clamp(state.needs.hunger+28);
      state.needs.social=clamp(state.needs.social+4);
      state.person.currentAction='Fazendo uma refeição no café';
      state=runMinutes(state,25,'Café');
      message='Fez uma refeição no Café por R$ 10.';
    }else if(state.person.location==='Casa'&&agent.inventory.food>0){
      agent.inventory.food-=1;
      state.needs.hunger=clamp(state.needs.hunger+34);
      state.needs.energy=clamp(state.needs.energy+4);
      state.person.currentAction='Preparando e comendo uma refeição';
      state=runMinutes(state,30,'Casa');
      message='Usou 1 unidade de comida e fez uma refeição em casa.';
    }else{ok=false;message='Para comer, precisa estar em Casa com comida ou no Café com dinheiro.'}
  }else if(action.type==='rest'){
    if(state.person.location!=='Casa'){ok=false;message='Precisa estar em Casa para descansar.'}
    else{
      state=runMinutes(state,action.minutes||60,'Casa');
      state.needs.energy=clamp(state.needs.energy+22);
      state.needs.stress=clamp(state.needs.stress-16);
      state.person.currentAction='Descansando em casa';
      message='Descansou e recuperou energia.';
    }
  }else if(action.type==='work'){
    if(state.person.location!=='Trabalho'){ok=false;message='Precisa estar no Trabalho.'}
    else{
      const minutes=action.minutes||60;
      state=runMinutes(state,minutes,'Trabalho');
      const earned=Math.max(14,Math.round(minutes*.55));
      state.person.money+=earned;
      agent.skills.career=clamp(agent.skills.career+Math.max(1,Math.round(minutes/45)));
      state.needs.stress=clamp(state.needs.stress+7);
      state.person.currentAction='Concluindo um bloco de trabalho';
      message='Trabalhou '+minutes+' min e recebeu R$ '+earned+'.';
    }
  }else if(action.type==='study'){
    if(state.person.location!=='Biblioteca'){ok=false;message='Precisa estar na Biblioteca.'}
    else{
      const minutes=action.minutes||45;
      state=runMinutes(state,minutes,'Biblioteca');
      agent.knowledge=clamp(agent.knowledge+Math.max(3,Math.round(minutes/10)));
      agent.skills.logic=clamp(agent.skills.logic+Math.max(1,Math.round(minutes/20)));
      state.needs.focus=clamp(state.needs.focus+8);
      state.person.currentAction='Estudando com foco';
      message='Estudou '+minutes+' min; conhecimento agora '+agent.knowledge+'.';
    }
  }else if(action.type==='socialize'){
    if(state.person.location!=='Café'&&state.person.location!=='Parque'){ok=false;message='Precisa estar no Café ou Parque para socializar.'}
    else{
      const minutes=action.minutes||35;
      state=runMinutes(state,minutes,state.person.location);
      state.needs.social=clamp(state.needs.social+24);
      state.needs.fun=clamp(state.needs.fun+10);
      agent.skills.social=clamp(agent.skills.social+2);
      const rel=state.relationships[0];
      if(rel){rel.affinity=clamp(rel.affinity+4);rel.trust=clamp(rel.trust+2);rel.lastContact=state.tick}
      state.person.currentAction='Conversando e fortalecendo relações';
      message='Socializou por '+minutes+' min.';
    }
  }else if(action.type==='exercise'){
    if(state.person.location!=='Parque'){ok=false;message='Precisa estar no Parque.'}
    else{
      const minutes=action.minutes||30;
      state=runMinutes(state,minutes,'Parque');
      state.needs.health=clamp(state.needs.health+9);
      state.needs.stress=clamp(state.needs.stress-10);
      state.needs.energy=clamp(state.needs.energy-8);
      agent.skills.fitness=clamp(agent.skills.fitness+3);
      state.person.currentAction='Fazendo exercício no parque';
      message='Fez exercício por '+minutes+' min.';
    }
  }else if(action.type==='healthcare'){
    if(state.person.location!=='Clínica'){ok=false;message='Precisa estar na Clínica.'}
    else{
      const minutes=action.minutes||35;
      state=runMinutes(state,minutes,'Clínica');
      state.needs.health=clamp(state.needs.health+18);
      state.needs.stress=clamp(state.needs.stress-5);
      state.person.currentAction='Recebendo cuidados de saúde';
      message='Recebeu cuidados na Clínica.';
    }
  }else if(action.type==='approach_object'){
    const obj=worldObject(String(action.objectId||''));
    if(!obj){ok=false;message='Objeto não encontrado no mundo.'}
    else{
      if(state.person.location!==obj.location)state=travel(state,obj.location);
      const dx=obj.x-state.person.x,dy=obj.y-state.person.y;
      state.person.heading=Math.atan2(dy,dx);
      state.person.x=Math.max(0,Math.min(LIFE_WORLD_WIDTH,obj.x-10));
      state.person.y=Math.max(0,Math.min(LIFE_WORLD_HEIGHT,obj.y+8));
      state.person.location=obj.location;
      state.person.currentAction='Aproximando-se de '+obj.label;
      message='Chegou perto de '+obj.label+'.';
    }
  }else if(action.type==='use_object'){
    const obj=worldObject(String(action.objectId||''));
    if(!obj){ok=false;message='Objeto não encontrado no mundo.'}
    else if(state.person.location!==obj.location){ok=false;message='Precisa estar em '+obj.location+' para usar '+obj.label+'.'}
    else{
      const minutes=action.minutes||25;
      const affords=new Set(obj.affordances);
      state.person.currentAction='Usando '+obj.label;
      if(affords.has('rest')||affords.has('sleep')){state.needs.energy=clamp(state.needs.energy+18);state.needs.stress=clamp(state.needs.stress-10)}
      if(affords.has('food')||affords.has('eat'))state.needs.hunger=clamp(state.needs.hunger+16);
      if(affords.has('cook')){agent.skills.cooking=clamp(agent.skills.cooking+2);state.needs.hunger=clamp(state.needs.hunger+12)}
      if(affords.has('work')){agent.skills.career=clamp(agent.skills.career+2);state.person.money+=Math.max(8,Math.round(minutes*.28));state.needs.focus=clamp(state.needs.focus-3)}
      if(affords.has('study')||affords.has('research')||affords.has('read')){agent.knowledge=clamp(agent.knowledge+4);agent.skills.logic=clamp(agent.skills.logic+2);state.needs.focus=clamp(state.needs.focus+5)}
      if(affords.has('message')||affords.has('talk')){state.needs.social=clamp(state.needs.social+10);agent.skills.social=clamp(agent.skills.social+1)}
      if(affords.has('observe')||affords.has('relax')||affords.has('watch')){state.needs.fun=clamp(state.needs.fun+10);state.needs.stress=clamp(state.needs.stress-7)}
      if(affords.has('health')||affords.has('shower')){state.needs.health=clamp(state.needs.health+7);state.needs.stress=clamp(state.needs.stress-5)}
      if(affords.has('create')){agent.skills.creativity=clamp(agent.skills.creativity+3);state.needs.fun=clamp(state.needs.fun+5)}
      state=runMinutes(state,minutes,obj.location);
      message='Interagiu com '+obj.label+' por '+minutes+' min.';
    }
  }else if(action.type==='wander'){
    const visible=perceiveHumanWorld(state).visible;
    const target=visible[Math.floor(Math.abs(Math.sin((state.tick+1)*7.13))*Math.max(1,visible.length))];
    const angle=target?Math.atan2(target.y-state.person.y,target.x-state.person.x):(state.person.heading||0)+.9;
    const dist=target?Math.min(70,target.distance*.65):55;
    state.person.heading=angle;
    state.person.x=Math.max(10,Math.min(LIFE_WORLD_WIDTH-10,state.person.x+Math.cos(angle)*dist));
    state.person.y=Math.max(10,Math.min(LIFE_WORLD_HEIGHT-10,state.person.y+Math.sin(angle)*dist));
    state.person.currentAction=target?'Explorando na direção de '+target.label:'Caminhando sem destino fixo';
    state=runMinutes(state,action.minutes||20,state.person.location);
    message=state.person.currentAction+'.';
  }else if(action.type==='wait'){
    state=runMinutes(state,action.minutes||20);
    state.person.currentAction='Aguardando e observando o ambiente';
    message='Aguardou '+(action.minutes||20)+' min.';
  }else if(action.type==='set_goal'){
    const goal=String(action.text||'').trim();
    if(!goal){ok=false;message='Objetivo vazio.'}
    else{state.person.goal=goal.slice(0,180);message='Novo objetivo: '+state.person.goal}
  }else if(action.type==='speak'){
    const text=String(action.text||'').trim();
    state.person.currentAction=text?'Falando: '+text.slice(0,100):'Conversando';
    state.needs.social=clamp(state.needs.social+3);
    message=text?'Disse: '+text.slice(0,140):'Falou com o ambiente.';
  }else if(action.type==='cook'){
    if(state.person.location!=='Casa'){ok=false;message='Precisa estar em Casa para cozinhar.'}
    else if(agent.inventory.food<=0){ok=false;message='Não há comida no inventário para cozinhar.'}
    else{
      const minutes=action.minutes||35;
      agent.inventory.food-=1;
      state=runMinutes(state,minutes,'Casa');
      state.needs.hunger=clamp(state.needs.hunger+38);
      state.needs.fun=clamp(state.needs.fun+4);
      agent.skills.cooking=clamp(agent.skills.cooking+3);
      state.person.currentAction='Cozinhando e fazendo uma refeição';
      message='Cozinhou por '+minutes+' min; culinária '+agent.skills.cooking+'.';
    }
  }else if(action.type==='clean_home'){
    if(state.person.location!=='Casa'){ok=false;message='Precisa estar em Casa para limpar.'}
    else{
      const minutes=action.minutes||35;
      state=runMinutes(state,minutes,'Casa');
      agent.home.cleanliness=clamp(agent.home.cleanliness+28);
      state.needs.energy=clamp(state.needs.energy-6);
      state.needs.stress=clamp(state.needs.stress-4);
      state.person.currentAction='Limpando e organizando a casa';
      message='Casa organizada; limpeza '+agent.home.cleanliness+'.';
    }
  }else if(action.type==='shower'){
    if(state.person.location!=='Casa'){ok=false;message='Precisa estar em Casa para tomar banho.'}
    else{
      const minutes=action.minutes||20;
      state=runMinutes(state,minutes,'Casa');
      state.needs.health=clamp(state.needs.health+5);
      state.needs.stress=clamp(state.needs.stress-8);
      state.needs.energy=clamp(state.needs.energy+2);
      state.person.currentAction='Tomando banho e se recuperando';
      message='Tomou banho e reduziu o estresse.';
    }
  }else if(action.type==='create'){
    if(state.person.location!=='Casa'&&state.person.location!=='Biblioteca'){ok=false;message='Precisa estar em Casa ou na Biblioteca para criar com foco.'}
    else{
      const minutes=action.minutes||45;
      state=runMinutes(state,minutes,state.person.location);
      agent.skills.creativity=clamp(agent.skills.creativity+4);
      state.needs.focus=clamp(state.needs.focus+4);
      state.needs.fun=clamp(state.needs.fun+7);
      state.person.currentAction='Criando algo para o projeto pessoal';
      message='Criou por '+minutes+' min; criatividade '+agent.skills.creativity+'.';
    }
  }else if(action.type==='message_friend'){
    const rel=state.relationships[0];
    if(!rel){ok=false;message='Nenhuma relação disponível para contatar.'}
    else{
      rel.affinity=clamp(rel.affinity+2);
      rel.trust=clamp(rel.trust+1);
      rel.lastContact=state.tick;
      agent.skills.social=clamp(agent.skills.social+1);
      state.needs.social=clamp(state.needs.social+8);
      state.person.currentAction='Trocando mensagens com '+rel.name;
      state=runMinutes(state,10,state.person.location);
      message='Conversou por mensagem com '+rel.name+'.';
    }
  }

  state.person.mood=state.needs.stress>72?'sobrecarregada':state.needs.energy<35?'cansada':'estável';
  state.neuro=stepLifeSimulation(state,0,state.person.location).neuro;
  if(ok)remember(state,message,action.type==='set_goal'?'goal':'routine',action.type==='set_goal' ? .86 : .58);
  else state=beforeState;

  const after=observation(state,agent);
  const record:LifeActionRecord={
    id:'r-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),
    tick:state.tick,action,ok,before,after,message
  };
  agent.history=[...agent.history,record].slice(-60);
  return {state,agent,record};
}

function requiredLocation(type:LifeAgentActionType,objectId?:string):LifeLocation|undefined{
  if((type==='approach_object'||type==='use_object')&&objectId)return worldObject(objectId)?.location;
  if(type==='buy_food')return 'Mercado';
  if(type==='rest')return 'Casa';
  if(type==='work')return 'Trabalho';
  if(type==='study')return 'Biblioteca';
  if(type==='exercise')return 'Parque';
  if(type==='healthcare')return 'Clínica';
  if(type==='socialize')return 'Café';
  if(type==='cook'||type==='clean_home'||type==='shower')return 'Casa';
  return undefined;
}

export function repairLifeAgentPlan(
  plan:LifeAgentPlan,
  state:LifeSimulationState,
  agentInput:LifeAgentState
):LifeAgentPlan{
  const agent=normalizeLifeAgentState(agentInput);
  const repaired:LifeAgentAction[]=[];
  let simulatedLocation=state.person.location;
  let simulatedFood=agent.inventory.food;

  const appendMove=(target:LifeLocation,reason:string)=>{
    const last=repaired[repaired.length-1];
    if(last?.type==='move'&&last.target===target)return;
    repaired.push({id:actionId(repaired.length),type:'move',target,reason});
    simulatedLocation=target;
  };

  for(const original of plan.actions){
    const action={...original,id:actionId(repaired.length)};
    if(action.type==='move'&&action.target){
      appendMove(action.target,action.reason||'pré-condição de localização');
      continue;
    }

    if((action.type==='approach_object'||action.type==='use_object')&&action.objectId){
      const obj=worldObject(action.objectId);
      if(obj&&simulatedLocation!==obj.location)appendMove(obj.location,'ir até a área de '+obj.label);
      repaired.push({...action,id:actionId(repaired.length)});
      continue;
    }

    if(action.type==='eat'){
      if(simulatedLocation==='Casa'&&simulatedFood<=0){
        appendMove('Mercado','é preciso obter comida antes da refeição em casa');
        repaired.push({id:actionId(repaired.length),type:'buy_food',reason:'abastecer o inventário'});
        simulatedFood+=3;
        appendMove('Casa','voltar para preparar a refeição');
      }else if(simulatedLocation!=='Casa'&&simulatedLocation!=='Café'){
        if(simulatedFood>0)appendMove('Casa','usar comida disponível em casa');
        else{
          appendMove('Mercado','comprar comida');
          repaired.push({id:actionId(repaired.length),type:'buy_food',reason:'abastecer o inventário'});
          simulatedFood+=3;
          appendMove('Casa','voltar para comer');
        }
      }
      repaired.push({...action,id:actionId(repaired.length)});
      if(simulatedLocation==='Casa'&&simulatedFood>0)simulatedFood--;
      continue;
    }

    const required=requiredLocation(action.type,action.objectId);
    if(required&&simulatedLocation!==required)appendMove(required,'pré-condição para '+action.type);
    repaired.push({...action,id:actionId(repaired.length)});
    if(action.type==='buy_food')simulatedFood+=3;
  }

  return {
    ...plan,
    actions:repaired.slice(0,16),
    summary:plan.summary+(repaired.length!==plan.actions.length?' · pré-condições reparadas automaticamente':'')
  };
}

export function startLifeAgentPlan(agentInput:LifeAgentState,plan:LifeAgentPlan){
  const agent=normalizeLifeAgentState(agentInput);
  agent.plan={...plan,cursor:0,status:'running'};
  return agent;
}

export function executeNextLifeAgentAction(
  state:LifeSimulationState,
  agentInput:LifeAgentState
):LifeAgentExecution|null{
  const agent=normalizeLifeAgentState(agentInput);
  const plan=agent.plan;
  if(!plan||plan.status!=='running')return null;
  const action=plan.actions[plan.cursor];
  if(!action){
    agent.plan={...plan,status:'done'};
    const record:LifeActionRecord={
      id:'r-done-'+Date.now().toString(36),tick:state.tick,
      action:{id:'done',type:'wait',minutes:0},ok:true,
      before:observation(state,agent),after:observation(state,agent),
      message:'Plano concluído.'
    };
    return {state,agent,record};
  }
  const result=executeLifeAgentAction(state,agent,action);
  const nextCursor=plan.cursor+1;
  result.agent.plan={
    ...plan,
    cursor:nextCursor,
    status:result.record.ok?(nextCursor>=plan.actions.length?'done':'running'):'failed'
  };
  return result;
}

export function agentWorldObservation(state:LifeSimulationState,agentInput:LifeAgentState,fly?:{x:number;y:number}){
  const agent=normalizeLifeAgentState(agentInput);
  const vision=perceiveHumanWorld(state,fly);
  return [
    simulationSummary(state),
    'VISÃO ATUAL: '+vision.summary,
    'Objetos visíveis: '+(vision.visible.map(x=>x.label+' ('+Math.round(x.distance)+')').join(', ')||'nenhum'),
    'Inventário: comida '+agent.inventory.food,
    'Conhecimento: '+agent.knowledge,
    'Habilidades: carreira '+agent.skills.career+' · culinária '+agent.skills.cooking+' · fitness '+agent.skills.fitness+' · lógica '+agent.skills.logic+' · social '+agent.skills.social+' · criatividade '+agent.skills.creativity,
    'Casa: limpeza '+agent.home.cleanliness+' · conforto '+agent.home.comfort,
    'Autonomia: '+(agent.autonomy.enabled?'ativa':'manual')+' · decisões '+agent.autonomy.decisionCount,
    'Plano atual: '+(agent.plan?agent.plan.objective+' · '+agent.plan.status+' · passo '+agent.plan.cursor+'/'+agent.plan.actions.length:'nenhum'),
    'Últimas ações: '+agent.history.slice(-5).map(x=>(x.ok?'OK ':'ERRO ')+x.action.type+': '+x.message).join(' | ')
  ].join('\n');
}

export function simulationPlannerPrompt(
  instruction:string,
  state:LifeSimulationState,
  agentInput:LifeAgentState
){
  const agent=normalizeLifeAgentState(agentInput);
  return [
    'Você é o planejador de uma simulação de vida 2D. O usuário deu uma ordem à personagem.',
    'Transforme a ordem em ações executáveis no mundo. Não responda em prosa.',
    'Retorne SOMENTE JSON válido no formato:',
    '{"objective":"...","summary":"...","actions":[{"type":"move","target":"Mercado","reason":"..."},{"type":"buy_food","reason":"..."},{"type":"move","target":"Casa"},{"type":"eat"}]}',
    'Tipos permitidos: move, buy_food, eat, rest, work, study, socialize, exercise, healthcare, wait, set_goal, speak, cook, clean_home, shower, create, message_friend, approach_object, use_object, wander.',
    'Destinos permitidos: Casa, Trabalho, Café, Parque, Mercado, Clínica, Biblioteca.',
    'Regras físicas: comprar comida exige Mercado; comer/cozinhar em casa exige comida; estudar exige Biblioteca; trabalhar exige Trabalho; descansar/limpar/tomar banho exigem Casa; exercício exige Parque; cuidados exigem Clínica; criar exige Casa ou Biblioteca.',
    'Planeje no máximo 10 ações. Não faça um roteiro linear desnecessário: observe primeiro, escolha entre alternativas e fale apenas quando houver motivo social/perceptivo.',
    'Não inclua chain-of-thought. reason é apenas justificativa curta da ação.',
    '',
    'ESTADO ATUAL:',
    agentWorldObservation(state,agent),
    '',
    'ORDEM DO USUÁRIO:',
    instruction
  ].join('\n');
}

export function resetLifeAgentWorld(){
  return {state:createLifeSimulation(),agent:createLifeAgentState()};
}
