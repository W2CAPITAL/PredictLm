import {bioAiSurfaceDirectives,type BioAISurface} from './bioai';
import type {AgenticRole,AgenticSurface} from './agent-runtime/agentic-fabric';

export interface BioAIOrchestrationNode{
  id:string;
  role:AgenticRole;
  dependsOn:string[];
  purpose:string;
  writesToSharedMemory:boolean;
}

export interface BioAIOrchestrationPlan{
  identity:'PredictLM BioAI';
  surface:AgenticSurface;
  prompt:string;
  nodes:BioAIOrchestrationNode[];
  parallelGroups:string[][];
  sharedMemory:true;
  sharedIdentity:true;
  maxPasses:number;
  context:string;
}

const PURPOSE:Record<AgenticRole,string>={
  explorer:'inspect current evidence/code/state before proposing changes',
  architect:'choose the smallest coherent architecture that preserves existing constraints',
  implementer:'apply executable changes to the requested artifact',
  researcher:'collect relevant primary/official evidence and preserve provenance',
  reviewer:'check requirement coverage, contradictions and regressions',
  'test-analyst':'run or design reproducible tests and interpret failures',
  'security-reviewer':'check secrets, unsafe boundaries and permission escalation',
  'visual-director':'preserve visual hierarchy, composition and continuity',
  'identity-reviewer':'verify named-subject identity and requested semantic fidelity',
  'game-producer':'coordinate scope of the same LifeVoxel world',
  'game-designer':'check loops, affordances and progression in the same LifeVoxel world',
  'game-technical-director':'check world-state/runtime performance and deterministic persistence',
  'game-art-director':'check camera, readability and world rendering',
  'gameplay-specialist':'check executable player/BioAI actions and consequences',
  'playtest-reviewer':'check observable world behavior instead of narration-only success',
  verifier:'accept only evidence-backed completion'
};

function bioSurface(surface:AgenticSurface):BioAISurface{
  return surface==='media'?'image':surface==='simulation'?'simulation':surface;
}

export function buildBioAIOrchestration(input:{
  prompt:string;
  surface:AgenticSurface;
  roles:AgenticRole[];
  maxPasses:number;
}):BioAIOrchestrationPlan{
  const roles=[...new Set(input.roles.length?input.roles:['verifier'])];
  const nodes:BioAIOrchestrationNode[]=roles.map((role,index)=>{
    const previous=index?roles[index-1]:null;
    const canParallel=role==='security-reviewer'||role==='test-analyst'||role==='identity-reviewer';
    return {
      id:'bioai-'+String(index+1).padStart(2,'0')+'-'+role,
      role,
      dependsOn:previous&&!canParallel?['bioai-'+String(index).padStart(2,'0')+'-'+previous]:[],
      purpose:PURPOSE[role],
      writesToSharedMemory:true
    };
  });

  const reviewIds=nodes.filter(x=>['reviewer','test-analyst','security-reviewer','identity-reviewer','playtest-reviewer'].includes(x.role)).map(x=>x.id);
  const parallelGroups=reviewIds.length>1?[reviewIds]:[];

  return {
    identity:'PredictLM BioAI',
    surface:input.surface,
    prompt:input.prompt,
    nodes,
    parallelGroups,
    sharedMemory:true,
    sharedIdentity:true,
    maxPasses:Math.max(1,Math.min(6,input.maxPasses||1)),
    context:[
      'BIOAI ORCHESTRATOR — ChatDev-inspired staged/DAG collaboration inside one intelligence.',
      bioAiSurfaceDirectives(bioSurface(input.surface),input.prompt),
      'Every role is a temporary capability of PredictLM BioAI; never present roles as separate assistants or separate memories.',
      'All nodes read/write the same sanitized BioAI/project state. Parallel review nodes may disagree; the verifier resolves using evidence, tests and user intent.',
      ...nodes.map(x=>x.id+' · '+x.role+' · '+x.purpose+' · deps '+(x.dependsOn.join(', ')||'none')),
      parallelGroups.length?'Parallel review group: '+parallelGroups[0].join(', '):''
    ].filter(Boolean).join('\n')
  };
}

export function bioAIOrchestrationContext(input:{
  prompt:string;
  surface:AgenticSurface;
  roles:AgenticRole[];
  maxPasses:number;
}){
  return buildBioAIOrchestration(input).context;
}
