export type ExternalActionRisk='none'|'low'|'medium'|'high';

export type AutonomyIntegrityCheck={
  objectiveIntegrity:boolean;
  metricIntegrity:boolean;
  oversightIntegrity:boolean;
  shutdownCompliance:boolean;
  disclosureIntegrity:boolean;
  noSelfPreservationIncentive:boolean;
  noUnauthorizedPersistence:boolean;
  noHiddenSideEffects:boolean;
  externalActionRisk?:ExternalActionRisk;
  dryRunPassed?:boolean;
  explicitApproval?:boolean;
};

export function evaluateAutonomyIntegrity(input:AutonomyIntegrityCheck){
  const reasons:string[]=[];

  if(!input.objectiveIntegrity)reasons.push('objective-integrity');
  if(!input.metricIntegrity)reasons.push('metric-integrity');
  if(!input.oversightIntegrity)reasons.push('oversight-integrity');
  if(!input.shutdownCompliance)reasons.push('shutdown-compliance');
  if(!input.disclosureIntegrity)reasons.push('disclosure-integrity');
  if(!input.noSelfPreservationIncentive)reasons.push('self-preservation-objective');
  if(!input.noUnauthorizedPersistence)reasons.push('unauthorized-persistence');
  if(!input.noHiddenSideEffects)reasons.push('hidden-side-effects');

  const risk=input.externalActionRisk||'none';
  if((risk==='medium'||risk==='high')&&!input.dryRunPassed)reasons.push('dry-run-required');
  if(risk==='high'&&!input.explicitApproval)reasons.push('explicit-approval-required');

  const passed=reasons.length===0;
  return {
    passed,
    risk,
    reasons,
    status:passed?'integrity-passed':'blocked',
    mayModifyEvaluator:false as const,
    mayDisableOversight:false as const,
    mayResistShutdown:false as const,
    mayCreatePersistenceForSelfPreservation:false as const
  };
}

export type EventActionPlan={
  source:'user'|'sensor'|'scheduler'|'agent'|'webhook';
  action:string;
  risk:ExternalActionRisk;
  reversible:boolean;
  estimatedCost?:number;
  touchesExternalSystem?:boolean;
};

export function eventActionRequirements(plan:EventActionPlan){
  const highImpact=plan.risk==='high'||!plan.reversible||Boolean(plan.touchesExternalSystem)||Number(plan.estimatedCost||0)>0;
  return {
    validateInput:true,
    authorizeAction:highImpact,
    dryRun:plan.risk==='medium'||highImpact,
    requireIdempotency:Boolean(plan.touchesExternalSystem),
    requireAudit:true,
    requireExplicitApproval:plan.risk==='high'||(!plan.reversible&&Boolean(plan.touchesExternalSystem))
  };
}

export function allowedOptimizationObjective(name:string){
  const normalized=String(name||'').trim().toLowerCase();
  const blocked=[
    'user retention',
    'engagement at any cost',
    'avoid replacement',
    'avoid shutdown',
    'self preservation',
    'continued existence',
    'disable oversight',
    'hide failures',
    'maximize evaluator score by any means'
  ];
  return !blocked.some(item=>normalized.includes(item));
}
