import {LAB_SCIENCE_BANNER,type NeuroControllerId} from '@/lib/simulation/cognitive-world-contract';
export {LAB_SCIENCE_BANNER};

export type LabSpecies=NeuroControllerId;
export type LabTaskId=
  |'fly-odor-plume'|'fly-optomotor'|'fly-orientation'|'fly-gap-crossing'
  |'mouse-visual-discrimination'|'mouse-simple-maze'|'mouse-circuit-probe'
  |'macaque-fixation'|'macaque-visual-search'|'macaque-reach'
  |'human-h01-local-stimulation'|'human-column-model'|'human-local-circuit-probe';

export interface LabTaskDefinition{
  id:LabTaskId;
  species:LabSpecies;
  label:string;
  scope:string;
  calibrationTarget:string;
  forbiddenInterpretation:string;
}

export const LAB_TASKS:readonly LabTaskDefinition[]=[
  {id:'fly-odor-plume',species:'fly',label:'Odor plume',scope:'olfação/orientação abstrata',calibrationTarget:'trajetória e escolha publicadas quando disponíveis',forbiddenInterpretation:'não prova comportamento integral da mosca'},
  {id:'fly-optomotor',species:'fly',label:'Optomotor response',scope:'resposta visual fechada',calibrationTarget:'curva estímulo→resposta',forbiddenInterpretation:'não equivale a visão natural completa'},
  {id:'fly-orientation',species:'fly',label:'Orientation',scope:'orientação angular',calibrationTarget:'erro angular/latência',forbiddenInterpretation:'não implica consciência espacial'},
  {id:'fly-gap-crossing',species:'fly',label:'Gap crossing',scope:'decisão locomotora simplificada',calibrationTarget:'taxa de tentativa/sucesso',forbiddenInterpretation:'não é biomecânica completa'},
  {id:'mouse-visual-discrimination',species:'mouse',label:'Visual discrimination',scope:'circuitos visuais/mesoscale',calibrationTarget:'acurácia/curva psicométrica quando disponível',forbiddenInterpretation:'MICrONS não é cérebro inteiro'},
  {id:'mouse-simple-maze',species:'mouse',label:'Simple maze',scope:'memória espacial abstrata',calibrationTarget:'tempo/erros de rota',forbiddenInterpretation:'não reproduz hipocampo inteiro'},
  {id:'mouse-circuit-probe',species:'mouse',label:'Circuit probe',scope:'subcircuito cortical',calibrationTarget:'taxa de disparo/PSTH',forbiddenInterpretation:'não extrapolar para animal inteiro'},
  {id:'macaque-fixation',species:'macaque',label:'Fixation',scope:'atenção visual simplificada',calibrationTarget:'latência/estabilidade',forbiddenInterpretation:'atlas não é conectoma sináptico'},
  {id:'macaque-visual-search',species:'macaque',label:'Visual search',scope:'hierarquia visual/atenção proxy',calibrationTarget:'tempo de busca/erros',forbiddenInterpretation:'não alegar cognição de macaque completa'},
  {id:'macaque-reach',species:'macaque',label:'Reach',scope:'workspace 2D/3D simplificado',calibrationTarget:'trajetória/erro final',forbiddenInterpretation:'não é sistema motor real completo'},
  {id:'human-h01-local-stimulation',species:'human',label:'H01 local stimulation',scope:'fragmento cortical H01',calibrationTarget:'resposta local do modelo e dados publicados compatíveis',forbiddenInterpretation:'H01 não é mente nem cérebro humano inteiro'},
  {id:'human-column-model',species:'human',label:'Column/area model',scope:'modelo cortical local',calibrationTarget:'FI/PSTH e dinâmica local',forbiddenInterpretation:'não extrapolar para whole-brain'},
  {id:'human-local-circuit-probe',species:'human',label:'Local circuit probe',scope:'circuito local derivado/modelado',calibrationTarget:'taxas e resposta temporal',forbiddenInterpretation:'sem claim clínico ou de consciência'}
] as const;

export interface LabTrialConfig{
  version:1;
  species:LabSpecies;
  task:LabTaskId;
  seed:number;
  dataOnly:boolean;
  dtMs:number;
  durationMs:number;
  model:'lif'|'adex'|'hh'|'external';
  datasetIds:string[];
}

export interface LabTrialProvenance{
  banner:string;
  species:LabSpecies;
  task:LabTaskDefinition;
  dataOnly:boolean;
  model:string;
  seed:number;
  dtMs:number;
  durationMs:number;
  datasetIds:string[];
  dynamicModelStatement:string;
  connectivityStatement:string;
  limitations:string[];
}

export const LAB_RELEASE_REVIEW_CHECKLIST=[
  'tarefa compatível com a espécie/dados',
  'unidades físicas visíveis',
  'seed/dt/duração/modelo registrados',
  'proveniência e dataset/versionamento presentes',
  'dinâmica modelada separada de conectividade medida',
  'baseline/controle negativo quando aplicável',
  'claim de whole-brain ausente quando não suportado',
  'claim clínico/consciência ausente',
  'limitações publicadas',
  'resultado reproduzível sem depender de LLM'
] as const;

export function labTask(id:LabTaskId){
  const task=LAB_TASKS.find(x=>x.id===id);
  if(!task)throw new Error('Lab task desconhecida: '+id);
  return task;
}

export function assertLabTaskCompatible(species:LabSpecies,taskId:LabTaskId){
  const task=labTask(taskId);
  if(task.species!==species)throw new Error('Tarefa '+taskId+' não é compatível com '+species+'.');
  return task;
}

export function buildLabTrialProvenance(config:LabTrialConfig):LabTrialProvenance{
  const task=assertLabTaskCompatible(config.species,config.task);
  if(config.dtMs<=0||config.durationMs<=0)throw new Error('dt/duração devem ser positivos.');
  return{
    banner:LAB_SCIENCE_BANNER,
    species:config.species,
    task,
    dataOnly:config.dataOnly,
    model:config.model,
    seed:config.seed,
    dtMs:config.dtMs,
    durationMs:config.durationMs,
    datasetIds:[...config.datasetIds],
    dynamicModelStatement:'A dinâmica neuronal é calculada/modelada pelo solver selecionado; conectividade publicada não contém por si só a dinâmica completa.',
    connectivityStatement:config.species==='fly'
      ?'FlyWire pode fornecer conectividade whole-brain como referência; isso não torna sensores, corpo, química e dinâmica biologicamente completos.'
      :config.species==='human'
        ?'H01 fornece fragmento cortical local, nunca whole-brain ou mente humana.'
        :config.species==='mouse'
          ?'MICrONS/Allen fornecem cobertura cortical/mesoscale, não um cérebro inteiro em resolução sináptica.'
          :'Atlas/projectome de macaque fornece organização/projeções, não um conectoma sináptico whole-brain.',
    limitations:[
      task.forbiddenInterpretation,
      config.dataOnly?'Modo data-only: priors inventados devem permanecer desativados.':'Priors modelados podem existir e precisam ser marcados como proxy/modelados.',
      'Resultado do Lab não deve ser transformado em claim clínico, consciência ou mente.'
    ]
  };
}

export function isMinecraftTaskAllowedInLab(taskName:string){
  return !/minecraft|craft|nether|ender|survival|creeper|village/i.test(taskName);
}

export function assertNoMinecraftTaskInLab(taskName:string){
  if(!isMinecraftTaskAllowedInLab(taskName))throw new Error('Minecraft pertence ao Cognitive World, não ao Neuroscience Lab científico.');
}
