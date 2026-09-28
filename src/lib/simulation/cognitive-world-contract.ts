export const MINECRAFT_ARENA_BANNER =
  'Arena de inteligência / closed-loop — não simulação biológica completa.';

export const LAB_SCIENCE_BANNER =
  'Fidelidade científica por espécie — tarefas limitadas aos dados disponíveis.';

export type NeuroControllerId='human'|'mouse'|'macaque'|'fly';
export type BenchmarkControllerId=NeuroControllerId|'random'|'heuristic';
export type AbstractionLevel=1|2|3|4;
export type CoverageStatus='present'|'proxy'|'absent';

export interface CoverageSubsystem{
  id:'vision'|'memory'|'motor'|'valence';
  label:string;
  status:CoverageStatus;
  evidence:string;
}

export interface ControllerCoverageSheet{
  id:NeuroControllerId;
  label:string;
  shortLabel:string;
  evidenceCoverageIndex:number;
  evidenceCoverageBasis:string;
  abstractionLevel:AbstractionLevel;
  abstractionLabel:string;
  summary:string;
  present:string[];
  absent:string[];
  proxy:string[];
  subsystems:CoverageSubsystem[];
  datasets:string[];
  whyNotComplete:string;
}

const sheet=(value:ControllerCoverageSheet)=>Object.freeze(value);

