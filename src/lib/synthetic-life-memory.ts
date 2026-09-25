export type SyntheticLifeActor='human'|'fly'|'macaque';
export type SyntheticMemorySource='synthetic-biography'|'runtime';

export interface SyntheticLifetimeMemory{
  id:string;
  actor:SyntheticLifeActor;
  lifeStage:string;
  when:string;
  place:string;
  summary:string;
  valence:number;
  salience:number;
  source:SyntheticMemorySource;
}

export interface SyntheticMindState{
  version:1;
  actor:SyntheticLifeActor;
  identity:string;
  biographyLabel:'synthetic';
  tick:number;
  values:string[];
  currentGoal:string;
  publicThought:string;
  creativity:number;
  memories:SyntheticLifetimeMemory[];
  lastExperience:string;
}

export type SyntheticMindBundle=Record<SyntheticLifeActor,SyntheticMindState>;

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const clean=(v:string,max=180)=>String(v||'').replace(/\s+/g,' ').trim().slice(0,max);

function memory(
  actor:SyntheticLifeActor,id:string,lifeStage:string,when:string,place:string,
  summary:string,valence:number,salience:number
):SyntheticLifetimeMemory{
  return {id,actor,lifeStage,when,place,summary,valence,salience,source:'synthetic-biography'};
}

function biography(actor:SyntheticLifeActor):SyntheticLifetimeMemory[]{
  if(actor==='human')return [
    memory(actor,'h-01','infância','5 anos','bairro residencial','Aprendeu a desmontar brinquedos para entender como as peças funcionavam.',.72,.76),
    memory(actor,'h-02','infância','8 anos','parque','Passava tardes observando árvores, insetos e pessoas no parque e inventando histórias sobre elas.',.8,.7),
    memory(actor,'h-03','escola','11 anos','escola','Descobriu que gostava de resolver problemas de lógica e de ajudar colegas com tarefas difíceis.',.68,.73),
    memory(actor,'h-04','adolescência','14 anos','biblioteca','Encontrou livros de tecnologia e começou a imaginar projetos próprios.',.83,.82),
    memory(actor,'h-05','adolescência','16 anos','casa','Quebrou um projeto por pressa e aprendeu a testar uma mudança de cada vez.',.28,.88),
    memory(actor,'h-06','início adulto','18 anos','primeiro trabalho','Teve o primeiro emprego e aprendeu que trabalho envolve prioridade, comunicação, prazo e resultado, não apenas ficar em um computador.',.62,.9),
    memory(actor,'h-07','início adulto','20 anos','escritório','Apresentou uma ideia em reunião, recebeu críticas e melhorou o projeto em vez de abandonar.',.58,.79),
    memory(actor,'h-08','início adulto','22 anos','parque','Criou o hábito de caminhar para reorganizar ideias quando estava sobrecarregada.',.78,.74),
    memory(actor,'h-09','adulto','24 anos','casa','Começou um projeto pessoal criativo e aprendeu a alternar pesquisa, protótipo e revisão.',.86,.87),
    memory(actor,'h-10','adulto','25 anos','trabalho','Conduziu uma tarefa do início ao fim: entendeu o pedido, dividiu em etapas, executou, conferiu e entregou.',.8,.95),
    memory(actor,'h-11','adulto','26 anos','café','Uma conversa com uma amiga mudou sua opinião sobre um problema importante.',.66,.77),
    memory(actor,'h-12','presente','27 anos','cidade','Quer continuar aprendendo, criando e construindo uma vida equilibrada sem repetir sempre a mesma rotina.',.76,.92)
  ];
  if(actor==='macaque')return [
    memory(actor,'m-01','filhote','primeiros meses','grupo arborícola','Aprendeu a reconhecer vozes, rostos e sinais de aproximação do grupo.',.78,.9),
    memory(actor,'m-02','filhote','1 ano','árvores','Aprendeu rotas entre galhos e que superfícies diferentes exigem movimentos diferentes.',.7,.82),
    memory(actor,'m-03','jovem','2 anos','área de forrageio','Descobriu onde encontrar alimento e passou a comparar cheiro, cor e esforço antes de escolher.',.74,.88),
    memory(actor,'m-04','jovem','3 anos','grupo','Uma disputa por alimento ensinou a observar hierarquia e intenção antes de se aproximar.',.32,.91),
    memory(actor,'m-05','jovem','4 anos','riacho','Aprendeu a usar água, pedras e galhos como partes do ambiente, não como decoração.',.71,.8),
    memory(actor,'m-06','adulto jovem','5 anos','bosque','Passou a explorar objetos novos por aproximações curtas: olhar, tocar, recuar e tentar de novo.',.67,.93),
    memory(actor,'m-07','adulto','6 anos','grupo','O grooming reforçou vínculos e mostrou que interação social também resolve tensão.',.82,.85),
    memory(actor,'m-08','presente','adulto','parque-habitat','Mantém curiosidade por ferramentas, comida, rotas elevadas e comportamentos dos outros agentes.',.75,.94)
  ];
  return [
    memory(actor,'f-01','larva','início da vida','substrato alimentar','Associou cheiro intenso a alimento antes de aprender a voar.',.65,.8),
    memory(actor,'f-02','metamorfose','pupa','abrigo','Passou por uma longa fase imóvel antes do primeiro voo.',.1,.72),
    memory(actor,'f-03','adulto jovem','primeiro voo','ambiente aberto','Aprendeu a estabilizar o voo usando contraste, fluxo visual e mudanças rápidas de direção.',.8,.94),
    memory(actor,'f-04','adulto','exploração','cozinha','Descobriu que odores de fruta e açúcar são pistas mais úteis que objetos visualmente grandes.',.74,.9),
    memory(actor,'f-05','adulto','ameaça','ambiente humano','Uma aproximação brusca ensinou a manter rotas de fuga e não pairar no mesmo ponto por muito tempo.',.2,.95),
    memory(actor,'f-06','adulto','exploração','parque','Luz, flores, água e matéria orgânica criaram um mapa de saliências diferente do ambiente interno.',.76,.86),
    memory(actor,'f-07','presente','agora','mundo simulado','Explora por trajetórias curtas, revisa alvos e alterna aproximação, inspeção, fuga e pausa.',.7,.96)
  ];
}

