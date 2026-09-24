import { compactText } from '@/lib/token-budget';

export type ImagineParityStyle='Cinematic'|'Photoreal'|'Editorial'|'3D'|'Anime'|'Minimal'|'Product'|string;

const STYLE_DIRECTION:Record<string,string>={
  cinematic:'cinematic key art, dramatic composition, intentional lens language, volumetric depth, strong foreground/midground/background separation, film-grade lighting',
  photoreal:'photorealistic image, physically plausible materials, natural skin/material response, realistic lens and exposure, fine micro-detail',
  editorial:'premium editorial photography, art-directed composition, controlled negative space, polished color grade, publication-ready visual hierarchy',
  '3d':'high-end 3D render, physically based materials, coherent global illumination, clean geometry, cinematic depth and production-quality surfacing',
  anime:'premium anime key visual, faithful character design, expressive pose, clean line hierarchy, detailed cel shading, dynamic effects, feature-film composition',
  minimal:'minimal composition, precise geometry, disciplined negative space, clean lighting, intentional visual hierarchy, no decorative clutter',
  product:'premium product advertising image, accurate product geometry, controlled studio lighting, crisp material definition, commercial art direction'
};

function normalizeStyle(style:string){
  const key=String(style||'Cinematic').trim().toLowerCase();
  return STYLE_DIRECTION[key]||STYLE_DIRECTION.cinematic;
}

function aspectDirection(width:number,height:number){
  const ratio=width/Math.max(1,height);
  if(ratio>1.55)return 'wide landscape composition with a strong horizontal action/read flow';
  if(ratio<0.72)return 'vertical composition optimized for mobile viewing with clear top-to-bottom hierarchy';
  if(ratio>1.15)return 'landscape composition with balanced subject spacing';
  if(ratio<0.9)return 'portrait composition with strong subject separation';
  return 'square composition with a clear focal center and controlled edge balance';
}

export function expandImagePromptForParity(input:{
  originalPrompt:string;
  preparedPrompt?:string;
  style?:ImagineParityStyle;
  width:number;
  height:number;
  attempt?:number;
  identityLock?:string;
  referenceEvidence?:string;
}){
  const original=compactText(String(input.originalPrompt||'').trim(),520);
  const prepared=compactText(String(input.preparedPrompt||'').trim(),1000);
  const attempt=Math.max(0,Math.floor(Number(input.attempt)||0));
  const style=normalizeStyle(String(input.style||'Cinematic'));

  const directives=[
    'PREDICTLM IMAGE GENERATION CONTRACT — create ONE finished image, not a text answer, not a storyboard, not a collage and not a placeholder.',
    'USER REQUEST (preserve literally): '+original,
    'VISUAL DIRECTION: '+style+'.',
    'COMPOSITION: '+aspectDirection(input.width,input.height)+'. Build a decisive focal point, readable silhouettes, purposeful depth, convincing scale and a frame that feels deliberately art-directed rather than randomly sampled.',
    'FIDELITY: every named character, product, object, garment, logo-like symbol, color relationship, transformation/power form and requested interaction is mandatory. Never replace a specific subject with a generic lookalike.',
    'IMAGE QUALITY: crisp focal details, coherent anatomy and geometry, clean hands/faces when present, consistent perspective, physically believable light/material interaction, controlled highlights, rich local contrast, no muddy textures, no accidental duplicate subjects.',
    'TEXT/ARTIFACT CONTROL: no watermark, no fake UI, no random letters, no captions inside the image unless the user explicitly asked for visible text.',
    attempt>0
      ? 'VARIATION: this is regeneration attempt '+attempt+'. Preserve the requested identity/content while changing camera position, framing, staging and visual hierarchy substantially.'
      : 'VARIATION: choose a strong original camera/framing; do not default to a generic centered portrait unless the request clearly calls for one.',
    input.identityLock||'',
    input.referenceEvidence||'',
    prepared&&prepared!==original?('PREPARED MEDIA BRIEF (supporting context; never override the user request): '+prepared):''
  ].filter(Boolean);

  return compactText(directives.join('\n\n'),2200);
}

export function parityCaptionPtBr(originalPrompt:string){
  const subject=compactText(String(originalPrompt||'').trim(),120);
  return subject?'Imagem gerada para: '+subject:'Imagem gerada.';
}