export const CONTROLLER_COVERAGE:Record<NeuroControllerId,ControllerCoverageSheet>={
  human:sheet({
    id:'human',
    label:'H01-informed Human Controller',
    shortLabel:'Human · H01-informed',
    evidenceCoverageIndex:25,
    evidenceCoverageBasis:'Índice interno de subsistemas com evidência/proxy documentado; NÃO é porcentagem do cérebro humano reconstruído.',
    abstractionLevel:4,
    abstractionLabel:'L4 · graph-informed + spiking toy',
    summary:'H01 parcial · controlador cortical',
    present:['fragmento cortical H01 como evidência estrutural','solver LIF toy/browser','planejamento heurístico/software'],
    proxy:['funções fora do fragmento H01','planejamento de alto nível','mapeamento sensorimotor do jogo'],
    absent:['whole-brain humano','memórias biológicas','corpo/sensores humanos calibrados','validação clínica'],
    subsystems:[
      {id:'vision',label:'Visão',status:'proxy',evidence:'sensorium do jogo + priors corticais; não retina/córtex visual humano completo'},
      {id:'memory',label:'Memória',status:'proxy',evidence:'memória de software; não memória extraída do tecido H01'},
      {id:'motor',label:'Motor',status:'proxy',evidence:'Action API do Minecraft; não sistema motor humano'},
      {id:'valence',label:'Valência',status:'absent',evidence:'sem circuito humano biologicamente calibrado'}
    ],
    datasets:['H01 human cortex fragment'],
    whyNotComplete:'H01 cobre um fragmento cortical microscópico, não um cérebro humano inteiro; o restante do controller é modelado ou proxy.'
  }),
  mouse:sheet({
    id:'mouse',
    label:'MICrONS/Allen-informed Mouse Controller',
    shortLabel:'Mouse · MICrONS/Allen-informed',
    evidenceCoverageIndex:38,
    evidenceCoverageBasis:'Índice interno de subsistemas com evidência/proxy documentado; NÃO é porcentagem do cérebro do camundongo reconstruído.',
    abstractionLevel:4,
    abstractionLabel:'L4 · graph/mesoscale-informed + spiking toy',
    summary:'MICrONS + Allen · cortical/mesoscale',
    present:['evidência cortical MICrONS','conectividade mesoscale Allen','solver LIF toy/browser'],
    proxy:['memória espacial do agente','integração visuomotora do jogo'],
    absent:['whole-brain sináptico de camundongo','corpo murino biomecânico','neuromodulação completa'],
    subsystems:[
      {id:'vision',label:'Visão',status:'present',evidence:'priors corticais visuais/mesoscale; ainda simplificados no controller'},
      {id:'memory',label:'Memória',status:'proxy',evidence:'mapa espacial do software, não circuito hipocampal completo'},
      {id:'motor',label:'Motor',status:'proxy',evidence:'Action API do jogo, não sistema motor murino completo'},
      {id:'valence',label:'Valência',status:'absent',evidence:'sem circuito completo calibrado'}
    ],
    datasets:['MICrONS cortical mm3','Allen Mouse Connectivity Atlas'],
    whyNotComplete:'MICrONS cobre tecido cortical e Allen fornece conectividade mesoscale; nenhum dos dois representa o cérebro inteiro em resolução sináptica.'
  }),
  macaque:sheet({
    id:'macaque',
    label:'Atlas/projectome-informed Macaque Controller',
    shortLabel:'Macaque · atlas/projectome-informed',
    evidenceCoverageIndex:30,
    evidenceCoverageBasis:'Índice interno de subsistemas com evidência/proxy documentado; NÃO é porcentagem do cérebro de macaque reconstruído.',
    abstractionLevel:2,
    abstractionLabel:'L2 · mesoscale/atlas-informed',
    summary:'Atlas + projectome · proxy',
    present:['atlas cortical espacial/transcriptômico','projectomes/priores de primata'],
    proxy:['atenção visual','reach simplificado','integração PFC no controller'],
    absent:['conectoma sináptico whole-brain','dinâmica neuronal calibrada por área','corpo de macaque completo'],
    subsystems:[
      {id:'vision',label:'Visão',status:'present',evidence:'atlas/priores de hierarquia visual'},
      {id:'memory',label:'Memória',status:'proxy',evidence:'estado de software com priors de PFC'},
      {id:'motor',label:'Motor',status:'proxy',evidence:'reach/Action API abstrato'},
      {id:'valence',label:'Valência',status:'absent',evidence:'sem circuito completo calibrado'}
    ],
    datasets:['macaque cortical spatial/transcriptomic atlas','PFC projectome priors'],
    whyNotComplete:'O atlas/projectome descreve organização e projeções, não um conectoma sináptico completo nem um cérebro executável.'
  }),
  fly:sheet({
    id:'fly',
    label:'FlyWire-informed Fly Controller',
    shortLabel:'Fly · FlyWire-informed',
    evidenceCoverageIndex:62,
    evidenceCoverageBasis:'Índice interno de subsistemas com evidência/proxy documentado; NÃO é porcentagem de dinâmica biológica reproduzida.',
    abstractionLevel:4,
    abstractionLabel:'L4 · whole-brain graph-informed + modelled dynamics',
    summary:'FlyWire whole-brain connectivity · dinâmica ainda modelada',
    present:['grafo de conectividade whole-brain FlyWire como referência','tipos/regiões quando disponíveis','closed-loop rápido'],
    proxy:['dinâmica neuronal','sensores do Minecraft','política motora'],
    absent:['dinâmica eletrofisiológica completa','corpo/sensores calibrados completos','neuromodulação/metabolismo completos'],
    subsystems:[
      {id:'vision',label:'Visão',status:'proxy',evidence:'FOV/observação do jogo; óptica composta física ainda não calibrada'},
      {id:'memory',label:'Memória',status:'proxy',evidence:'workspace/software; circuitos de memória ainda simplificados'},
      {id:'motor',label:'Motor',status:'proxy',evidence:'policy rápida orientada pelo grafo, sem corpo biomecânico completo'},
      {id:'valence',label:'Valência',status:'proxy',evidence:'saliência/ameaça modeladas, não neuromodulação completa'}
    ],
    datasets:['FlyWire FAFB v783'],
    whyNotComplete:'A conectividade é muito mais completa que nas outras espécies, mas conectoma não fornece sozinho dinâmica, sensores, corpo, estados químicos ou comportamento.'
  })
};

export type ActionType='move'|'jump'|'craft'|'attack'|'interact'|'wait';
export interface ControllerAction{
  type:ActionType;
  dx?:-1|0|1;
  dz?:-1|0|1;
  target?:string;
  recipe?:string;
  rationaleCode?:string;
}

export interface SensorEntity{
  id:string;
  kind:string;
  hostile:boolean;
  dx:number;
  dz:number;
}

export interface SensoriumObservation{
  tick:number;
  seed:number;
  position:{x:number;y:number;z:number;dimension:string};
  hp:number;
  hunger:number;
  inventory:Record<string,number>;
  visibleGrid:Array<{dx:number;dz:number;surface:string;height:number}>;
  entities:SensorEntity[];
  structures:string[];
  goal:string;
  partialObservability:number;
  actionDelayTicks:number;
}

