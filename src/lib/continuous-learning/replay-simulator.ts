export type ReplayNode={
  id:string;
  parentId?:string|null;
  quality:number;
  costMs?:number;
  errors?:number;
  novelty?:number;
  terminal?:boolean;
};

export type DiscoveryTrace={
  id:string;
  topic:string;
  observedAt:string;
  nodes:ReplayNode[];
};

export type ExplorationPolicy={
  id:string;
  maxNodes:number;
  maxDepth:number;
  branchFactor:number;
  parallelism:number;
  continueThreshold:number;
  patience:number;
  minGain?:number;
};

export type ReplayTraceResult={
  traceId:string;
  visited:number;
  totalNodes:number;
  bestQuality:number;
  meanQuality:number;
  meanNovelty:number;
  errorCount:number;
  totalCostMs:number;
  utility:number;
};

export type ReplayPolicyResult={
  policy:ExplorationPolicy;
  traces:number;
  aggregateUtility:number;
  regressions:number;
  visited:number;
  totalCostMs:number;
  perTrace:ReplayTraceResult[];
};

function finite(value:number,fallback=0){
  return Number.isFinite(value)?value:fallback;
}

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,finite(value,min)));
}

function normalizePolicy(policy:ExplorationPolicy):ExplorationPolicy{
  return {
    ...policy,
    maxNodes:Math.max(1,Math.floor(finite(policy.maxNodes,1))),
    maxDepth:Math.max(0,Math.floor(finite(policy.maxDepth,0))),
    branchFactor:Math.max(1,Math.floor(finite(policy.branchFactor,1))),
    parallelism:Math.max(1,Math.floor(finite(policy.parallelism,1))),
    continueThreshold:clamp(policy.continueThreshold,0,1),
    patience:Math.max(1,Math.floor(finite(policy.patience,1))),
    minGain:Math.max(0,finite(policy.minGain||0,0))
  };
}

export function replayDiscoveryTrace(trace:DiscoveryTrace,rawPolicy:ExplorationPolicy):ReplayTraceResult{
  const policy=normalizePolicy(rawPolicy);
  const nodes=Array.isArray(trace.nodes)?trace.nodes:[];
  if(!nodes.length){
    return {
      traceId:trace.id,visited:0,totalNodes:0,bestQuality:0,meanQuality:0,
      meanNovelty:0,errorCount:0,totalCostMs:0,utility:0
    };
  }

  const byParent=new Map<string,ReplayNode[]>();
  const roots:ReplayNode[]=[];
  const knownIds=new Set(nodes.map(node=>node.id));
  for(const node of nodes){
    const parent=String(node.parentId||'');
    if(!parent||!knownIds.has(parent)){
      roots.push(node);
      continue;
    }
    const list=byParent.get(parent)||[];
    list.push(node);
    byParent.set(parent,list);
  }

  const queue=roots.map(node=>({node,depth:0}));
  const visited=new Set<string>();
  let qualitySum=0;
  let noveltySum=0;
  let bestQuality=0;
  let errors=0;
  let totalCostMs=0;
  let stagnant=0;

  while(queue.length&&visited.size<policy.maxNodes&&stagnant<policy.patience){
    const batch=queue.splice(0,policy.parallelism);
    for(const item of batch){
      if(visited.size>=policy.maxNodes)break;
      const {node,depth}=item;
      if(visited.has(node.id)||depth>policy.maxDepth)continue;
      visited.add(node.id);

      const quality=clamp(node.quality,0,1);
      const novelty=clamp(node.novelty||0,0,1);
      const gain=quality-bestQuality;
      bestQuality=Math.max(bestQuality,quality);
      qualitySum+=quality;
      noveltySum+=novelty;
      errors+=Math.max(0,Math.floor(finite(node.errors||0,0)));
      totalCostMs+=Math.max(0,finite(node.costMs||0,0));

      if(gain>=(policy.minGain||0)&&gain>0)stagnant=0;
      else stagnant+=1;

      if(node.terminal||quality<policy.continueThreshold||depth>=policy.maxDepth)continue;
      const children=(byParent.get(node.id)||[]).slice(0,policy.branchFactor);
      for(const child of children)queue.push({node:child,depth:depth+1});
    }
  }

  const count=visited.size;
  const meanQuality=count?qualitySum/count:0;
  const meanNovelty=count?noveltySum/count:0;
  const coverage=count/Math.max(1,nodes.length);
  const errorPenalty=Math.min(.2,errors*.02);
  const costPenalty=Math.min(.2,(totalCostMs/300000)*.08);
  const utility=clamp(bestQuality*.65+meanQuality*.18+meanNovelty*.08+coverage*.09-errorPenalty-costPenalty,0,1);

  return {
    traceId:trace.id,visited:count,totalNodes:nodes.length,bestQuality,meanQuality,
    meanNovelty,errorCount:errors,totalCostMs,utility
  };
}

export function evaluateReplayPool(
  traces:DiscoveryTrace[],
  policy:ExplorationPolicy,
  baseline?:ReplayPolicyResult,
  regressionTolerance=.015
):ReplayPolicyResult{
  const perTrace=traces.map(trace=>replayDiscoveryTrace(trace,policy));
  const aggregateUtility=perTrace.length
    ?perTrace.reduce((sum,item)=>sum+item.utility,0)/perTrace.length
    :0;
  const baselineByTrace=new Map((baseline?.perTrace||[]).map(item=>[item.traceId,item.utility]));
  const regressions=perTrace.filter(item=>{
    const previous=baselineByTrace.get(item.traceId);
    return previous!==undefined&&item.utility+regressionTolerance<previous;
  }).length;

  return {
    policy:normalizePolicy(policy),traces:perTrace.length,aggregateUtility,regressions,
    visited:perTrace.reduce((sum,item)=>sum+item.visited,0),
    totalCostMs:perTrace.reduce((sum,item)=>sum+item.totalCostMs,0),
    perTrace
  };
}

export function chooseReplayPolicy(input:{
  traces:DiscoveryTrace[];
  current:ExplorationPolicy;
  candidates:ExplorationPolicy[];
  minAggregateGain?:number;
  regressionTolerance?:number;
}){
  const baseline=evaluateReplayPool(input.traces,input.current);
  const evaluated=input.candidates
    .filter(candidate=>candidate.id!==input.current.id)
    .map(candidate=>evaluateReplayPool(input.traces,candidate,baseline,input.regressionTolerance));
  const minGain=Math.max(0,finite(input.minAggregateGain||.005,.005));
  const eligible=evaluated
    .filter(result=>result.regressions===0&&result.aggregateUtility>=baseline.aggregateUtility+minGain)
    .sort((a,b)=>b.aggregateUtility-a.aggregateUtility||a.totalCostMs-b.totalCostMs);
  const selected=eligible[0]||baseline;

  return {
    selected,
    baseline,
    evaluations:[baseline,...evaluated],
    changed:selected.policy.id!==baseline.policy.id,
    requiresReview:selected.policy.id!==baseline.policy.id,
    productionPromotion:'blocked' as const,
    note:'Replay validates only against recorded history. A selected policy still requires live canary evaluation, regression checks and human review before persistent promotion.'
  };
}
