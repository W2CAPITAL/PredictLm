import test from 'node:test';
import assert from 'node:assert/strict';
import {BIO_BRAIN_SOURCES,fuseBioIntelligence,speciesSignals} from '../src/lib/biointelligence-fabric';

test('biointelligence includes six species with explicit provenance scopes',()=>{
  const species=new Set(BIO_BRAIN_SOURCES.map(x=>x.species));
  for(const id of ['human','macaque','fly','celegans','mouse','zebrafish','ciona','platynereis'])assert.equal(species.has(id as any),true);
  const mouse=BIO_BRAIN_SOURCES.find(x=>x.species==='mouse');
  const worm=BIO_BRAIN_SOURCES.find(x=>x.species==='celegans');
  const fish=BIO_BRAIN_SOURCES.find(x=>x.species==='zebrafish');
  const ciona=BIO_BRAIN_SOURCES.find(x=>x.species==='ciona');
  const annelid=BIO_BRAIN_SOURCES.find(x=>x.species==='platynereis');
  assert.match(mouse?.scope||'',/visual cortical volume|visual cortex/i);
  assert.match(worm?.scope||'',/whole animal/i);
  assert.match(fish?.notes||'',/does not mean every neuron\/synapse/i);
  assert.match(ciona?.scope||'',/177 neurons/i);
  assert.match(annelid?.scope||'',/whole-body synaptic connectome/i);
});

test('cross species fusion is a brain inspired controller rather than a biological mind claim',()=>{
  const event={surface:'tests',action:'failed build',kind:'error' as const,success:false,novelty:.8,uncertainty:.92,salience:.96};
  const signals=speciesSignals(event);
  assert.equal(signals.length,8);
  const fusion=fuseBioIntelligence(event);
  assert.equal(fusion.label,'brain-inspired-controller');
  assert.ok(fusion.learningPriority>.6);
  assert.equal(fusion.researchGap,true);
});

test('failure and uncertainty raise learning priority over routine success',()=>{
  const routine=fuseBioIntelligence({surface:'ui',action:'open panel',kind:'navigation',success:true,novelty:.2,uncertainty:.1,salience:.2});
  const failure=fuseBioIntelligence({surface:'build',action:'compile failed',kind:'error',success:false,novelty:.8,uncertainty:.95,salience:.98});
  assert.ok(failure.learningPriority>routine.learningPriority);
});
