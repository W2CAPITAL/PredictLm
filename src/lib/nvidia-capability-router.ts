export type NvidiaExecutionTarget='vercel-safe'|'remote-service'|'gpu-host'|'local-tooling';

export type NvidiaSkillCapability={
  id:string;
  target:NvidiaExecutionTarget;
  domain:string;
  purpose:string;
  improves:string[];
  requirements:string[];
};

export const NVIDIA_SKILL_CAPABILITIES:NvidiaSkillCapability[]=[
  {id:'rag-blueprint',target:'remote-service',domain:'rag',purpose:'deploy/configure/troubleshoot NVIDIA RAG Blueprint',improves:['retrieval quality','RAG architecture','operational reliability'],requirements:['Docker/Compose or Kubernetes/Helm','Python 3.11+','GPU tooling for self-hosted NIM']},
  {id:'rag-eval',target:'remote-service',domain:'rag',purpose:'filesystem RAG quality evaluation',improves:['retrieval evaluation','RAGAS quality gates','regression testing'],requirements:['reachable RAG services','Python 3.11+','NVIDIA_API_KEY for judge path']},
  {id:'aiq-research',target:'remote-service',domain:'research',purpose:'deep research through NVIDIA AI-Q backend',improves:['deep research','citations','async research jobs'],requirements:['reachable AI-Q backend']},
  {id:'aiq-deploy',target:'gpu-host',domain:'research',purpose:'deploy and validate AI-Q infrastructure',improves:['research backend reliability','deployment reproducibility'],requirements:['Docker/uv or Kubernetes','optional NVIDIA GPU depending backend']},
  {id:'accelerated-computing-cudf',target:'gpu-host',domain:'data',purpose:'GPU DataFrames and pandas acceleration',improves:['large ETL throughput','DataFrame performance'],requirements:['supported NVIDIA GPU','CUDA','workloads large enough to beat transfer overhead']},
  {id:'dali-dynamic-mode',target:'gpu-host',domain:'data',purpose:'imperative GPU data loading and preprocessing',improves:['media/data preprocessing throughput','GPU pipeline efficiency'],requirements:['NVIDIA DALI','CUDA-capable GPU for GPU operators']},
  {id:'cuopt-developer',target:'gpu-host',domain:'optimization',purpose:'develop and debug NVIDIA cuOpt',improves:['solver development','optimization tooling'],requirements:['NVIDIA GPU/CUDA','cuOpt source/dev environment']},
  {id:'cuopt-install',target:'gpu-host',domain:'optimization',purpose:'install and validate cuOpt',improves:['optimization runtime availability'],requirements:['NVIDIA GPU compute capability >= 7.0','CUDA 12/13']},
  {id:'cuopt-routing-api-python',target:'gpu-host',domain:'optimization',purpose:'VRP/TSP/PDP solving with cuOpt Python',improves:['routing optimization','fleet scheduling'],requirements:['cuOpt','NVIDIA GPU']},
  {id:'cuopt-server-api-python',target:'remote-service',domain:'optimization',purpose:'call or deploy cuOpt REST server',improves:['remote optimization service','routing/LP/MILP integration'],requirements:['GPU-backed cuOpt server']},
  {id:'cuopt-numerical-optimization-formulation',target:'vercel-safe',domain:'optimization',purpose:'LP/MILP/QP formulation guidance',improves:['problem formulation','optimization correctness'],requirements:[]},
  {id:'cudaq-guide',target:'gpu-host',domain:'quantum',purpose:'CUDA-Q setup, simulation and QPU workflow guidance',improves:['quantum workflow support'],requirements:['Python 3.10+','GPU optional for accelerated simulation']},
  {id:'deepstream-dev',target:'gpu-host',domain:'video',purpose:'DeepStream/TensorRT video analytics pipelines',improves:['real-time video analytics','zero-copy GPU processing'],requirements:['NVIDIA GPU','DeepStream SDK','CUDA/TensorRT']},
  {id:'data-designer',target:'local-tooling',domain:'data',purpose:'synthetic dataset generation workflows',improves:['training/eval dataset creation','structured synthetic data'],requirements:['Python 3.10+','Data Designer package']},
  {id:'skill-card-generator',target:'local-tooling',domain:'governance',purpose:'generate governance cards for existing skills',improves:['skill governance','reviewability','capability documentation'],requirements:['Python 3','jinja2']},
  {id:'omniverse-usd-performance-tuning',target:'gpu-host',domain:'simulation',purpose:'profile and optimize USD/Omniverse scenes',improves:['USD load time','GPU/system memory','3D FPS'],requirements:['Omniverse/Kit or USD Optimize runtime','typically NVIDIA GPU']},
  {id:'omniverse-cad-to-simready',target:'gpu-host',domain:'simulation',purpose:'CAD/source asset to SimReady workflow',improves:['simulation asset quality','USD validation','physics/material readiness'],requirements:['Omniverse stack','GPU for Content Agents/OVRTX stages']},
  {id:'omniverse-realtime-viewer',target:'gpu-host',domain:'simulation',purpose:'Omniverse real-time USD viewer workflows',improves:['3D viewer performance','streamed high-fidelity visualization'],requirements:['ovrtx/ovstream/OpenUSD','GPU for rendering path']},
  {id:'physical-ai-infrastructure-setup-and-resilient-scaling',target:'gpu-host',domain:'simulation',purpose:'Physical AI infrastructure deployment and scaling',improves:['GPU workload resilience','Kubernetes/NIM/OSMO operations'],requirements:['Kubernetes target','NVIDIA infrastructure credentials/tooling']},
  {id:'physical-ai-neural-reconstruction',target:'gpu-host',domain:'simulation',purpose:'NuRec/NRE neural reconstruction routing',improves:['3D neural reconstruction','sensor simulation assets'],requirements:['Linux x86_64','Ampere+ GPU','~24GB+ VRAM for documented downstream paths','Docker/NGC/HF access']},
  {id:'nemotron-customize',target:'gpu-host',domain:'training',purpose:'Nemotron curation/fine-tune/alignment/evaluation pipelines',improves:['model customization','evaluation','training provenance'],requirements:['Nemotron checkout','uv','GPU/profile depending selected step']},
  {id:'nemo-retriever',target:'remote-service',domain:'rag',purpose:'ingest/query documents with NeMo Retriever',improves:['document retrieval','multimodal ingestion','evidence formatting'],requirements:['local package or reachable Retriever service']}
];