export function createSyntheticMind(actor:SyntheticLifeActor,identity?:string):SyntheticMindState{
  const names={human:'Lia',fly:'Mosca Predict',macaque:'Auri · Macaque'} as const;
  const goals={
    human:'construir, aprender, trabalhar com propósito e manter autonomia',
    fly:'explorar saliências, alimento e rotas seguras sem repetir órbitas',
    macaque:'explorar objetos, relações, alimento e caminhos usando memória espacial'
  } as const;
  const values={
    human:['curiosidade','competência','amizade','criatividade','autonomia'],
    fly:['novidade','alimento','segurança','exploração'],
    macaque:['curiosidade','grupo','segurança','exploração','brincadeira']
  } as const;
  return {
    version:1,actor,identity:identity||names[actor],biographyLabel:'synthetic',tick:0,
    values:[...values[actor]],currentGoal:goals[actor],
    publicThought:actor==='human'?'Quero entender o ambiente antes de escolher a próxima tarefa.':actor==='macaque'?'Vou observar o que muda e testar o ambiente com cuidado.':'Há sinais novos; vou escolher um alvo e manter uma rota de fuga.',
    creativity:actor==='human'?.68:actor==='macaque'?.56:.32,
    memories:biography(actor),lastExperience:''
  };
}

export function normalizeSyntheticMind(raw:any,actor:SyntheticLifeActor,identity?:string):SyntheticMindState{
  const base=createSyntheticMind(actor,identity);
  if(!raw||raw.version!==1||raw.actor!==actor)return base;
  return {
    ...base,...raw,actor,identity:String(raw.identity||base.identity).slice(0,80),biographyLabel:'synthetic',
    values:Array.isArray(raw.values)?raw.values.map(String).slice(0,8):base.values,
    memories:Array.isArray(raw.memories)?raw.memories.slice(-80):base.memories,
    tick:Math.max(0,Number(raw.tick||0)),
    creativity:clamp(Number(raw.creativity??base.creativity))
  };
}