export interface DecisionTrace{
  tick:number;
  observationDigest:string;
  memoryWrites:string[];
  plannerCandidate?:ControllerAction;
  reactiveCandidate?:ControllerAction;
  selectedBy:'planner'|'reactive'|'baseline';
  action:ControllerAction;
}

export interface CognitiveController{
  readonly id:BenchmarkControllerId;
  readonly label:string;
  readonly mode:'neuro-informed'|'baseline';
  reset(seed:number):void;
  step(observation:SensoriumObservation):ControllerAction;
  trace?():DecisionTrace|undefined;
}

export interface BenchmarkTask{
  id:'explore'|'remember-base'|'find-food'|'avoid-threat'|'craft-minimum'|'long-path'|'multi-objective'|'memory-probe'|'distractor'|'planning-3-step'|'cooperation'|'competition';
  family:'navigation'|'memory'|'survival'|'planning'|'multi-agent';
  label:string;
  maxActions:number;
  optional?:boolean;
}

export const COGNITIVE_BENCHMARK_TASKS:readonly BenchmarkTask[]=[
  {id:'explore',family:'navigation',label:'Explorar área desconhecida',maxActions:160},
  {id:'remember-base',family:'memory',label:'Retornar à base',maxActions:180},
  {id:'find-food',family:'survival',label:'Encontrar comida',maxActions:140},
  {id:'avoid-threat',family:'survival',label:'Evitar ameaça',maxActions:120},
  {id:'craft-minimum',family:'planning',label:'Craft mínimo',maxActions:180},
  {id:'long-path',family:'navigation',label:'Navegação de longo alcance',maxActions:240},
  {id:'multi-objective',family:'planning',label:'Objetivos concorrentes',maxActions:260},
  {id:'memory-probe',family:'memory',label:'Recurso oculto e retorno',maxActions:220},
  {id:'distractor',family:'memory',label:'Distratores irrelevantes',maxActions:200},
  {id:'planning-3-step',family:'planning',label:'Craft em 3+ passos',maxActions:280},
  {id:'cooperation',family:'multi-agent',label:'Objetivo compartilhado',maxActions:300},
  {id:'competition',family:'multi-agent',label:'Recurso escasso',maxActions:240,optional:true}
] as const;

export interface ExperimentSpec{
  version:1;
  world:'minecraft-cognitive-world';
  seed:number;
  controller:BenchmarkControllerId;
  task:BenchmarkTask['id'];
  actionBudget:number;
  observationNoise:number;
  actionDelayTicks:number;
  llmAssist:boolean;
  scientificMode:boolean;
  disclaimer:string;
}

export interface ReplayEvent{
  tick:number;
  observationDigest:string;
  action:ControllerAction;
  reward:number;
  events:string[];
}

export interface RunMetrics{
  steps:number;
  deaths:number;
  itemsCollected:number;
  distance:number;
  replanCount:number;
  objectiveReached:boolean;
  timeToObjectiveSteps:number|null;
  cooperationEvents:number;
}

export interface ExperimentCheckpoint{
  spec:ExperimentSpec;
  tick:number;
  metrics:RunMetrics;
  replay:ReplayEvent[];
  environmentState:unknown;
  controllerState?:unknown;
}

export interface StepOutcome{
  observation:SensoriumObservation;
  reward:number;
  events:string[];
  done:boolean;
  objectiveReached:boolean;
  distanceDelta:number;
  itemsDelta:number;
  death:boolean;
  replanned:boolean;
  cooperationEvent:boolean;
}

export interface HeadlessEnvironment{
  reset(seed:number,task:BenchmarkTask['id']):SensoriumObservation;
  apply(action:ControllerAction):StepOutcome;
  snapshot():unknown;
  restore?(state:unknown):SensoriumObservation;
}

export interface ExperimentResult{
  spec:ExperimentSpec;
  metrics:RunMetrics;
  replay:ReplayEvent[];
  coverage:ControllerCoverageSheet|null;
  interpretation:'operational-intelligence-benchmark';
  disclaimer:string;
}

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export function defaultExperimentSpec(
  controller:BenchmarkControllerId,
  task:BenchmarkTask['id']='explore',
  seed=827361
):ExperimentSpec{
  const def=COGNITIVE_BENCHMARK_TASKS.find(x=>x.id===task)!;
  return{
    version:1,
    world:'minecraft-cognitive-world',
    seed,
    controller,
    task,
    actionBudget:def.maxActions,
    observationNoise:0,
    actionDelayTicks:0,
    llmAssist:false,
    scientificMode:false,
    disclaimer:MINECRAFT_ARENA_BANNER
  };
}

