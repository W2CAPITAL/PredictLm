import {
  applySimulationInstruction,
  createLifeSimulation,
  simulationSummary,
  stepLifeSimulation,
  type LifeLocation,
  type LifeMemory,
  type LifeSimulationState
} from './life-simulation-engine';

export type LifeAgentActionType=
  |'move'|'buy_food'|'eat'|'rest'|'work'|'study'|'socialize'
  |'exercise'|'healthcare'|'wait'|'set_goal'|'speak';

export interface LifeAgentAction{
  id:string;
  type:LifeAgentActionType;
  target?:LifeLocation;
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
  return {plan:null,history:[],inventory:{food:2},knowledge:0};
}

export function normalizeLifeAgentState(raw:any):LifeAgentState{
  const base=createLifeAgentState();
  if(!raw||typeof raw!=='object')return base;
  return {
    plan:raw.plan&&typeof raw.plan==='object'?raw.plan:null,
    history:Array.isArray(raw.history)?raw.history.slice(-60):[],
    inventory:{food:Math.max(0,Number(raw.inventory?.food??base.inventory.food)||0)},
    knowledge:clamp(Number(raw.knowledge??0)||0)
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
    'exercise','healthcare','wait','set_goal','speak'
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
      ...(type==='wait'||type==='rest'||type==='work'||type==='study'||type==='socialize'||type==='exercise'||type==='healthcare'?{minutes}:{}),
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
  }

  state.person.mood=state.needs.stress>72?'sobrecarregada':state.needs.energy<35?'cansada':'estável';
  state.neuro=stepLifeSimulation(state,0,state.person.location).neuro;
  if(ok)remember(state,message,action.type==='set_goal'?'goal':'routine',action.type==='set_goal'?.86:.58);
  else state=beforeState;

  const after=observation(state,agent);
  const record:LifeActionRecord={
    id:'r-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),
    tick:state.tick,action,ok,before,after,message
  };
  agent.history=[...agent.history,record].slice(-60);
  return {state,agent,record};
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

export function agentWorldObservation(state:LifeSimulationState,agentInput:LifeAgentState){
  const agent=normalizeLifeAgentState(agentInput);
  return [
    simulationSummary(state),
    'Inventário: comida '+agent.inventory.food,
    'Conhecimento: '+agent.knowledge,
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
    'Tipos permitidos: move, buy_food, eat, rest, work, study, socialize, exercise, healthcare, wait, set_goal, speak.',
    'Destinos permitidos: Casa, Trabalho, Café, Parque, Mercado, Clínica, Biblioteca.',
    'Regras físicas: comprar comida exige Mercado; comer em casa exige comida; estudar exige Biblioteca; trabalhar exige Trabalho; descansar exige Casa; exercício exige Parque; cuidados exigem Clínica.',
    'Planeje no máximo 10 ações. Prefira ações que mudem o estado real do mundo.',
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
