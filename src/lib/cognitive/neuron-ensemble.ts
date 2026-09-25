export type NeuralPopulationId=
  |'pfc'|'acc'|'insula'|'amygdala'|'hippocampus'|'sensory'
  |'thalamus'|'basal-ganglia'|'reward'|'noradrenergic'|'serotonergic'|'cholinergic'
  |'fly-mushroom-body'|'fly-central-complex';

export interface NeuralPopulation{
  id:NeuralPopulationId;
  label:string;
  source:'human'|'fly'|'bridge';
  units:number;
  firing:number;
  excitation:number;
  inhibition:number;
  plasticity:number;
  adaptation:number;
}

export interface NeuromodulatorState{
  dopamine:number;
  serotonin:number;
  norepinephrine:number;
  acetylcholine:number;
  cortisolProxy:number;
  oxytocinProxy:number;
}

export interface NeuralEnsembleState{
  tick:number;
  populations:Record<NeuralPopulationId,NeuralPopulation>;
  modulators:NeuromodulatorState;
  totalVirtualUnits:number;
}

const clamp=(x:number,min=0,max=1)=>Math.max(min,Math.min(max,x));

function pop(id:NeuralPopulationId,label:string,source:NeuralPopulation['source'],units:number,firing=.35):NeuralPopulation{
  return {id,label,source,units,firing,excitation:.52,inhibition:.48,plasticity:.45,adaptation:.5};
}

export function createNeuralEnsemble():NeuralEnsembleState{
  const rows=[
    pop('pfc','Prefrontal executive network','human',22000,.42),
    pop('acc','Anterior cingulate conflict network','human',10000,.35),
    pop('insula','Insula/interoceptive network','human',9000,.34),
    pop('amygdala','Amygdala salience/value network','human',8000,.32),
    pop('hippocampus','Hippocampal episodic-memory network','human',18000,.38),
    pop('sensory','Multisensory cortical network','human',26000,.4),
    pop('thalamus','Thalamic routing network','human',10000,.37),
    pop('basal-ganglia','Basal-ganglia action selector','human',12000,.35),
    pop('reward','Reward/value network','human',9000,.36),
    pop('noradrenergic','Noradrenergic modulation','human',3000,.3),
    pop('serotonergic','Serotonergic modulation','human',3000,.3),
    pop('cholinergic','Cholinergic modulation','human',3000,.32),
    pop('fly-mushroom-body','Fly mushroom-body association','fly',12000,.38),
    pop('fly-central-complex','Fly central-complex action/orientation','fly',7000,.36)
  ] as NeuralPopulation[];
  return {
    tick:0,
    populations:Object.fromEntries(rows.map(x=>[x.id,x])) as Record<NeuralPopulationId,NeuralPopulation>,
    modulators:{dopamine:.5,serotonin:.52,norepinephrine:.4,acetylcholine:.46,cortisolProxy:.2,oxytocinProxy:.42},
    totalVirtualUnits:rows.reduce((a,b)=>a+b.units,0)
  };
}

export interface NeuralDrive{
  novelty:number;
  threat:number;
  reward:number;
  social:number;
  memory:number;
  attention:number;
  effort:number;
  body:number;
}

export function advanceNeuralEnsemble(previous:NeuralEnsembleState|undefined,drive:NeuralDrive){
  const prev=previous||createNeuralEnsemble();
  const m={
    dopamine:clamp(prev.modulators.dopamine*.72+drive.reward*.18+drive.novelty*.1),
    serotonin:clamp(prev.modulators.serotonin*.78+(1-drive.threat)*.1+drive.social*.06+(1-drive.effort)*.06),
    norepinephrine:clamp(prev.modulators.norepinephrine*.62+drive.novelty*.18+drive.threat*.2),
    acetylcholine:clamp(prev.modulators.acetylcholine*.68+drive.attention*.2+drive.novelty*.12),
    cortisolProxy:clamp(prev.modulators.cortisolProxy*.72+drive.threat*.2+drive.effort*.08),
    oxytocinProxy:clamp(prev.modulators.oxytocinProxy*.8+drive.social*.16-drive.threat*.04)
  };
  const p={...prev.populations};
  const update=(id:NeuralPopulationId,target:number,plasticity=.5)=>{
    const old=p[id];
    const firing=clamp(old.firing*.58+target*.42);
    p[id]={...old,firing,excitation:clamp(old.excitation*.7+firing*.3),inhibition:clamp(old.inhibition*.76+(1-firing)*.24),plasticity:clamp(old.plasticity*.8+plasticity*.2),adaptation:clamp(old.adaptation*.82+(1-Math.abs(firing-old.firing))*.18)};
  };
  update('amygdala',drive.threat*.48+drive.novelty*.18+Math.abs(drive.reward-.5)*.22+drive.body*.12,.72);
  update('hippocampus',drive.memory*.42+drive.novelty*.16+drive.attention*.22+(1-drive.threat)*.2,.76);
  update('pfc',drive.attention*.34+drive.effort*.24+drive.memory*.18+(1-drive.threat)*.24,.64);
  update('acc',drive.effort*.32+drive.threat*.24+drive.attention*.22+drive.novelty*.22,.58);
  update('insula',drive.body*.38+drive.social*.2+drive.threat*.22+drive.reward*.2,.61);
  update('sensory',drive.attention*.45+drive.novelty*.35+drive.body*.2,.48);
  update('thalamus',drive.attention*.44+drive.novelty*.28+drive.threat*.28,.44);
  update('basal-ganglia',drive.reward*.34+drive.effort*.22+drive.attention*.24+(1-drive.threat)*.2,.57);
  update('reward',drive.reward*.6+drive.social*.2+drive.novelty*.2,.66);
  update('noradrenergic',m.norepinephrine,.52);
  update('serotonergic',m.serotonin,.48);
  update('cholinergic',m.acetylcholine,.5);
  update('fly-mushroom-body',drive.memory*.34+drive.reward*.28+drive.novelty*.25+drive.threat*.13,.74);
  update('fly-central-complex',drive.attention*.26+drive.effort*.34+drive.novelty*.22+drive.threat*.18,.58);
  return {...prev,tick:prev.tick+1,populations:p,modulators:m};
}
