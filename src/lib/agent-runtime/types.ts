export type PredictAgentId =
  | 'predict-orchestrator'
  | 'scanner-processual'
  | 'legal-review'
  | 'research'
  | 'document'
  | 'codebase-investigator'
  | 'error-recovery'
  | 'qa'
  | 'self-improve'
  | 'media';

export type ToolRisk='read'|'external'|'write'|'privileged';
export type PolicyDecision='allow'|'ask'|'deny';

export interface AgentPlan{
  route:PredictAgentId;
  reason:string;
  tools:string[];
  risk:'low'|'medium'|'high';
  requiresCouncil:boolean;
  requiresHumanGate:boolean;
}

export interface RuntimeErrorShape{
  kind:'timeout'|'rate-limit'|'geo-block'|'auth'|'network'|'invalid-input'|'upstream'|'unknown';
  retryable:boolean;
  waitMs:number;
  userMessage:string;
}
