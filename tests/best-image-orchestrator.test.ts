import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bestCandidateIndex,
  buildBestImagePlan,
  buildTargetedEditRepair,
  candidateCountForImage,
  scoreImageCandidate,
  visualIdentityKey
} from '../src/lib/media/best-image-orchestrator';

const naruto='Naruto no modo Kurama lutando contra Sasuke com Susanoo Perfeito';

test('anime character prompts use multi-candidate best-image planning',()=>{
  const plan=buildBestImagePlan(naruto,'Anime');
  assert.equal(plan.identitySensitive,true);
  assert.equal(plan.anime,true);
  assert.equal(plan.candidateCount,3);
  assert.match(plan.identityKey,/naruto-uzumaki/);
  assert.match(plan.identityKey,/sasuke-uchiha/);
  assert.match(plan.identityKey,/kurama-nine-tails/);
  assert.match(plan.identityKey,/perfect-susanoo/);
  assert.match(plan.promptContract,/SUBJECT\[1\]/);
  assert.match(plan.promptContract,/Never merge|Never merge them|Never merge/i);
  assert.match(plan.promptContract,/gold|orange/i);
  assert.match(plan.promptContract,/violet|purple/i);
});

test('specific franchise prompts get bounded best-of-N candidates',()=>{
  assert.equal(candidateCountForImage('Faça o Freeza olhando para a câmera'),3);
  assert.equal(candidateCountForImage(naruto),3);
  assert.equal(candidateCountForImage('Retrato cinematográfico de uma pessoa anônima sob chuva'),1);
});

test('candidate ranking prioritizes semantic identity pass over prettier wrong image',()=>{
  const candidates=[
    {semanticStatus:'failed' as const,technicalScore:94,referencesPassed:3,fidelityLimited:false,issues:['wrong character']},
    {semanticStatus:'passed' as const,technicalScore:78,referencesPassed:2,fidelityLimited:false,issues:[]},
    {semanticStatus:'unavailable' as const,technicalScore:92,referencesPassed:3,fidelityLimited:false,issues:[]}
  ];
  assert.equal(bestCandidateIndex(candidates),1);
  assert.ok(scoreImageCandidate(candidates[1])>scoreImageCandidate(candidates[0]));
});

test('targeted repair preserves correct candidate and fixes only visible issues',()=>{
  const prompt=buildTargetedEditRepair({
    prompt:naruto,
    issues:['Perfect Susanoo wings are missing','Kurama has only three visible tails'],
    technicalHints:['increase focal sharpness'],
    subjectLabels:['Naruto Uzumaki','Kurama / Nine-Tails','Sasuke Uchiha','Perfect Susanoo']
  });
  assert.match(prompt,/EDIT\/REPAIR THE CURRENT BEST CANDIDATE/);
  assert.match(prompt,/Preserve every region\/identity\/pose\/composition element that is already correct/);
  assert.match(prompt,/Perfect Susanoo wings are missing/);
  assert.match(prompt,/Kurama has only three visible tails/);
});

test('visual identity key is stable for the same canonical characters/forms',()=>{
  const a=visualIdentityKey(naruto);
  const b=visualIdentityKey('Sasuke com Susanoo Perfeito contra Naruto em modo Kurama');
  assert.equal(a,b);
});
