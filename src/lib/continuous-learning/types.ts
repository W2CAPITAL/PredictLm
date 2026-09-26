export type LearningStatus='accepted'|'candidate'|'rejected';
export type LearningKind='github-allowlist'|'github-discovery'|'official-feed'|'academic-preprint'|'rss'|'source-error'|string;
export type LearningRecord={id:string;observedAt:string;publishedAt?:string|null;topic:string;kind:LearningKind;title:string;summary:string;source:string;url:string;domains?:string[];license?:string;evidenceLevel?:string;confidence:number;allowlisted?:boolean;official?:boolean;quarantined?:boolean;status:LearningStatus};
export type ResearchGap={id:string;topic:string;label:string;priority:number;reason:string;lastEvidenceAt?:string|null;acceptedRecords:number;status:'open'|'covered'};
export type LearningProposal={id:string;kind:'skill'|'code';topic:string;title:string;rationale:string;evidenceIds:string[];risk:'low'|'medium'|'high';status:'queued'|'tested'|'rejected'|'approved-for-review'};
export type LearningAudit={at:string;accepted:number;candidates:number;rejected:number;gaps:number;codeProposals:number;skillProposals:number;productionPromotion:'blocked'};
