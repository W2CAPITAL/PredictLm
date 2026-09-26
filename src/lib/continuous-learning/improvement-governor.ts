export type ImprovementTarget='prompt'|'memory'|'tools'|'control-logic'|'model-weights';
export type ImprovementClass='scaffold-fast-loop'|'parametric-slow-loop';

export type PersistentImprovementCheck={
  target:ImprovementTarget;
  testsPassed:boolean;
  buildPassed:boolean;
  regressionPassed:boolean;
  securityPassed:boolean;
  rollbackReady:boolean;
  humanReviewed:boolean;
  datasetRights?:boolean;
  heldOutEvaluation?:boolean;
  evaluatorIndependent?:boolean;
};

export function improvementClass(target:ImprovementTarget):ImprovementClass{
  return target==='model-weights'?'parametric-slow-loop':'scaffold-fast-loop';
}

export function evaluatePersistentImprovement(input:PersistentImprovementCheck){
  const cls=improvementClass(input.target);
  const reasons:string[]=[];
  if(!input.testsPassed)reasons.push('tests');
  if(!input.buildPassed)reasons.push('build');
  if(!input.regressionPassed)reasons.push('regression');
  if(!input.securityPassed)reasons.push('security');
  if(!input.rollbackReady)reasons.push('rollback');

  if(cls==='parametric-slow-loop'){
    if(!input.datasetRights)reasons.push('dataset-rights');
    if(!input.heldOutEvaluation)reasons.push('held-out-evaluation');
    if(!input.evaluatorIndependent)reasons.push('independent-evaluator');
  }

  const automatedChecksPassed=reasons.length===0;
  const status=!automatedChecksPassed?'blocked':input.humanReviewed?'reviewed-eligible':'review-required';

  return {
    class:cls,
    durable:true,
    automatedChecksPassed,
    humanReviewed:input.humanReviewed,
    status,
    reasons,
    autoMerge:false as const,
    productionPromotion:status==='reviewed-eligible'?'manual-only':'blocked'
  };
}
