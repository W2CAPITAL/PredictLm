import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CONTROLLER_COVERAGE,
  COGNITIVE_BENCHMARK_TASKS,
  MINECRAFT_ARENA_BANNER,
  defaultExperimentSpec,
  experimentSpecFromYaml,
  experimentSpecToYaml,
  exportCoverageRunJson,
  randomBaseline
} from '../src/lib/simulation/cognitive-world-contract';
import {
  LAB_SCIENCE_BANNER,
  LAB_TASKS,
  assertLabTaskCompatible,
  assertNoMinecraftTaskInLab,
  buildLabTrialProvenance
} from '../src/lib/neuroscience/lab-contract';

test('coverage sheets are explicit evidence indexes, not fake brain percentages',()=>{
  for(const profile of Object.values(CONTROLLER_COVERAGE)){
    assert.ok(profile.evidenceCoverageIndex>=0&&profile.evidenceCoverageIndex<=100);
    assert.match(profile.evidenceCoverageBasis,/NÃO é porcentagem/i);
    assert.ok(profile.present.length+profile.proxy.length+profile.absent.length>=4);
    assert.equal(profile.subsystems.length,4);
    assert.match(profile.whyNotComplete,/não|nem|cérebro|conectoma|dinâmica/i);
  }
  assert.match(CONTROLLER_COVERAGE.human.summary,/H01 parcial/i);
  assert.match(CONTROLLER_COVERAGE.mouse.summary,/MICrONS.*Allen/i);
  assert.match(CONTROLLER_COVERAGE.macaque.summary,/Atlas.*projectome/i);
  assert.match(CONTROLLER_COVERAGE.fly.summary,/FlyWire whole-brain connectivity/i);
});

test('fixed cognitive benchmark includes memory planning and multi-agent probes',()=>{
  const ids=new Set(COGNITIVE_BENCHMARK_TASKS.map(x=>x.id));
  for(const id of ['explore','remember-base','memory-probe','planning-3-step','cooperation','competition']){
    assert.ok(ids.has(id as any),id+' should exist');
  }
  assert.ok(COGNITIVE_BENCHMARK_TASKS.every(x=>x.maxActions>0));
});

test('experiment runner YAML is deterministic and always restores arena disclaimer',()=>{
  const spec={...defaultExperimentSpec('human','planning-3-step',20260928),observationNoise:.15,actionDelayTicks:2};
  const yaml=experimentSpecToYaml(spec);
  const parsed=experimentSpecFromYaml(yaml);
  assert.deepEqual(parsed,spec);
  assert.equal(parsed.disclaimer,MINECRAFT_ARENA_BANNER);
});

test('random baseline is deterministic for a fixed seed',()=>{
  const obs:any={tick:0,seed:7,position:{x:0,y:64,z:0,dimension:'overworld'},hp:20,hunger:20,inventory:{},visibleGrid:[],entities:[],structures:[],goal:'explore',partialObservability:0,actionDelayTicks:0};
  const a=randomBaseline(42);
  const b=randomBaseline(42);
  const seqA=Array.from({length:12},()=>a.step(obs));
  const seqB=Array.from({length:12},()=>b.step(obs));
  assert.deepEqual(seqA,seqB);
});

test('coverage export never describes training as biological coverage growth',()=>{
  const parsed=JSON.parse(exportCoverageRunJson('mouse','run-1',[.1,.4,.8]));
  assert.equal(parsed.schema,'predictlm-controller-coverage-v1');
  assert.match(parsed.note,/Não interpretar treino como aumento de cobertura biológica/i);
});

test('lab tasks are species-scoped and Minecraft tasks are rejected',()=>{
  assert.ok(LAB_TASKS.length>=13);
  assert.equal(assertLabTaskCompatible('fly','fly-optomotor').species,'fly');
  assert.throws(()=>assertLabTaskCompatible('human','mouse-simple-maze'));
  assert.throws(()=>assertNoMinecraftTaskInLab('Minecraft survival craft'));
  assert.doesNotThrow(()=>assertNoMinecraftTaskInLab('visual discrimination'));
});

test('lab provenance separates published connectivity from modelled dynamics',()=>{
  const p=buildLabTrialProvenance({
    version:1,
    species:'human',
    task:'human-h01-local-stimulation',
    seed:11,
    dataOnly:true,
    dtMs:.1,
    durationMs:100,
    model:'lif',
    datasetIds:['H01']
  });
  assert.equal(p.banner,LAB_SCIENCE_BANNER);
  assert.match(p.connectivityStatement,/H01.*fragmento cortical/i);
  assert.match(p.dynamicModelStatement,/modelada/i);
  assert.ok(p.limitations.some(x=>/whole-brain|mente/i.test(x)));
});

test('UI keeps both scientific boundary banners visible',()=>{
  const minecraft=fs.readFileSync(path.join(process.cwd(),'src/components/MinecraftSimulationPanel.tsx'),'utf8');
  const lab=fs.readFileSync(path.join(process.cwd(),'src/components/CognitiveLab.tsx'),'utf8');
  assert.match(minecraft,/minecraft-scientific-boundary/);
  assert.match(minecraft,/MINECRAFT_ARENA_BANNER/);
  assert.match(lab,/neuroscience-lab-scientific-boundary/);
  assert.match(lab,/LAB_SCIENCE_BANNER/);
});

test('Minecraft UI does not regress to prohibited complete-brain claims',()=>{
  const files=[
    'src/components/MinecraftSimulationPanel.tsx',
    'src/components/GrokSimulationPanel.tsx',
    'src/lib/simulation/minecraft-brain-agents.ts'
  ].map(p=>fs.readFileSync(path.join(process.cwd(),p),'utf8')).join('\n');
  const forbidden=[
    /cérebro humano real (?:no|jogando) minecraft/i,
    /quatro cérebros biológicos completos jogando/i,
    /H01 (?:é|=) (?:um )?cérebro humano inteiro/i,
    /MICrONS (?:é|=) (?:um )?camundongo inteiro/i,
    /spikes? (?:são|=) pensamentos?/i
  ];
  for(const pattern of forbidden)assert.equal(pattern.test(files),false,'forbidden claim: '+pattern);
});
