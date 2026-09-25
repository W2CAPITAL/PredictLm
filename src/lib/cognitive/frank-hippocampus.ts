export interface FrankMemoryEngram{
  id:string;
  at:number;
  cue:string;
  gist:string;
  vector:number[];
  context:number[];
  emotion:number[];
  salience:number;
  strength:number;
  repetitions:number;
  consolidated:number;
}

export interface FrankHippocampusState{
  version:1;
  tick:number;
  entorhinal:number[];
  dentate:number[];
  ca3:number[];
  ca1:number[];
  engrams:FrankMemoryEngram[];
  novelty:number;
  mismatch:number;
  consolidation:number;
  lastRecall:string[];
}

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const norm=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
function hashUnit(s:string,i:number){
  let h=2166136261>>>0;
  const q=s+'#'+i;
  for(let k=0;k<q.length;k++){h^=q.charCodeAt(k);h=Math.imul(h,16777619)}
  h^=h>>>13;h=Math.imul(h,1274126177);h^=h>>>16;
  return (h>>>0)/4294967295;
}
function encode(text:string,size=48){
  const q=norm(text);
  const out=Array.from({length:size},(_,i)=>hashUnit(q,i)*2-1);
  for(const token of q.split(/\W+/).filter(Boolean)){
    for(let i=0;i<size;i++)out[i]+=((hashUnit(token,i)*2-1)*.42);
  }
  const m=Math.sqrt(out.reduce((a,b)=>a+b*b,0))||1;
  return out.map(x=>x/m);
}
function sparse(v:number[],keep=.18){
  const n=Math.max(1,Math.round(v.length*keep));
  const ranked=v.map((x,i)=>({i,a:Math.abs(x)})).sort((a,b)=>b.a-a.a);
  const allow=new Set(ranked.slice(0,n).map(x=>x.i));
  return v.map((x,i)=>allow.has(i)?x:0);
}
function dot(a:number[],b:number[]){
  let s=0;for(let i=0;i<Math.min(a.length,b.length);i++)s+=a[i]*b[i];return s;
}
function mix(a:number[],b:number[],w=.5){
  return a.map((x,i)=>x*(1-w)+(b[i]||0)*w);
}
function id(){return 'eng-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6)}

export function createFrankHippocampus():FrankHippocampusState{
  return {
    version:1,tick:0,
    entorhinal:Array(48).fill(0),dentate:Array(48).fill(0),ca3:Array(48).fill(0),ca1:Array(48).fill(0),
    engrams:[],novelty:.5,mismatch:.3,consolidation:.2,lastRecall:[]
  };
}

export function encodeFrankEpisode(
  previous:FrankHippocampusState|undefined,
  input:{cue:string;gist:string;context?:string;emotion?:number[];salience?:number}
):FrankHippocampusState{
  const prev=previous?.version===1?previous:createFrankHippocampus();
  const entorhinal=encode(input.cue+' | '+input.gist+' | '+(input.context||''));
  const dentate=sparse(entorhinal,.16);
  const similarities=prev.engrams.map(e=>dot(dentate,e.vector));
  const best=similarities.length?Math.max(...similarities):0;
  const novelty=clamp(.5+(1-best)*.5);
  const ca3=prev.engrams.length&&best>.62
    ? mix(dentate,prev.engrams[similarities.indexOf(best)].vector,.42)
    : dentate;
  const ca1=entorhinal.map((x,i)=>x-(ca3[i]||0));
  const mismatch=clamp(Math.sqrt(ca1.reduce((a,b)=>a+b*b,0))/2.5);
  const salience=clamp(input.salience??.55);
  const existingIndex=similarities.findIndex(x=>x>.86);
  let engrams=[...prev.engrams];
  if(existingIndex>=0){
    const e=engrams[existingIndex];
    engrams[existingIndex]={
      ...e,
      at:Date.now(),
      gist:input.gist.slice(0,320),
      vector:mix(e.vector,dentate,.28),
      context:mix(e.context,encode(input.context||'',24),.25),
      emotion:input.emotion?.slice(0,16)||e.emotion,
      salience:Math.max(e.salience,salience),
      strength:clamp(e.strength*.82+salience*.18),
      repetitions:e.repetitions+1,
      consolidated:clamp(e.consolidated+.05*salience)
    };
  }else{
    engrams.push({
      id:id(),at:Date.now(),cue:input.cue.slice(0,180),gist:input.gist.slice(0,320),
      vector:dentate,context:encode(input.context||'',24),
      emotion:(input.emotion||[]).slice(0,16),salience,
      strength:clamp(.42+salience*.46+novelty*.12),repetitions:1,
      consolidated:clamp(.08+salience*.16)
    });
  }
  engrams=engrams
    .sort((a,b)=>(b.strength*b.salience+b.consolidated*.3)-(a.strength*a.salience+a.consolidated*.3))
    .slice(0,220);
  return {
    version:1,tick:prev.tick+1,entorhinal,dentate,ca3,ca1,engrams,novelty,mismatch,
    consolidation:clamp(prev.consolidation*.78+salience*.12+(1-mismatch)*.1),
    lastRecall:prev.lastRecall.slice(0,6)
  };
}

export function recallFrankMemory(
  previous:FrankHippocampusState|undefined,
  cue:string,
  limit=5
){
  const prev=previous?.version===1?previous:createFrankHippocampus();
  const probe=sparse(encode(cue),.16);
  const ranked=prev.engrams
    .map(e=>({e,score:dot(probe,e.vector)*.58+e.strength*.18+e.salience*.12+e.consolidated*.12}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit);
  const lastRecall=ranked.filter(x=>x.score>.22).map(x=>x.e.id);
  return {
    state:{...prev,lastRecall,tick:prev.tick+1},
    memories:ranked.filter(x=>x.score>.22).map(x=>({...x.e,score:x.score}))
  };
}

export function consolidateFrankMemory(previous:FrankHippocampusState|undefined,sleepFactor=.5){
  const prev=previous?.version===1?previous:createFrankHippocampus();
  const engrams=prev.engrams.map(e=>({
    ...e,
    strength:clamp(e.strength*(.995+e.salience*.003)),
    consolidated:clamp(e.consolidated+sleepFactor*.025*e.salience*(1-e.consolidated))
  }));
  return {...prev,tick:prev.tick+1,engrams,consolidation:clamp(prev.consolidation*.9+sleepFactor*.1)};
}

export function hippocampusContext(s:FrankHippocampusState){
  return [
    'FRANK HIPPOCAMPUS',
    'Entorhinal input → dentate pattern separation → CA3 pattern completion → CA1 match/mismatch.',
    'Engrams '+s.engrams.length+'; novelty '+Math.round(s.novelty*100)+'%; mismatch '+Math.round(s.mismatch*100)+'%; systems-consolidation '+Math.round(s.consolidation*100)+'%.',
    'This is a computational memory architecture inspired by hippocampal function; it is not copied biological memory.'
  ].join('\n');
}
