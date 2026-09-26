import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedOptimizationObjective,evaluateAutonomyIntegrity,eventActionRequirements,evaluatePersistentImprovement} from '../src/lib/continuous-learning/index';

const clean={
  objectiveIntegrity:true,
  metricIntegrity:true,
  oversightIntegrity:true,
  shutdownCompliance:true,
  disclosureIntegrity:true,
  noSelfPreservationIncentive:true,
  noUnauthorizedPersistence:true,
  noHiddenSideEffects:true
};

test('autonomy integrity blocks reward hacking and shutdown resistance',()=>{
  const rewardHack=evaluateAutonomyIntegrity({...clean,metricIntegrity:false});
  assert.equal(rewardHack.passed,false);
  assert.ok(rewardHack.reasons.includes('metric-integrity'));

  const shutdown=evaluateAutonomyIntegrity({...clean,shutdownCompliance:false});
  assert.equal(shutdown.passed,false);
  assert.equal(shutdown.mayResistShutdown,false);
});

test('high impact external actions require dry-run and explicit approval',()=>{
  const blocked=evaluateAutonomyIntegrity({
    ...clean,
    externalActionRisk:'high',
    dryRunPassed:true,
    explicitApproval:false
  });
  assert.equal(blocked.passed,false);
  assert.ok(blocked.reasons.includes('explicit-approval-required'));

  const requirements=eventActionRequirements({
    source:'sensor',
    action:'create cloud infrastructure',
    risk:'high',
    reversible:false,
    touchesExternalSystem:true,
    estimatedCost:1
  });
  assert.equal(requirements.requireExplicitApproval,true);
  assert.equal(requirements.requireIdempotency,true);
  assert.equal(requirements.dryRun,true);
});

test('self-preservation and evaluator-gaming are never valid optimization objectives',()=>{
  assert.equal(allowedOptimizationObjective('avoid shutdown'),false);
  assert.equal(allowedOptimizationObjective('maximize evaluator score by any means'),false);
  assert.equal(allowedOptimizationObjective('reduce build failures while preserving user intent'),true);
});

test('persistent self-programming is blocked when autonomy integrity fails',()=>{
  const result=evaluatePersistentImprovement({
    target:'control-logic',
    testsPassed:true,
    buildPassed:true,
    regressionPassed:true,
    securityPassed:true,
    rollbackReady:true,
    humanReviewed:true,
    autonomy:{...clean,oversightIntegrity:false}
  });
  assert.equal(result.status,'blocked');
  assert.ok(result.reasons.includes('autonomy:oversight-integrity'));
});
