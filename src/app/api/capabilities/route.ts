import {AGENTIC_ROLES} from '@/lib/agent-runtime/agentic-fabric';
import {skills} from '@/lib/skills';
import {capabilityRuntimeSnapshot} from '@/lib/fusion/runtime-adapters';
import {fusionSourcesFor,type FusionSurface} from '@/lib/fusion/capability-fabric';
import {fusionImplementationAudit} from '@/lib/fusion/implementation-audit';
import {minecraftReferenceAudit} from '@/lib/simulation/minecraft-reference-fabric';
import {unityWebGLConfigured} from '@/lib/unity-fabric';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const allowed=new Set<FusionSurface>(['chat','build','research','memory','documents','media','video','simulation','voice','browser']);

export async function GET(req:Request){
  const url=new URL(req.url);
  const requested=String(url.searchParams.get('surface')||'').trim() as FusionSurface;
  const surface=allowed.has(requested)?requested:null;
  const snapshot=capabilityRuntimeSnapshot();
  const implementation=fusionImplementationAudit();
  const minecraft=minecraftReferenceAudit();
  const catalog={
    skills:skills.map(skill=>({
      id:skill.id,
      name:skill.name,
      category:skill.category,
      description:skill.description,
      source:skill.source,
      runtime:skill.runtime
    })),
    agents:[...AGENTIC_ROLES]
  };
  return Response.json({
    ...snapshot,
    catalog,
    implementation,
    minecraft,
    unity:{webglConfigured:unityWebGLConfigured(),fabric:'src/lib/unity-fabric.ts'},
    ...(surface?{surface,patterns:fusionSourcesFor(surface,String(url.searchParams.get('q')||''),12)}:{})
  },{headers:{'Cache-Control':'no-store'}});
}
