import type {LifeSimulationState} from '@/lib/life-simulation-engine';

export interface EmergentAgent{
  id:string;
  policy:'seek'|'avoid'|'social'|'explore';
  fitness:number;
  perception:string[];
  action:string;
  genome:number[];
}

export interface EmergentSwarmSnapshot{
  generation:number;
  agents:EmergentAgent[];
  diversity:number;
  dominantPolicy:EmergentAgent['policy'];
  notes:string[];
}

function hash(seed:number,n:number){
  let x=(seed^(n*2654435761))>>>0;
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)/4294967295;
}
function gene(seed:number,i:number){return hash(seed,i)*4-2}
function policyFrom(genome:number[]):EmergentAgent['policy']{
  const scores=[
    {p:'seek' as const,v:genome[0]+genome[4]},
    {p:'avoid' as const,v:genome[1]+genome[5]},
    {p:'social' as const,v:genome[2]+genome[6]},
    {p:'explore' as const,v:genome[3]+genome[7]}
  ].sort((a,b)=>b.v-a.v);
  return scores[0].p;
}
function localPerception(state:LifeSimulationState,index:number){
  const rel=state.relationships[index%Math.max(1,state.relationships.length)];
  const out=[
    state.needs.energy<45?'low-energy':'energy-ok',
    state.needs.stress>60?'high-stress':'stress-ok',
    state.needs.social<45?'social-need':'social-ok',
    state.person.money<120?'money-pressure':'money-ok',
    'location:'+state.person.location
  ];
  if(rel)out.push('relation:'+rel.name+':'+Math.round((rel.affinity+rel.trust)/2));
  return out;
}
function actionFor(policy:EmergentAgent['policy'],state:LifeSimulationState){
  if(policy==='seek')return state.needs.energy<50?'seek rest/food':'seek goal progress';
  if(policy==='avoid')return state.needs.stress>50?'avoid stressor and recover':'preserve resources';
  if(policy==='social')return state.needs.social<65?'seek trusted contact':'maintain relationship';
  return 'explore an alternative place/action';
}

export function simulateEmergentSwarm(state:LifeSimulationState,size=12):EmergentSwarmSnapshot{
  const count=Math.max(4,Math.min(32,Math.floor(size)));
  const agents:EmergentAgent[]=[];
  for(let i=0;i<count;i++){
    const genome=Array.from({length:8},(_,g)=>gene(state.seed+state.tick*17+i*31,g+i));
    const policy=policyFrom(genome);
    const perception=localPerception(state,i);
    const fitness=Math.max(0,Math.min(100,
      55+
      (policy==='seek'?state.needs.focus*.18:0)+
      (policy==='avoid'?(100-state.needs.stress)*.16:0)+
      (policy==='social'?state.needs.social*.16:0)+
      (policy==='explore'?state.neuro.curiosity*18:0)+
      (hash(state.seed+i,state.tick)-.5)*12
    ));
    agents.push({id:'swarm-'+i,policy,fitness:Math.round(fitness),perception,action:actionFor(policy,state),genome});
  }
  const counts=new Map<EmergentAgent['policy'],number>();
  for(const a of agents)counts.set(a.policy,(counts.get(a.policy)||0)+1);
  const dominantPolicy=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'explore';
  const diversity=counts.size/counts.size?Math.round((counts.size/4)*100):0;
  return {
    generation:Math.floor(state.tick/12)+1,
    agents:agents.sort((a,b)=>b.fitness-a.fitness),
    diversity,
    dominantPolicy,
    notes:[
      'Camada experimental inspirada em percepção local + pequenas políticas neurais + seleção por fitness.',
      'Não é previsão do comportamento humano; serve para produzir alternativas emergentes dentro da simulação.',
      'O estado principal continua determinístico e auditável.'
    ]
  };
}

export function emergentSwarmContext(state:LifeSimulationState){
  const snap=simulateEmergentSwarm(state,12);
  const top=snap.agents.slice(0,4).map(a=>a.policy+' '+a.fitness+' → '+a.action).join(' | ');
  return 'Swarm gen '+snap.generation+' · diversidade '+snap.diversity+'% · dominante '+snap.dominantPolicy+' · '+top;
}
