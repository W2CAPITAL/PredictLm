export type CognitiveAgentAction =
  | 'observe'
  | 'recall'
  | 'plan'
  | 'explore'
  | 'speak'
  | 'wait'
  | 'reconsider';

export interface CognitiveAgentEpisode {
  id: string;
  at: number;
  cue: string;
  summary: string;
  salience: number;
  valence: number;
}

export interface CognitiveAgentState {
  id: string;
  name: string;
  kind: 'simulated-human';
  seed: number;
  tick: number;
  traits: {
    curiosity: number;
    sociability: number;
    caution: number;
    persistence: number;
    noveltySeeking: number;
  };
  needs: {
    rest: number;
    social: number;
    novelty: number;
    certainty: number;
  };
  attention: number;
  uncertainty: number;
  confidence: number;
  currentGoal: string;
  currentAction: CognitiveAgentAction;
  currentFocus: string;
  recalledMemory: string;
  publicReport: string;
  actionHistory: CognitiveAgentAction[];
  workingMemory: string[];
  episodic: CognitiveAgentEpisode[];
  semantic: string[];
}

export interface CognitivePopulationState {
  version: 1;
  tick: number;
  agents: CognitiveAgentState[];
  sharedScene: string;
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const clean=(s:string,max=240)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,max);
const words=(s:string)=>new Set(clean(s,800).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>2));

function hashString(input:string){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){
    h^=input.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}

function unit(seed:number){
  let x=seed>>>0;
  x^=x<<13;
  x^=x>>>17;
  x^=x<<5;
  return (x>>>0)/4294967295;
}

function gumbel(seed:number){
  const u=Math.max(1e-6,Math.min(.999999,unit(seed)));
  return -Math.log(-Math.log(u));
}

function overlap(a:string,b:string){
  const aw=words(a),bw=words(b);
  if(!aw.size||!bw.size)return 0;
  let hit=0;
  aw.forEach(x=>{if(bw.has(x))hit++});
  return hit/Math.max(1,Math.min(aw.size,bw.size));
}

function episode(id:string,cue:string,summary:string,salience=.55,valence=.5):CognitiveAgentEpisode{
  return {id,at:Date.now(),cue:clean(cue,160),summary:clean(summary,240),salience:clamp(salience),valence:clamp(valence)};
}

function createAgent(
  id:string,
  name:string,
  seed:number,
  traits:CognitiveAgentState['traits'],
  goal:string,
  semantic:string[]
):CognitiveAgentState{
  return {
    id,name,kind:'simulated-human',seed,tick:0,traits,
    needs:{rest:.2,social:.35,novelty:.48,certainty:.45},
    attention:.55,uncertainty:.42,confidence:.5,
    currentGoal:goal,
    currentAction:'observe',
    currentFocus:'ambiente inicial',
    recalledMemory:'',
    publicReport:'Aguardando percepção suficiente para escolher uma ação.',
    actionHistory:[],
    workingMemory:[],
    episodic:[episode(id+'-origin','inicialização','Estado cognitivo simulado iniciado; ainda não há experiência própria acumulada.',.7,.5)],
    semantic
  };
}

export function createCognitivePopulation():CognitivePopulationState{
  return {
    version:1,
    tick:0,
    sharedScene:'Cognitive Lab',
    agents:[
      createAgent('human-a','Helena',113,{
        curiosity:.78,sociability:.56,caution:.42,persistence:.66,noveltySeeking:.74
      },'Entender o ambiente antes de agir',[
        'Memória episódica preserva eventos; memória semântica preserva conceitos.',
        'Incerteza alta favorece verificação antes de conclusão.'
      ]),
      createAgent('human-b','Ravi',271,{
        curiosity:.62,sociability:.72,caution:.36,persistence:.82,noveltySeeking:.48
      },'Transformar percepção em uma ação útil',[
        'Objetivos persistentes reduzem troca de tarefa sem motivo.',
        'Ação escolhida deve produzir mudança observável no estado.'
      ]),
      createAgent('human-c','Noa',419,{
        curiosity:.86,sociability:.44,caution:.58,persistence:.52,noveltySeeking:.9
      },'Procurar padrões e alternativas não óbvias',[
        'Novidade sem evidência não deve virar certeza.',
        'Exploração útil termina quando o ganho de informação cai.'
      ]),
      createAgent('human-d','Mara',631,{
        curiosity:.54,sociability:.82,caution:.76,persistence:.7,noveltySeeking:.4
      },'Preservar contexto, segurança e continuidade',[
        'Memória relevante é recuperada por pista, recência e saliência.',
        'Interromper um plano é justificável quando risco ou evidência mudam.'
      ])
    ]
  };
}