export function runHeadlessExperiment(
  specInput:ExperimentSpec,
  controller:CognitiveController,
  environment:HeadlessEnvironment
):ExperimentResult{
  const spec:{[K in keyof ExperimentSpec]:ExperimentSpec[K]}={...specInput};
  spec.actionBudget=Math.max(1,Math.floor(spec.actionBudget));
  spec.observationNoise=clamp(spec.observationNoise,0,1);
  controller.reset(spec.seed);
  let observation=environment.reset(spec.seed,spec.task);
  const replay:ReplayEvent[]=[];
  const metrics:RunMetrics={steps:0,deaths:0,itemsCollected:0,distance:0,replanCount:0,objectiveReached:false,timeToObjectiveSteps:null,cooperationEvents:0};

  for(let i=0;i<spec.actionBudget;i++){
    const action=controller.step(observation);
    const outcome=environment.apply(action);
    metrics.steps++;
    metrics.deaths+=outcome.death?1:0;
    metrics.itemsCollected+=outcome.itemsDelta;
    metrics.distance+=outcome.distanceDelta;
    metrics.replanCount+=outcome.replanned?1:0;
    metrics.cooperationEvents+=outcome.cooperationEvent?1:0;
    if(outcome.objectiveReached&&!metrics.objectiveReached){
      metrics.objectiveReached=true;
      metrics.timeToObjectiveSteps=metrics.steps;
    }
    replay.push({
      tick:observation.tick,
      observationDigest:digestObservation(observation),
      action,
      reward:outcome.reward,
      events:[...outcome.events]
    });
    observation=outcome.observation;
    if(outcome.done)break;
  }

  return{
    spec,
    metrics,
    replay,
    coverage:isNeuroController(spec.controller)?CONTROLLER_COVERAGE[spec.controller]:null,
    interpretation:'operational-intelligence-benchmark',
    disclaimer:MINECRAFT_ARENA_BANNER
  };
}

export function checkpointExperiment(
  result:ExperimentResult,
  environmentState:unknown,
  controllerState?:unknown
):ExperimentCheckpoint{
  return{
    spec:{...result.spec},
    tick:result.metrics.steps,
    metrics:{...result.metrics},
    replay:[...result.replay],
    environmentState,
    controllerState
  };
}

export function digestObservation(obs:SensoriumObservation){
  const inv=Object.entries(obs.inventory).filter(([,n])=>n>0).sort(([a],[b])=>a.localeCompare(b)).slice(0,10);
  return JSON.stringify({
    t:obs.tick,p:obs.position,hp:Math.round(obs.hp*10)/10,h:Math.round(obs.hunger*10)/10,
    i:inv,e:obs.entities.map(x=>[x.kind,x.hostile,x.dx,x.dz]).slice(0,12),g:obs.goal
  });
}

