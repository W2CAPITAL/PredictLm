export type NeuroCircuitId=
  |'sensory'|'salience'|'attention'|'workingMemory'|'episodicMemory'
  |'planning'|'inhibition'|'social'|'threat'|'curiosity'|'action';

export interface NeuroState{
  version:1;
  tick:number;
  arousal:number;
  valence:number;
  uncertainty:number;
  energy:number;
  stress:number;
  curiosity:number;
  socialNeed:number;
  confidence:number;
  focus:number;
  circuits:Record<NeuroCircuitId,number>;
  lastIntent:'chat'|'research'|'build'|'decision'|'social'|'safety'|'simulation'|'general';
  updatedAt:number;
}

type Stimulus={
  novelty:number;
  threat:number;
  social:number;
  planning:number;
  evidence:number;
  action:number;
  ambiguity:number;
  valence:number;
  intent:NeuroState['lastIntent'];
};

const STORAGE_KEY='predictlm-neurocore-v1';

const EDGES:Partial<Record<NeuroCircuitId,Array<[NeuroCircuitId,number]>>>={
  sensory:[['salience',.65],['attention',.25]],
  salience:[['attention',.55],['workingMemory',.35],['threat',.24]],
  attention:[['workingMemory',.55],['planning',.28],['action',.2]],
  workingMemory:[['planning',.62],['episodicMemory',.24],['inhibition',.18]],
  episodicMemory:[['planning',.34],['social',.18],['salience',.14]],
  planning:[['action',.62],['inhibition',.35],['workingMemory',.22]],
  inhibition:[['threat',-.35],['action',-.16],['salience',-.1]],
  social:[['salience',.22],['planning',.2],['action',.12]],
  threat:[['salience',.42],['inhibition',.4],['attention',.28],['action',-.14]],
  curiosity:[['attention',.4],['planning',.22],['episodicMemory',.18]],
  action:[]
};

function clamp(v:number,min=0,max=1){return Math.max(min,Math.min(max,v))}
function norm(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}
function sigmoid(v:number){return 1/(1+Math.exp(-v))}

export function createNeuroState():NeuroState{
  return {
    version:1,tick:0,arousal:.34,valence:.52,uncertainty:.45,energy:.72,stress:.18,curiosity:.58,socialNeed:.35,confidence:.55,focus:.52,
    circuits:{sensory:.28,salience:.34,attention:.42,workingMemory:.38,episodicMemory:.32,planning:.4,inhibition:.44,social:.3,threat:.16,curiosity:.56,action:.36},
    lastIntent:'general',updatedAt:Date.now()
  };
}

function classifyStimulus(prompt:string):Stimulus{
  const q=norm(prompt);
  const threat=/\b(risco|perigo|amea|fraude|golpe|phishing|malware|crime|abuso|assed|coerc|vulnerab|seguranc|security|dano|fraud)\b/.test(q)?1:0;
  const social=/\b(pessoa|humano|relacion|amig|parceir|famil|equipe|social|sentimento|emoc|confi|manipul|persuas|humilh|amor|odio|raiva)\b/.test(q)?1:0;
  const planning=/\b(crie|criar|construa|fa[cç]a|planej|arquitet|implementar|build|app|sistema|projeto|integrar|corrigir|melhorar)\b/.test(q)?1:0;
  const evidence=/\b(pesquis|fonte|prova|evidenc|verifique|confirme|estudo|artigo|dado|estatistic|research)\b/.test(q)?1:0;
  const decision=/\b(decid|escolh|vale a pena|devo|melhor|compar|certeza|prioriz|recomenda)\b/.test(q)?1:0;
  const simulation=/\b(simul|mundo|personagem|vida artificial|agente vivo|ambiente|sandbox)\b/.test(q)?1:0;
  const question=(prompt.match(/\?/g)||[]).length;
  const ambiguity=Math.min(1,(question>1?.5:0)+(/\b(talvez|acho|nao sei|não sei|incerto|duvida|dúvida)\b/.test(q)?.45:0));
  const novelty=Math.min(1,.25+(new Set(q.split(/[^a-z0-9]+/).filter(x=>x.length>4)).size/28));
  const positive=/\b(bom|otimo|ótimo|gosto|feliz|sucesso|melhorou|funciona)\b/.test(q);
  const negative=/\b(ruim|erro|quebrad|falha|odio|ódio|raiva|medo|pior|problema)\b/.test(q);
  const intent:NeuroState['lastIntent']=simulation?'simulation':threat?'safety':social?'social':planning?'build':evidence?'research':decision?'decision':q?'chat':'general';
  return {novelty,threat,social,planning,evidence,action:planning||decision?1:.25,ambiguity,valence:positive?1:negative?0:.5,intent};
}

function circuitExternal(id:NeuroCircuitId,s:Stimulus,state:NeuroState){
  if(id==='sensory')return .28+.32*s.novelty;
  if(id==='salience')return .2+.38*Math.max(s.threat,s.social,s.planning,s.evidence);
  if(id==='attention')return .2+.28*s.evidence+.2*s.planning+.15*s.threat;
  if(id==='workingMemory')return .22+.35*s.planning+.24*s.evidence+.12*s.ambiguity;
  if(id==='episodicMemory')return .2+.16*s.social+.12*s.evidence;
  if(id==='planning')return .18+.44*s.planning+.28*s.action+.18*s.evidence;
  if(id==='inhibition')return .28+.32*s.threat+.2*s.ambiguity;
  if(id==='social')return .18+.55*s.social;
  if(id==='threat')return .08+.62*s.threat+.16*state.stress;
  if(id==='curiosity')return .25+.46*s.novelty+.22*s.evidence;
  return .18+.42*s.action+.2*s.planning;
}

