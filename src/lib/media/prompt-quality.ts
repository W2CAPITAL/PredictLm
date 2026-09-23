export interface QualityPromptOptions{
  style?:string;
  attempt?:number;
  previousPrompt?:string;
  purpose?:'image'|'keyframe';
}

const qualityCore=[
  'high fidelity',
  'coherent composition',
  'physically plausible perspective',
  'clean object boundaries',
  'consistent lighting and shadows',
  'natural proportions',
  'fine material detail',
  'intentional focal point',
  'no watermark',
  'no accidental text',
  'no duplicated objects',
  'no malformed anatomy',
  'no extra limbs or fingers',
  'no fused objects',
  'no broken geometry',
  'no random artifacts'
].join(', ');

export function buildQualityImagePrompt(input:string,options:QualityPromptOptions={}){
  const raw=String(input||'').trim();
  const style=String(options.style||'Cinematic').trim();
  const attempt=Math.max(0,Math.floor(options.attempt||0));
  const variation=attempt>0
    ? 'Create a clearly different composition from the previous generation while preserving the requested subject and intent. Improve framing, anatomy/geometry, lighting, depth and visual coherence. Do not repeat the same camera angle or layout.'
    : 'Choose the strongest composition automatically.';
  const continuity=options.purpose==='keyframe'
    ? 'Maintain character/object identity, wardrobe/materials, environment and color palette consistently for use as a video keyframe.'
    : '';
  const previous=options.previousPrompt?.trim()
    ? 'Previous generation intent: '+options.previousPrompt.trim().slice(0,600)+'.'
    : '';
  return [raw,style+' visual direction',qualityCore,variation,continuity,previous].filter(Boolean).join('. ');
}

export function autoVariationSeed(previous?:number){
  const current=Math.max(0,Math.floor(Number(previous)||0));
  try{
    if(typeof crypto!=='undefined'&&crypto.getRandomValues){
      const arr=new Uint32Array(1);
      crypto.getRandomValues(arr);
      const value=1+(arr[0]%2147483000);
      return value===current?((value+7919)%2147483000)+1:value;
    }
  }catch{}
  const value=1+Math.floor(Math.random()*2147483000);
  return value===current?((value+7919)%2147483000)+1:value;
}
