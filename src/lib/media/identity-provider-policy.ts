export interface IdentityProviderDecisionInput{
  providerId:string;
  identitySensitive:boolean;
  strictIdentityProvider:boolean;
  requireReferenceTransport:boolean;
  referenceEvidenceAvailable:boolean;
  canTransportReferences:boolean;
  avoidProviders?:Iterable<string>;
}

export interface IdentityProviderDecision{
  allowed:boolean;
  reason:''|'avoided'|'text-only-identity-provider'|'reference-transport-required';
}

export function identityProviderDecision(input:IdentityProviderDecisionInput):IdentityProviderDecision{
  const id=String(input.providerId||'').trim().toLowerCase();
  const avoided=new Set(Array.from(input.avoidProviders||[],x=>String(x||'').trim().toLowerCase()).filter(Boolean));
  if(avoided.has(id))return {allowed:false,reason:'avoided'};

  if(input.identitySensitive&&input.strictIdentityProvider&&id==='nano-banana'){
    return {allowed:false,reason:'text-only-identity-provider'};
  }

  if(
    input.requireReferenceTransport&&
    input.referenceEvidenceAvailable&&
    !input.canTransportReferences
  ){
    return {allowed:false,reason:'reference-transport-required'};
  }

  return {allowed:true,reason:''};
}