export function advanceNeuroState(previous:NeuroState|undefined,prompt:string):NeuroState{
  const prev=previous?.version===1?previous:createNeuroState();
  const stimulus=classifyStimulus(prompt);
  let circuits={...prev.circuits};

  for(let round=0;round<3;round++){
    const next={...circuits};
    for(const id of Object.keys(circuits) as NeuroCircuitId[]){
      let incoming=circuitExternal(id,stimulus,prev)*1.7-1.05;
      for(const [from,edges] of Object.entries(EDGES) as [NeuroCircuitId,Array<[NeuroCircuitId,number]>][]){
        for(const [to,weight] of edges||[])if(to===id)incoming+=(circuits[from]-.5)*weight*2;
      }
      next[id]=clamp(.58*circuits[id]+.42*sigmoid(incoming));
    }
    circuits=next;
  }

  const stress=clamp(prev.stress*.82+stimulus.threat*.22+stimulus.ambiguity*.08-circuits.inhibition*.07);
  const uncertainty=clamp(prev.uncertainty*.7+stimulus.ambiguity*.2+(1-circuits.workingMemory)*.08-(stimulus.evidence?circuits.attention*.08:0));
  const curiosity=clamp(prev.curiosity*.78+stimulus.novelty*.16+stimulus.evidence*.1-stress*.05);
  const energy=clamp(prev.energy*.992-.008+.012*(1-stress));
  const focus=clamp(.38*prev.focus+.34*circuits.attention+.28*circuits.inhibition);
  const confidence=clamp(prev.confidence*.74+(1-uncertainty)*.18+circuits.planning*.08);
  const socialNeed=clamp(prev.socialNeed*.86+stimulus.social*.14);
  const arousal=clamp(.36+.28*circuits.salience+.22*circuits.threat+.14*circuits.action);
  const valence=clamp(prev.valence*.8+stimulus.valence*.12+(1-stress)*.08);

  return {
    version:1,
    tick:prev.tick+1,
    arousal,valence,uncertainty,energy,stress,curiosity,socialNeed,confidence,focus,circuits,
    lastIntent:stimulus.intent,
    updatedAt:Date.now()
  };
}

export function dominantCircuits(state:NeuroState,limit=4){
  return (Object.entries(state.circuits) as [NeuroCircuitId,number][])
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit);
}

export function neuroCognitiveContext(prompt:string,state?:NeuroState){
  const current=state||advanceNeuroState(undefined,prompt);
  const dominant=dominantCircuits(current,4).map(([id,value])=>id+' '+Math.round(value*100)+'%').join(', ');
  const instructions=[
    'NEUROCORE — brain-inspired control layer, not biological consciousness.',
    'User intent remains the top-level goal. Never invent autonomous goals that compete with the user.',
    'Current dominant virtual circuits: '+dominant+'.',
    'Uncertainty '+Math.round(current.uncertainty*100)+'%; stress '+Math.round(current.stress*100)+'%; focus '+Math.round(current.focus*100)+'%; curiosity '+Math.round(current.curiosity*100)+'%.',
    'Use salience to keep the answer on the central subject; use inhibition to suppress irrelevant retrieved context and impulsive conclusions.',
    'Use working memory for the active constraints, episodic memory only for relevant prior context, planning for executable structure, and action only after verification.',
    current.circuits.threat>.55?'Threat circuit elevated: verify claims, permissions and irreversible actions; prefer defensive/reversible steps.':'Threat circuit normal: do not manufacture danger.',
    current.circuits.social>.55?'Social circuit elevated: separate observed behavior from inferred intent and apply the Human Adversarial Lens.':'Do not anthropomorphize or diagnose people without evidence.',
    current.circuits.curiosity>.62?'Curiosity elevated: explore one additional relevant hypothesis/source only if it can change the answer.':'Do not broaden the task unnecessarily.',
    current.uncertainty>.55?'Uncertainty elevated: state the specific unknown and avoid false certainty.':'Use calibrated confidence; certainty still requires evidence.',
    'This state is a control heuristic. Never claim it proves sentience, feelings, consciousness or a living biological mind.',
    'Do not expose private chain-of-thought; only let this control layer improve the final answer.'
  ];
  return instructions.join('\n');
}

export function readBrowserNeuroState(){
  if(typeof window==='undefined')return createNeuroState();
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return raw?.version===1?raw as NeuroState:createNeuroState();
  }catch{return createNeuroState()}
}

export function advanceBrowserNeuroState(prompt:string){
  const next=advanceNeuroState(readBrowserNeuroState(),prompt);
  if(typeof window!=='undefined'){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{}
  }
  return next;
}

export function advanceBrowserNeuroContext(prompt:string){
  const state=advanceBrowserNeuroState(prompt);
  return {state,context:neuroCognitiveContext(prompt,state)};
}
