export interface ConnectomeEdge{
  pre:string;
  post:string;
  weight:number;
  region?:string;
  transmitter?:string;
  sign?:'excitatory'|'inhibitory'|'unknown';
}

function csvRows(text:string){
  const lines=text.replace(/\r/g,'').split('\n').filter(Boolean);
  if(!lines.length)return [] as Record<string,string>[];
  const header=lines[0].split(',').map(x=>x.trim());
  return lines.slice(1).map(line=>{
    const cols=line.split(',');
    return Object.fromEntries(header.map((h,i)=>[h,(cols[i]||'').trim()]));
  });
}

export function parseFlyWireConnectionsCsv(text:string,limit=5000):ConnectomeEdge[]{
  return csvRows(text).slice(0,Math.max(1,limit)).map(row=>({
    pre:row.pre_root_id||row.pre_pt_root_id||row.pre||'',
    post:row.post_root_id||row.post_pt_root_id||row.post||'',
    weight:Number(row.syn_count||row.weight||1)||1,
    region:row.neuropil||row.region||undefined,
    transmitter:row.nt_type||row.neurotransmitter||undefined,
    sign:/gaba/i.test(row.nt_type||'')?'inhibitory':/acetylcholine|ach|glutamate/i.test(row.nt_type||'')?'excitatory':'unknown'
  })).filter(x=>x.pre&&x.post);
}

export function parseH01EdgeSubsetCsv(text:string,limit=5000):ConnectomeEdge[]{
  return csvRows(text).slice(0,Math.max(1,limit)).map(row=>({
    pre:row.pre_id||row.pre_root_id||row.source||row.pre||'',
    post:row.post_id||row.post_root_id||row.target||row.post||'',
    weight:Number(row.syn_count||row.weight||row.count||1)||1,
    region:row.layer||row.region||undefined,
    transmitter:row.type||row.synapse_type||undefined,
    sign:/inhib/i.test(row.type||row.synapse_type||'')?'inhibitory':/excit/i.test(row.type||row.synapse_type||'')?'excitatory':'unknown'
  })).filter(x=>x.pre&&x.post);
}

export function summarizeConnectomeEdges(edges:ConnectomeEdge[]){
  if(!edges.length)return {nodes:0,edges:0,totalWeight:0,excitation:0,inhibition:0,regions:0};
  const nodes=new Set<string>();
  const regions=new Set<string>();
  let totalWeight=0,exc=0,inh=0;
  for(const edge of edges){
    nodes.add(edge.pre);nodes.add(edge.post);
    if(edge.region)regions.add(edge.region);
    totalWeight+=edge.weight;
    if(edge.sign==='excitatory')exc+=edge.weight;
    if(edge.sign==='inhibitory')inh+=edge.weight;
  }
  return {
    nodes:nodes.size,
    edges:edges.length,
    totalWeight,
    excitation:totalWeight?exc/totalWeight:0,
    inhibition:totalWeight?inh/totalWeight:0,
    regions:regions.size
  };
}