function normalize(input:string){
  return input.toLowerCase().normalize('NFD').replace(/\p{M}/gu,' ');
}

export function nvidiaSkillsForPrompt(prompt:string,limit=6){
  const q=normalize(prompt);
  const tokens=q.split(/[^a-z0-9]+/).filter(x=>x.length>=3);
  const scored=NVIDIA_SKILL_CAPABILITIES.map(skill=>{
    let score=0;
    const id=normalize(skill.id);
    if(q.includes(id))score+=20;
    for(const token of id.split(/[^a-z0-9]+/).filter(x=>x.length>=4)){
      if(tokens.includes(token))score+=4;
    }
    const hay=normalize([skill.domain,skill.purpose,...skill.improves].join(' '));
    for(const token of tokens.filter(x=>x.length>=4)){
      if(hay.includes(token))score++;
    }

    // Intent boosts keep broad catalogs from hiding the specialized owner.
    if(skill.id==='omniverse-usd-performance-tuning'
      && /(?:usd|omniverse)/.test(q)
      && /(?:fps|performance|desempenho|memoria|memory|slow|otimiz)/.test(q))score+=30;
    if(skill.id==='deepstream-dev'&&/deepstream|video analytics|analytics de video/.test(q))score+=30;
    if(skill.id==='rag-eval'&&/rag/.test(q)&&/(?:eval|avali|qualidade|ragas|regress)/.test(q))score+=24;
    if(skill.id==='rag-blueprint'&&/rag/.test(q)&&/(?:deploy|config|arquitet|retriev|ingest|troubleshoot)/.test(q))score+=22;
    if(skill.id==='nemo-retriever'&&/(?:retriever|document|pdf|ingest|retriev)/.test(q))score+=18;
    if(skill.id==='accelerated-computing-cudf'&&/(?:pandas|dataframe|etl|cudf)/.test(q))score+=24;
    if(skill.id==='dali-dynamic-mode'&&/(?:dali|data loader|preprocess|decode)/.test(q))score+=24;
    if(/^cuopt-/.test(skill.id)&&/(?:cuopt|vrp|tsp|milp|linear program|roteir|routing|otimizacao)/.test(q))score+=18;

    return {skill,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.skill.id.localeCompare(b.skill.id));
  return scored.slice(0,Math.max(1,limit)).map(x=>x.skill);
}

export function nvidiaVercelBoundary(skill:NvidiaSkillCapability){
  if(skill.target==='vercel-safe')return 'Pode orientar/rodar lógica leve no Vercel, sem CUDA local.';
  if(skill.target==='remote-service')return 'Vercel pode atuar como cliente HTTP; o serviço pesado precisa existir fora do Vercel.';
  if(skill.target==='local-tooling')return 'Executa em workstation/CI apropriado; não é aceleração CUDA do runtime web.';
  return 'Requer host GPU/CUDA/Omniverse externo; não instalar como dependência de execução do Vercel.';
}

export function nvidiaCapabilityContext(prompt:string){
  const selected=nvidiaSkillsForPrompt(prompt,5);
  if(!selected.length)return '';
  return [
    'NVIDIA CAPABILITY ROUTER:',
    ...selected.map(skill=>[
      skill.id,
      skill.target,
      skill.purpose,
      nvidiaVercelBoundary(skill)
    ].join(' · '))
  ].join('\n');
}
