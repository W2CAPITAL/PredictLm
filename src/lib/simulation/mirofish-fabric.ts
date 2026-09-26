import type {LifeSimulationState} from '@/lib/life-simulation-engine';

export type MiroFishStance='support'|'neutral'|'concern';
export type MiroFishArchetype='pragmatic'|'social'|'cautious'|'explorer'|'contrarian'|'builder';

export interface MiroFishGraphNode{
  id:string;
  label:string;
  kind:'person'|'place'|'need'|'goal'|'event'|'topic';
  salience:number;
}

export interface MiroFishGraphEdge{
  from:string;
  to:string;
  relation:string;
  weight:number;
}

export interface MiroFishAgent{
  id:string;
  archetype:MiroFishArchetype;
  stance:MiroFishStance;
  influence:number;
  reactionSpeed:number;
  confidence:number;
  memory:string[];
  neighbors:string[];
}

export interface MiroFishRound{
  round:number;
  support:number;
  neutral:number;
  concern:number;
  dominant:MiroFishStance;
  events:string[];
}

export interface MiroFishSimulationSnapshot{
  version:1;
  seed:number;
  objective:string;
  graph:{nodes:MiroFishGraphNode[];edges:MiroFishGraphEdge[]};
  agents:MiroFishAgent[];
  weightedPopulation:number;
  rounds:MiroFishRound[];
  dominant:MiroFishStance;
  diversity:number;
  uncertainty:number;
  report:{
    summary:string;
    signals:string[];
    dissent:string[];
    counterfactuals:string[];
    limits:string[];
  };
}

