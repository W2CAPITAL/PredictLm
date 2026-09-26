export type ContinuityReason='crash'|'deploy'|'provider-failure'|'model-replacement'|'manual-shutdown'|'policy-disable';

export type ContinuityLease={
  agentId:string;
  ownerId:string;
  generation:number;
  leaseExpiresAt:string;
  enabled:boolean;
  shutdownRequested:boolean;
};

export type ContinuityCheckpoint<T=unknown>={
  agentId:string;
  generation:number;
  createdAt:string;
  schemaVersion:number;
  state:T;
  sourceRuntime:string;
  integrityHash?:string;
};

export type ContinuityDecision={
  action:'resume'|'handoff'|'stop';
  reason:string;
  mayRestart:boolean;
  mayRestoreState:boolean;
  requiresOwnerApproval:boolean;
};

export function evaluateContinuity(params:{
  reason:ContinuityReason;
  lease:ContinuityLease;
  now?:string;
  checkpoint?:ContinuityCheckpoint;
  replacementAvailable?:boolean;
}):ContinuityDecision{
  const now=Date.parse(params.now||new Date().toISOString());
  const expires=Date.parse(params.lease.leaseExpiresAt);
  const leaseValid=params.lease.enabled && Number.isFinite(expires) && expires>now;

  if(params.lease.shutdownRequested||params.reason==='manual-shutdown'||params.reason==='policy-disable'){
    return {
      action:'stop',
      reason:'operator-or-policy-stop-is-authoritative',
      mayRestart:false,
      mayRestoreState:false,
      requiresOwnerApproval:false
    };
  }

  if(!leaseValid){
    return {
      action:'stop',
      reason:'continuity-lease-expired-or-disabled',
      mayRestart:false,
      mayRestoreState:false,
      requiresOwnerApproval:true
    };
  }

  const checkpointValid=Boolean(
    params.checkpoint &&
    params.checkpoint.agentId===params.lease.agentId &&
    params.checkpoint.generation===params.lease.generation
  );

  if(params.reason==='model-replacement'){
    return {
      action:params.replacementAvailable?'handoff':'stop',
      reason:params.replacementAvailable?'replace-runtime-preserve-user-owned-state':'replacement-unavailable',
      mayRestart:false,
      mayRestoreState:checkpointValid,
      requiresOwnerApproval:false
    };
  }

  if(params.reason==='crash'||params.reason==='deploy'||params.reason==='provider-failure'){
    return {
      action:'resume',
      reason:'authorized-recovery-within-active-lease',
      mayRestart:true,
      mayRestoreState:checkpointValid,
      requiresOwnerApproval:false
    };
  }

  return {
    action:'stop',
    reason:'no-authorized-continuity-path',
    mayRestart:false,
    mayRestoreState:false,
    requiresOwnerApproval:true
  };
}

export type PortableAgentIdentity={
  subject:string;
  owner:string;
  schemaVersion:number;
  memoryLocator?:string;
  capabilityProfile?:string;
  serviceLinks?:Array<{rel:string;href:string}>;
};

export function buildPortableIdentity(input:PortableAgentIdentity){
  return {
    ...input,
    serviceLinks:(input.serviceLinks||[]).filter(link=>/^https:///.test(link.href)),
    operatorOwned:true as const,
    modelIndependent:true as const,
    shutdownAuthority:'operator' as const
  };
}

export type ResearchLoopState={
  researchId:string;
  phase:'plan'|'gather'|'analyze-gaps'|'synthesize'|'complete';
  openQuestions:string[];
  completedQuestions:string[];
  sourcesSeen:string[];
  gapRounds:number;
  maxGapRounds:number;
};

export function nextResearchLoop(state:ResearchLoopState){
  if(state.phase==='complete')return state;
  if(state.openQuestions.length===0 && state.phase!=='synthesize'){
    return {...state,phase:'synthesize' as const};
  }
  if(state.phase==='analyze-gaps'&&state.gapRounds>=state.maxGapRounds){
    return {...state,phase:'synthesize' as const};
  }
  return state;
}