function recall(agent:CognitiveAgentState,prompt:string){
  const episodes=[...agent.episodic]
    .map(x=>({x,score:overlap(prompt,x.cue+' '+x.summary)*.62+x.salience*.25+Math.min(.13,1/(1+Math.max(0,Date.now()-x.at)/60000))}))
    .sort((a,b)=>b.score-a.score);
  if(episodes[0]?.score>.2)return episodes[0].x.summary;
  const semantic=[...agent.semantic]
    .map(x=>({x,score:overlap(prompt,x)}))
    .sort((a,b)=>b.score-a.score);
  return semantic[0]?.score>.05?semantic[0].x:'';
}

function chooseAction(agent:CognitiveAgentState,prompt:string,tick:number){
  const q=clean(prompt,400);
  const recent=agent.actionHistory.slice(-4);
  const repeat=(a:CognitiveAgentAction)=>recent.filter(x=>x===a).length;
  const hasQuestion=/\?|\b(como|por que|porque|qual|quem|onde|quando|what|why|how)\b/i.test(q);
  const memoryCue=recall(agent,q);
  const candidates:Array<{action:CognitiveAgentAction;score:number;focus:string}>=[
    {action:'observe',score:.42+agent.traits.caution*.2+agent.attention*.2-repeat('observe')*.12,focus:'detalhes concretos do estímulo atual'},
    {action:'recall',score:(memoryCue?.2:0)+.26+agent.needs.certainty*.22-repeat('recall')*.13,focus:memoryCue||'procurar uma memória relacionada'},
    {action:'plan',score:.31+agent.traits.persistence*.34+(hasQuestion?.14:0)-repeat('plan')*.12,focus:'próxima ação coerente com o objetivo atual'},
    {action:'explore',score:.24+agent.traits.curiosity*.24+agent.traits.noveltySeeking*.24+agent.needs.novelty*.22-repeat('explore')*.18,focus:'uma hipótese ou pista ainda não examinada'},
    {action:'speak',score:.2+agent.traits.sociability*.26+(hasQuestion?.22:0)-repeat('speak')*.16,focus:'formular uma resposta pública curta e verificável'},
    {action:'wait',score:.1+agent.needs.rest*.48+agent.uncertainty*.08-repeat('wait')*.08,focus:'não agir até surgir informação suficiente'},
    {action:'reconsider',score:.18+agent.uncertainty*.3+agent.traits.caution*.16-repeat('reconsider')*.1,focus:'testar se o enquadramento atual está errado'}
  ];
  const temperature=.1+agent.traits.noveltySeeking*.12;
  return candidates
    .map((c,i)=>({...c,rank:c.score+gumbel(hashString(agent.id+'|'+tick+'|'+i+'|'+q))*temperature}))
    .sort((a,b)=>b.rank-a.rank)[0];
}

function report(agent:CognitiveAgentState){
  const recallText=agent.recalledMemory?' Memória evocada: '+agent.recalledMemory:' Nenhuma memória específica dominou a escolha.';
  return [
    'Foco: '+agent.currentFocus+'.',
    'Objetivo: '+agent.currentGoal+'.',
    'Ação selecionada: '+agent.currentAction+'.',
    'Confiança '+Math.round(agent.confidence*100)+'%; incerteza '+Math.round(agent.uncertainty*100)+'%.',
    recallText
  ].join(' ');
}