function clamp(v:number,min=0,max=1){return Math.max(min,Math.min(max,v))}
function norm(v:string){
  return String(v||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}
function hash32(seed:number,n:number){
  let x=(seed^Math.imul(n+1,0x9e3779b1))>>>0;
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)/4294967295;
}
function id(value:string){return norm(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'node'}
function dominantOf(rows:{support:number;neutral:number;concern:number}[]):MiroFishStance{
  const last=rows[rows.length-1]||{support:0,neutral:1,concern:0};
  if(last.support>=last.neutral&&last.support>=last.concern)return 'support';
  if(last.concern>=last.support&&last.concern>=last.neutral)return 'concern';
  return 'neutral';
}

export function buildMiroFishGraph(state:LifeSimulationState,objective:string){
  const nodes:MiroFishGraphNode[]=[];
  const edges:MiroFishGraphEdge[]=[];
  const add=(node:MiroFishGraphNode)=>{
    if(!nodes.some(x=>x.id===node.id))nodes.push(node);
  };
  const link=(from:string,to:string,relation:string,weight:number)=>{
    if(from===to||edges.some(x=>x.from===from&&x.to===to&&x.relation===relation))return;
    edges.push({from,to,relation,weight:clamp(weight)});
  };

  const personId='person:'+id(state.person.name);
  const goalId='goal:'+id(state.person.goal);
  const topicId='topic:'+id(objective||state.person.currentAction);
  add({id:personId,label:state.person.name,kind:'person',salience:1});
  add({id:goalId,label:state.person.goal,kind:'goal',salience:.9});
  add({id:topicId,label:objective||state.person.currentAction,kind:'topic',salience:.95});
  link(personId,goalId,'pursues',.94);
  link(personId,topicId,'evaluates',.82);

  for(const place of state.places){
    const pid='place:'+id(place.id);
    add({id:pid,label:place.label,kind:'place',salience:place.id===state.person.location?.9:.35});
    if(place.id===state.person.location)link(personId,pid,'located-at',.96);
  }

  for(const [name,value] of Object.entries(state.needs)){
    const nid='need:'+id(name);
    const pressure=name==='stress'?Number(value)/100:1-Number(value)/100;
    add({id:nid,label:name,kind:'need',salience:clamp(.3+pressure*.7)});
    link(personId,nid,'state',clamp(.35+pressure*.6));
  }

  for(const rel of state.relationships.slice(0,8)){
    const rid='person:'+id(rel.name);
    add({id:rid,label:rel.name,kind:'person',salience:clamp((rel.affinity+rel.trust)/200)});
    link(personId,rid,'relationship',clamp((rel.affinity+rel.trust)/200));
    link(rid,topicId,'can-influence',clamp(rel.affinity/100*.7));
  }

  for(const memory of state.memories.slice(0,8)){
    const mid='event:'+id(memory.id);
    add({id:mid,label:memory.summary,kind:'event',salience:clamp(memory.salience)});
    link(personId,mid,'remembers',clamp(memory.salience));
    link(mid,topicId,'context-for',clamp(.35+memory.salience*.5));
  }

  return {nodes:nodes.slice(0,42),edges:edges.slice(0,84)};
}

function baseStance(archetype:MiroFishArchetype,state:LifeSimulationState,index:number):MiroFishStance{
  const pressure=(state.needs.stress+(100-state.needs.energy)+(100-state.needs.health))/300;
  const r=hash32(state.seed+state.tick*17,index*31+7);
  if(archetype==='cautious'||archetype==='contrarian'){
    if(r<.42+pressure*.25)return 'concern';
  }
  if(archetype==='builder'||archetype==='explorer'){
    if(r>.34+pressure*.18)return 'support';
  }
  if(archetype==='social'&&state.needs.social<55)return r>.52?'support':'neutral';
  if(r<.28)return 'concern';
  if(r>.67)return 'support';
  return 'neutral';
}

export function createMiroFishAgents(state:LifeSimulationState,size=24){
  const count=Math.max(8,Math.min(96,Math.floor(size)));
  const archetypes:MiroFishArchetype[]=['pragmatic','social','cautious','explorer','contrarian','builder'];
  const agents:MiroFishAgent[]=[];
  for(let i=0;i<count;i++){
    const archetype=archetypes[Math.floor(hash32(state.seed,i*13+3)*archetypes.length)%archetypes.length];
    const stance=baseStance(archetype,state,i);
    const influence=.2+hash32(state.seed+19,i*29)*.75;
    const reactionSpeed=.2+hash32(state.seed+31,i*37)*.78;
    const confidence=.3+hash32(state.seed+47,i*41)*.65;
    agents.push({
      id:'mf-'+i,
      archetype,
      stance,
      influence:Number(influence.toFixed(3)),
      reactionSpeed:Number(reactionSpeed.toFixed(3)),
      confidence:Number(confidence.toFixed(3)),
      memory:[
        'location:'+state.person.location,
        'goal:'+state.person.goal.slice(0,90),
        'event:'+state.lastEvent.slice(0,90)
      ],
      neighbors:[]
    });
  }
  for(let i=0;i<agents.length;i++){
    const degree=2+Math.floor(hash32(state.seed+71,i)*4);
    const set=new Set<string>();
    for(let j=1;j<=degree;j++){
      const idx=Math.floor(hash32(state.seed+i*101,j*53)*agents.length)%agents.length;
      if(idx!==i)set.add(agents[idx].id);
    }
    agents[i].neighbors=[...set];
  }
  return agents;
}

function stanceValue(s:MiroFishStance){return s==='support'?1:s==='concern'?-1:0}
function valueStance(v:number):MiroFishStance{return v>.22?'support':v<-.22?'concern':'neutral'}

function distribution(agents:MiroFishAgent[]){
  const weights={support:0,neutral:0,concern:0};
  let total=0;
  for(const a of agents){
    const w=.35+a.influence*.65;
    weights[a.stance]+=w;total+=w;
  }
  return {
    support:total?weights.support/total:0,
    neutral:total?weights.neutral/total:1,
    concern:total?weights.concern/total:0
  };
}

function evolveRound(agents:MiroFishAgent[],state:LifeSimulationState,round:number){
  const byId=new Map(agents.map(a=>[a.id,a]));
  const next=agents.map((agent,index)=>{
    const peers=agent.neighbors.map(id=>byId.get(id)).filter(Boolean) as MiroFishAgent[];
    const peerSignal=peers.length
      ? peers.reduce((sum,p)=>sum+stanceValue(p.stance)*p.influence,0)/peers.reduce((sum,p)=>sum+p.influence,0)
      : 0;
    const self=stanceValue(agent.stance)*agent.confidence;
    const needSignal=((state.needs.focus-state.needs.stress)+(state.needs.energy-50))/150;
    const noise=(hash32(state.seed+round*997,index*113)-.5)*.28;
    const score=self*.46+peerSignal*.34+needSignal*.12+noise*.08;
    const stance=valueStance(score);
    const memory=[
      'round '+round+': '+stance+' after local peer signal '+peerSignal.toFixed(2),
      ...agent.memory
    ].slice(0,8);
    return {...agent,stance,memory};
  });
  return next;
}

export function simulateMiroFishSwarm(
  state:LifeSimulationState,
  objective='Explore consequências e reações internas do mundo simulado',
  options?:{agents?:number;rounds?:number}
):MiroFishSimulationSnapshot{
  const graph=buildMiroFishGraph(state,objective);
  let agents=createMiroFishAgents(state,options?.agents??24);
  const roundCount=Math.max(2,Math.min(24,Math.floor(options?.rounds??6)));
  const rounds:MiroFishRound[]=[];

  for(let r=1;r<=roundCount;r++){
    agents=evolveRound(agents,state,r);
    const dist=distribution(agents);
    const row={
      support:dist.support,
      neutral:dist.neutral,
      concern:dist.concern
    };
    rounds.push({
      round:r,
      support:Number((dist.support*100).toFixed(1)),
      neutral:Number((dist.neutral*100).toFixed(1)),
      concern:Number((dist.concern*100).toFixed(1)),
      dominant:dominantOf([row]),
      events:[
        'temporal-memory update',
        r===1?'seed/context injection':'neighbor interaction + stance update',
        r===roundCount?'report checkpoint':'local interaction'
      ]
    });
  }

  const last=rounds[rounds.length-1];
  const counts=new Set(agents.map(a=>a.archetype)).size;
  const diversity=Math.round(counts/6*100);
  const ordered=[last.support,last.neutral,last.concern].sort((a,b)=>b-a);
  const uncertainty=Math.round(Math.max(0,100-(ordered[0]-ordered[1])));
  const dominant=last.dominant;
  const minority=(['support','neutral','concern'] as MiroFishStance[])
    .filter(x=>x!==dominant)
    .map(x=>x+': '+last[x].toFixed(1)+'%');

  return {
    version:1,
    seed:state.seed,
    objective,
    graph,
    agents,
    weightedPopulation:agents.reduce((sum,a)=>sum+Math.round(1+a.influence*8),0),
    rounds,
    dominant,
    diversity,
    uncertainty,
    report:{
      summary:'Cenário sintético: '+dominant+' terminou como sinal dominante após '+roundCount+' rodadas; diversidade '+diversity+'%.',
      signals:[
        'graph '+graph.nodes.length+' nós / '+graph.edges.length+' relações',
        'active agents '+agents.length+' · weighted population '+agents.reduce((sum,a)=>sum+Math.round(1+a.influence*8),0),
        'support '+last.support.toFixed(1)+'% · neutral '+last.neutral.toFixed(1)+'% · concern '+last.concern.toFixed(1)+'%'
      ],
      dissent:minority,
      counterfactuals:[
        'reverse the strongest environmental pressure and rerun',
        'remove the most influential agents and compare propagation',
        'inject a contradictory event and inspect memory/stance recovery'
      ],
      limits:[
        'synthetic simulator output; not a forecast of real people',
        'active agents are weighted representatives; no claim that thousands of LLM agents ran',
        'deterministic local approximation unless an explicitly configured provider enriches the planner'
      ]
    }
  };
}

export function miroFishSimulationContext(state?:LifeSimulationState,objective=''){
  const base=[
    'MIROFISH FABRIC · clean-room native simulation pattern inspired by 666ghj/MiroFish and MiroFish-Offline; upstream AGPL code is reference-only.',
    'Pipeline: seed/context → entity/relationship graph → individual/group memory → persona/cohort setup → parallel interaction rounds → temporal memory update → report agent → deep inspection.',
    'Agents must act from local neighbors, memory and world state; graph provenance and round ledger remain inspectable.',
    'Use weighted representative agents on weak/browser devices instead of pretending thousands of LLM agents executed.',
    'Counterfactual output is a sandbox result, not a factual prediction about real people or future events.'
  ];
  if(!state)return base.join('\n');
  const snap=simulateMiroFishSwarm(state,objective||state.person.currentAction,{agents:18,rounds:4});
  return [
    ...base,
    'Current synthetic snapshot: '+snap.report.summary,
    ...snap.report.signals.map(x=>'SIGNAL · '+x),
    ...snap.report.dissent.map(x=>'DISSENT · '+x)
  ].join('\n');
}