export function experimentSpecToYaml(spec:ExperimentSpec){
  return [
    'version: 1',
    'world: minecraft-cognitive-world',
    'seed: '+spec.seed,
    'controller: '+spec.controller,
    'task: '+spec.task,
    'actionBudget: '+spec.actionBudget,
    'observationNoise: '+spec.observationNoise,
    'actionDelayTicks: '+spec.actionDelayTicks,
    'llmAssist: '+String(spec.llmAssist),
    'scientificMode: '+String(spec.scientificMode),
    'disclaimer: "'+spec.disclaimer.replace(/"/g,'\\\"')+'"'
  ].join('\n');
}

export function experimentSpecFromYaml(yaml:string):ExperimentSpec{
  const map=new Map<string,string>();
  for(const raw of yaml.split(/\r?\n/)){
    const line=raw.trim();
    if(!line||line.startsWith('#'))continue;
    const i=line.indexOf(':');
    if(i<0)continue;
    map.set(line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^["']|["']$/g,''));
  }
  const controller=(map.get('controller')||'heuristic') as BenchmarkControllerId;
  const task=(map.get('task')||'explore') as BenchmarkTask['id'];
  if(!['human','mouse','macaque','fly','random','heuristic'].includes(controller))throw new Error('controller inválido');
  if(!COGNITIVE_BENCHMARK_TASKS.some(x=>x.id===task))throw new Error('task inválida');
  const base=defaultExperimentSpec(controller,task,Number(map.get('seed')||827361));
  return{
    ...base,
    actionBudget:Number(map.get('actionBudget')||base.actionBudget),
    observationNoise:Number(map.get('observationNoise')||0),
    actionDelayTicks:Number(map.get('actionDelayTicks')||0),
    llmAssist:(map.get('llmAssist')||'false')==='true',
    scientificMode:(map.get('scientificMode')||'false')==='true',
    disclaimer:MINECRAFT_ARENA_BANNER
  };
}

export function exportCoverageRunJson(controller:NeuroControllerId,runId:string,performanceHistory:number[]=[]){
  return JSON.stringify({
    schema:'predictlm-controller-coverage-v1',
    runId,
    controller:CONTROLLER_COVERAGE[controller],
    performanceHistory:performanceHistory.map((score,index)=>({episode:index+1,taskScore:score})),
    note:'Performance pode mudar com treino; o índice de evidência só muda quando fontes/modelos documentados mudam. Não interpretar treino como aumento de cobertura biológica.'
  },null,2);
}

export function compareControllerRuns(results:ExperimentResult[]){
  const byController=new Map<BenchmarkControllerId,{runs:number;successes:number;steps:number;distance:number;items:number}>();
  for(const result of results){
    const cur=byController.get(result.spec.controller)||{runs:0,successes:0,steps:0,distance:0,items:0};
    cur.runs++;
    cur.successes+=result.metrics.objectiveReached?1:0;
    cur.steps+=result.metrics.steps;
    cur.distance+=result.metrics.distance;
    cur.items+=result.metrics.itemsCollected;
    byController.set(result.spec.controller,cur);
  }
  return [...byController.entries()].map(([controller,v])=>({
    controller,
    runs:v.runs,
    successRate:v.runs?v.successes/v.runs:0,
    meanSteps:v.runs?v.steps/v.runs:0,
    meanDistance:v.runs?v.distance/v.runs:0,
    meanItems:v.runs?v.items/v.runs:0,
    label:isNeuroController(controller)?CONTROLLER_COVERAGE[controller].label:controller==='random'?'Random baseline':'Heuristic baseline',
    interpretation:'benchmark de controller; não ranking de espécie biológica'
  }));
}

export function isNeuroController(id:BenchmarkControllerId):id is NeuroControllerId{
  return id==='human'||id==='mouse'||id==='macaque'||id==='fly';
}

export function randomBaseline(seed=1):CognitiveController{
  let state=seed|0;
  const rand=()=>{state=(Math.imul(state,1664525)+1013904223)|0;return (state>>>0)/4294967296};
  return{
    id:'random',
    label:'Random baseline',
    mode:'baseline',
    reset(next){state=next|0},
    step(){
      const dirs:[-1|0|1,-1|0|1][]=[[1,0],[-1,0],[0,1],[0,-1],[0,0]];
      const [dx,dz]=dirs[Math.floor(rand()*dirs.length)];
      return dx===0&&dz===0?{type:'wait',rationaleCode:'random-wait'}:{type:'move',dx,dz,rationaleCode:'random-move'};
    }
  };
}

export function heuristicBaseline():CognitiveController{
  return{
    id:'heuristic',
    label:'Heuristic baseline',
    mode:'baseline',
    reset(){},
    step(obs){
      const hostile=obs.entities.find(x=>x.hostile&&Math.abs(x.dx)+Math.abs(x.dz)<=3);
      if(hostile){
        const dx=(hostile.dx===0?0:hostile.dx>0?-1:1) as -1|0|1;
        const dz=(hostile.dz===0?0:hostile.dz>0?-1:1) as -1|0|1;
        return{type:'move',dx,dz,rationaleCode:'avoid-near-threat'};
      }
      if(obs.hunger<8)return{type:'interact',target:'food',rationaleCode:'seek-food'};
      return{type:'move',dx:1,dz:0,rationaleCode:'explore-east'};
    }
  };
}

export const SIMULATION_FEATURE_FLAGS={
  minecraftWorld:process.env.NEXT_PUBLIC_ENABLE_MINECRAFT_WORLD!=='0',
  neuroscienceLab:process.env.NEXT_PUBLIC_ENABLE_NEURO_LAB!=='0'
} as const;