export function advanceCognitivePopulation(
  previous:CognitivePopulationState|undefined,
  prompt:string,
  scene='Cognitive Lab'
):CognitivePopulationState{
  const prev=previous?.version===1?previous:createCognitivePopulation();
  const nextTick=prev.tick+1;
  const q=clean(prompt,500);
  const agents=prev.agents.map(agent=>{
    const recalledMemory=recall(agent,q);
    const choice=chooseAction(agent,q,nextTick);
    const noveltyGain=choice.action==='explore'?.13:choice.action==='observe'?.06:.02;
    const certaintyGain=choice.action==='recall'||choice.action==='plan'?.08:.02;
    const restDelta=choice.action==='wait'?-.18:.025;
    const socialDelta=choice.action==='speak'?-.1:.018;
    const attention=clamp(agent.attention*.7+.16+(choice.action==='observe'?.1:0));
    const uncertainty=clamp(agent.uncertainty*.72+(recalledMemory?-.04:.07)+(choice.action==='reconsider'?.08:0));
    const confidence=clamp(agent.confidence*.74+(1-uncertainty)*.2+(choice.action==='plan'?.05:0));
    const currentGoal=hasGoalCue(q)?clean(q,140):agent.currentGoal;
    const episodic=[...agent.episodic,episode(
      agent.id+'-'+nextTick,
      q,
      'Percebeu "'+clean(q,100)+'" e escolheu '+choice.action+' com foco em '+choice.focus+'.',
      .46+attention*.3,
      .5
    )].slice(-48);
    const next:CognitiveAgentState={
      ...agent,
      tick:agent.tick+1,
      needs:{
        rest:clamp(agent.needs.rest+restDelta),
        social:clamp(agent.needs.social+socialDelta),
        novelty:clamp(agent.needs.novelty-noveltyGain+.025),
        certainty:clamp(agent.needs.certainty-certaintyGain+.02)
      },
      attention,uncertainty,confidence,currentGoal,
      currentAction:choice.action,
      currentFocus:choice.focus,
      recalledMemory,
      actionHistory:[...agent.actionHistory,choice.action].slice(-16),
      workingMemory:[q,...agent.workingMemory].filter(Boolean).slice(0,6),
      episodic
    };
    next.publicReport=report(next);
    return next;
  });
  return {version:1,tick:nextTick,agents,sharedScene:clean(scene,120)||'Cognitive Lab'};
}

function hasGoalCue(q:string){
  return /\b(objetivo|meta|quero|preciso|vamos|goal|need|want)\b/i.test(q);
}

export function reinforceCognitivePopulation(
  previous:CognitivePopulationState|undefined,
  input:{prompt:string;answer:string;reward:number}
):CognitivePopulationState{
  const prev=previous?.version===1?previous:createCognitivePopulation();
  const reward=clamp(input.reward);
  return {
    ...prev,
    agents:prev.agents.map(agent=>{
      const confidence=clamp(agent.confidence*.8+reward*.2);
      const uncertainty=clamp(agent.uncertainty*.82+(1-reward)*.18);
      const episodic=[...agent.episodic,episode(
        agent.id+'-out-'+prev.tick,
        input.prompt,
        'Resultado observado: '+clean(input.answer,150),
        .5+Math.abs(reward-.5)*.3,
        reward
      )].slice(-48);
      const next={...agent,confidence,uncertainty,episodic};
      next.publicReport=report(next);
      return next;
    })
  };
}

export function cognitivePopulationContext(population:CognitivePopulationState|undefined){
  const pop=population?.version===1?population:createCognitivePopulation();
  return [
    'SIMULATED HUMAN POPULATION — inspectable functional state; these are not real people and this is not hidden model chain-of-thought.',
    ...pop.agents.map(a=>a.name+': '+a.publicReport)
  ].join('\n');
}
