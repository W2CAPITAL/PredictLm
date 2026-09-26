import {capabilityRuntimeSnapshot} from '@/lib/fusion/runtime-adapters';
import {fusionSourcesFor,type FusionSurface} from '@/lib/fusion/capability-fabric';
import {fusionImplementationAudit} from '@/lib/fusion/implementation-audit';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const allowed=new Set<FusionSurface>(['chat','build','research','memory','documents','media','video','simulation','voice','browser']);

export async function GET(req:Request){
  const url=new URL(req.url);
  const requested=String(url.searchParams.get('surface')||'').trim() as FusionSurface;
  const surface=allowed.has(requested)?requested:null;
  const snapshot=capabilityRuntimeSnapshot();
  const implementation=fusionImplementationAudit();
  return Response.json({
    ...snapshot,
    implementation,
    ...(surface?{surface,patterns:fusionSourcesFor(surface,String(url.searchParams.get('q')||''),12)}:{})
  },{headers:{'Cache-Control':'no-store'}});
}
