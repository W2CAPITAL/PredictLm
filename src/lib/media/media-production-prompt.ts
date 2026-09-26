import { compactText } from '@/lib/token-budget';

export type MediaReferenceRole='identity'|'geometry'|'opening-frame'|'ending-frame'|'motion-style'|'audio';

export type VideoProductionInput={
  prompt:string;
  style:string;
  aspect:string;
  durationMs:number;
  continuityContext?:string;
  directorBrief?:string;
  researchContext?:string;
  extraGuidance?:string;
};

export function imageProductionDirectives(input:{prompt:string;style:string;aspect:string}){
  const subject=compactText(String(input.prompt||'').trim(),420);
  const style=compactText(String(input.style||'Cinematic').trim(),80);
  const aspect=compactText(String(input.aspect||'').trim(),32);
  return compactText([
    'Create one decisive final frame around the exact requested subject/action: '+subject+'.',
    'Lock subject count, identity-defining colors/forms/wardrobe/materials and requested interaction before creative styling.',
    'Use one intentional camera position, readable silhouettes, foreground/midground/background separation and a clear focal hierarchy.',
    'Lighting, materials, anatomy and perspective must agree physically; effects may support the subject but must not hide it.',
    'Do not invent extra characters, logos, props, powers or text. Exact typography/signage should be treated as a separate precision asset unless explicitly required in-frame.',
    'Style: '+style+'. Aspect/composition target: '+aspect+'.'
  ].join(' '),1100);
}

export function compileVideoProductionPrompt(input:VideoProductionInput){
  const subject=compactText(String(input.prompt||'').trim(),520);
  const duration=Math.max(3,Math.round(Number(input.durationMs||6000)/1000));
  const style=compactText(String(input.style||'Cinematic').trim(),80);
  const aspect=compactText(String(input.aspect||'16:9').trim(),24);
  const continuity=compactText(String(input.continuityContext||'').trim(),520);
  const director=compactText(String(input.directorBrief||'').trim(),420);
  const research=compactText(String(input.researchContext||'').trim(),360);
  const extra=compactText(String(input.extraGuidance||'').trim(),420);

  return compactText([
    'CORE REQUEST: '+subject,
    'SHOT CONTRACT: Generate one coherent moving clip of about '+duration+' seconds in '+aspect+', '+style+' style. It must be real temporal motion, not a slideshow or still-frame pan/zoom.',
    'CHRONOLOGY: Stage a visible setup, then one causal change/action, then a readable resolution/end state. Keep events in viewing order and avoid unrelated cuts or location jumps.',
    'IDENTITY & CONTINUITY: Preserve subject count, identity anchors, wardrobe/materials, colors, scale, environment, screen direction and light direction from first frame to last.',
    'CAMERA: Use motivated camera movement/cuts only. Preserve spatial geography; no teleporting camera, unexplained axis flips or random reframing.',
    'MOTION & PHYSICS: Favor believable body/object motion, contact, inertia, secondary motion, stable anatomy/geometry and temporally coherent effects.',
    'AUDIO: When dialogue is requested keep lines short and explicit; otherwise use synchronized ambience/SFX that match the visible action. Do not invent narration unless asked.',
    'PRECISION TEXT: Treat exact signage/UI/long typography as a separate edit asset when the provider cannot render it reliably.',
    'END STATE: The final frame must clearly show the requested outcome and remain consistent with the opening identity/location.',
    continuity?('CONTINUITY LEDGER: '+continuity):'',
    director?('DIRECTOR BRIEF: '+director):'',
    research?('RESEARCH NOTES: '+research):'',
    extra?('EXTRA GUIDANCE: '+extra):''
  ].filter(Boolean).join('\n'),1900);
}

export function oneVariableVideoLadder(){
  return [
    {pass:'baseline',change:'none',keepFixed:'subject, action, camera, light',question:'Is the action and end state readable?'},
    {pass:'camera',change:'camera only',keepFixed:'subject, action, light, pace',question:'Does the move improve clarity without breaking geography?'},
    {pass:'pace',change:'timing only',keepFixed:'subject, action, camera, light',question:'Does motion feel physically credible?'},
    {pass:'look',change:'light/material only',keepFixed:'subject, action, camera, pace',question:'Are depth, surfaces and identity clearer?'},
    {pass:'finish',change:'sound/finish only',keepFixed:'all visual structure',question:'Does polish support rather than hide the idea?'}
  ] as const;
}

export function videoSemanticReviewChecklist(input:{identitySensitive?:boolean;exactText?:boolean}={}){
  return [
    'requested subject count and category are correct',
    ...(input.identitySensitive?['named identity/forms remain correct from first to last frame']:[]),
    'setup, causal action and final state are all visible',
    'screen direction, environment and camera geography remain coherent',
    'anatomy/geometry and object interactions remain stable through motion',
    'lighting/material response is temporally coherent',
    ...(input.exactText?['required exact text is readable or flagged for post-production']:[]),
    'no unrequested watermark, random UI, duplicate subject or unrelated cut'
  ];
}
