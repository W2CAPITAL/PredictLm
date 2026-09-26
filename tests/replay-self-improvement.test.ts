import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseReplayPolicy,evaluatePersistentImprovement,type DiscoveryTrace,type ExplorationPolicy} from '../src/lib/continuous-learning/index';

const trace:DiscoveryTrace={
  id:'trace-1',
  topic:'self-improvement',
  observedAt:'2026-09-26T12:00:00Z',
  nodes:[
    {id:'root',quality:.4,novelty:.2,costMs:1000},
    {id:'a',parentId:'root',quality:.76,novelty:.7,costMs:1000},
    {id:'b',parentId:'root',quality:.6,novelty:.5,costMs:1000},
    {id:'a2',parentId:'a',quality:.88,novelty:.65,costMs:1000,terminal:true}
  ]
};

const current:ExplorationPolicy={
  id:'current',
  maxNodes:4,
  maxDepth:3,
  branchFactor:2,
  parallelism:1,
  continueThreshold:.5,
  patience:4,
  minGain:.01
};

test('replay pool can select a better observed-history exploration policy without production promotion',()=>{
  const candidate:ExplorationPolicy={...current,id:'candidate',continueThreshold:.3};
  const result=chooseReplayPolicy({traces:[trace],current,candidates:[candidate],minAggregateGain:.001});
  assert.equal(result.selected.policy.id,'candidate');
  assert.equal(result.changed,true);
  assert.equal(result.requiresReview,true);
  assert.equal(result.productionPromotion,'blocked');
});

test('persistent improvement stays review gated and never auto-merges',()=>{
  const result=evaluatePersistentImprovement({
    target:'control-logic',
    testsPassed:true,
    buildPassed:true,
    regressionPassed:true,
    securityPassed:true,
    rollbackReady:true,
    humanReviewed:false
  });
  assert.equal(result.status,'review-required');
  assert.equal(result.autoMerge,false);
  assert.equal(result.productionPromotion,'blocked');
});

test('parametric improvement needs rights, held-out evaluation and an independent evaluator',()=>{
  const result=evaluatePersistentImprovement({
    target:'model-weights',
    testsPassed:true,
    buildPassed:true,
    regressionPassed:true,
    securityPassed:true,
    rollbackReady:true,
    humanReviewed:true,
    datasetRights:false,
    heldOutEvaluation:true,
    evaluatorIndependent:true
  });
  assert.equal(result.status,'blocked');
  assert.ok(result.reasons.includes('dataset-rights'));
});
