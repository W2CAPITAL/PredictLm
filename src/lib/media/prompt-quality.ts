import { compactText } from '@/lib/token-budget';

export interface QualityPromptOptions{
  style?:string;
  attempt?:number;
  previousPrompt?:string;
  purpose?:'image'|'keyframe';
}

const qualityCore=[
  'high fidelity',
  'tack-sharp focal detail',
  'clean high-frequency texture detail',
  'high dynamic range without crushed shadows',
  'stable anti-aliasing and clean edges',
  'coherent composition',
  'physically plausible perspective',
  'clean object boundaries',
  'consistent lighting and shadows',
  'natural proportions',
  'fine material detail',
  'high micro-contrast without oversharpening',
  'clean high-frequency detail',
  'no blur or smeared textures',
  'no painterly mush unless explicitly requested',
  'intentional focal point',
  'no watermark',
  'no accidental text',
  'no duplicated objects',
  'no malformed anatomy',
  'no extra limbs or fingers',
  'no fused objects',
  'no broken geometry',
  'no random artifacts',
  'no blur',
  'no smeared textures',
  'no ghosting',
  'no muddy details',
  'no low-resolution appearance',
  'no oversharpening halos',
  'no waxy or plastic skin',
  'no warped faces or asymmetrical eyes',
  'no melted hands or impossible joints',
  'no low-resolution texture patches'
].join(', ');

export function buildQualityImagePrompt(input:string,options:QualityPromptOptions={}){
  const raw=compactText(String(input||'').trim(),900);
  const style=compactText(String(options.style||'Cinematic').trim(),32);
  const attempt=Math.max(0,Math.floor(options.attempt||0));
  const variation=attempt>0
    ? 'Create a clearly different composition from the previous generation while preserving the requested subject and intent. Improve framing, anatomy/geometry, lighting, depth and visual coherence. Do not repeat the same camera angle or layout.'
    : 'Choose the strongest composition automatically.';
  const continuity=options.purpose==='keyframe'
    ? 'Maintain character/object identity, wardrobe/materials, environment and color palette consistently for use as a video keyframe.'
    : '';
  const previous=options.previousPrompt?.trim()
    ? 'Previous generation intent: '+compactText(options.previousPrompt.trim(),260)+'.'
    : '';
  return compactText([raw,style+' visual direction',qualityCore,variation,continuity,previous].filter(Boolean).join('. '),1800);
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
