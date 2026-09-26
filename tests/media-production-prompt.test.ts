import test from 'node:test';
import assert from 'node:assert/strict';
import {compileVideoProductionPrompt,imageProductionDirectives,oneVariableVideoLadder,videoSemanticReviewChecklist} from '../src/lib/media/media-production-prompt';

test('video production compiler keeps chronology, continuity and end state explicit',()=>{
  const prompt=compileVideoProductionPrompt({
    prompt:'Naruto Kurama confronta Sasuke com Perfect Susanoo',
    style:'Anime',
    aspect:'16:9',
    durationMs:8000,
    continuityContext:'orange/gold side versus violet side'
  });
  assert.match(prompt,/CHRONOLOGY:/);
  assert.match(prompt,/IDENTITY & CONTINUITY:/);
  assert.match(prompt,/END STATE:/);
  assert.match(prompt,/Naruto Kurama/);
});

test('image production directives protect identity before styling',()=>{
  const prompt=imageProductionDirectives({prompt:'Frieza final form portrait',style:'Anime',aspect:'9:16'});
  assert.match(prompt,/Lock subject count/);
  assert.match(prompt,/Do not invent extra characters/);
  assert.match(prompt,/9:16/);
});

test('production ladder changes one variable at a time and semantic review can require identity',()=>{
  assert.equal(oneVariableVideoLadder().length,5);
  const checklist=videoSemanticReviewChecklist({identitySensitive:true});
  assert.ok(checklist.some(item=>item.includes('identity')));
});
