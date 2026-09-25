import test from 'node:test';
import assert from 'node:assert/strict';
import {consolidateFrankMemory,createFrankHippocampus,encodeFrankEpisode,recallFrankMemory} from '../src/lib/cognitive/frank-hippocampus';

test('hippocampus separates similar episodes and recalls by cue',()=>{
  let h=createFrankHippocampus();
  h=encodeFrankEpisode(h,{cue:'café com Mara',gist:'Conversei com Mara no café e fiquei feliz.',context:'Café',emotion:[.7,.5],salience:.82});
  h=encodeFrankEpisode(h,{cue:'café sozinho',gist:'Fui ao mesmo café, mas fiquei sozinho e pensativo.',context:'Café',emotion:[-.2,.35],salience:.66});
  assert.equal(h.engrams.length,2);
  const recalled=recallFrankMemory(h,'Mara café feliz',3);
  assert.ok(recalled.memories.length>=1);
  assert.match(recalled.memories[0].gist,/Mara|café/i);
  assert.ok(h.novelty>=0&&h.novelty<=1);
  assert.ok(h.mismatch>=0&&h.mismatch<=1);
});

test('hippocampal consolidation strengthens stored episodes without inventing new ones',()=>{
  let h=createFrankHippocampus();
  h=encodeFrankEpisode(h,{cue:'projeto',gist:'Criei uma parte importante do projeto.',salience:.9});
  const before=h.engrams[0].consolidated;
  h=consolidateFrankMemory(h,.9);
  assert.equal(h.engrams.length,1);
  assert.ok(h.engrams[0].consolidated>before);
});