export function createSyntheticMindBundle(humanIdentity='Lia'):SyntheticMindBundle{
  return {
    human:createSyntheticMind('human',humanIdentity),
    fly:createSyntheticMind('fly'),
    macaque:createSyntheticMind('macaque')
  };
}

export function normalizeSyntheticMindBundle(raw:any,humanIdentity='Lia'):SyntheticMindBundle{
  return {
    human:normalizeSyntheticMind(raw?.human,'human',humanIdentity),
    fly:normalizeSyntheticMind(raw?.fly,'fly'),
    macaque:normalizeSyntheticMind(raw?.macaque,'macaque')
  };
}

function overlapScore(query:string,text:string){
  const words=new Set(clean(query,260).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').split(/[^a-z0-9]+/).filter(x=>x.length>3));
  if(!words.size)return 0;
  const hay=clean(text,420).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  let hits=0;for(const word of words)if(hay.includes(word))hits++;
  return hits/words.size;
}

export function recallSyntheticMemories(state:SyntheticMindState,query:string,limit=4){
  return [...state.memories]
    .map(row=>({row,score:overlapScore(query,row.summary)*.65+row.salience*.35}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,Math.max(1,limit))
    .map(x=>x.row);
}

export function advanceSyntheticMind(
  previous:SyntheticMindState,
  input:{perception:string;action:string;location:string;curiosity:number;threat?:number;goal?:string}
):SyntheticMindState{
  const state=normalizeSyntheticMind(previous,previous.actor,previous.identity);
  const tick=state.tick+1;
  const perception=clean(input.perception,240);
  const action=clean(input.action,160);
  const location=clean(input.location,80);
  const remembered=recallSyntheticMemories(state,perception+' '+action,1)[0];
  const threat=clamp(Number(input.threat||0));
  const curiosity=clamp(Number(input.curiosity||0));
  let thought='';
  if(threat>.58)thought='Algo parece arriscado. Vou preservar uma saída e observar antes de insistir.';
  if(!thought&&state.actor==='fly')thought=curiosity>.58?'Esse contraste/odor parece mais relevante. Vou mudar a rota e verificar.':'Vou reduzir a velocidade, manter o campo visual aberto e esperar um estímulo melhor.';
  if(!thought&&state.actor==='macaque')thought=curiosity>.58?'Esse objeto merece um teste curto: aproximar, tocar e comparar com o que já conheço.':'Vou observar o grupo e o espaço antes de escolher onde subir ou forragear.';
  if(!thought&&state.actor==='human')thought=/trabalh|computador|quadro|reuni/i.test(action+' '+perception)
    ? 'Trabalho não é só ocupar um lugar: preciso entender a tarefa, produzir algo verificável e conferir o resultado.'
    : /parque|trilha|arvore|banco/i.test(action+' '+perception)
      ? 'No parque posso explorar, caminhar, observar ou descansar; vou escolher pelo que preciso agora.'
      : curiosity>.62
        ? 'Há algo novo aqui. Posso testar uma ação pequena, observar o efeito e ajustar.'
        : 'Vou escolher uma ação concreta em vez de repetir uma rotina automática.';
  const experience=clean([location,action,perception].filter(Boolean).join(' · '),260);
  let memories=state.memories;
  if(experience&&tick%7===0){
    memories=[...memories,{
      id:state.actor+'-runtime-'+tick,actor:state.actor,lifeStage:'runtime',when:'agora',place:location||'mundo',
      summary:experience,valence:threat>.6?.25:.62,salience:clamp(.48+curiosity*.28+threat*.2),source:'runtime'
    }].slice(-80);
  }
  return {
    ...state,tick,currentGoal:clean(input.goal||state.currentGoal,180),publicThought:thought,
    creativity:clamp(state.creativity*.96+curiosity*.04),memories,lastExperience:experience
  };
}
