
import type {CognitiveState} from './cognitive-workspace';

const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const norm=(s:string)=>String(s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();

function isIdentitySensitive(input:string){
  const p=norm(input);
  return /\b(naruto|sasuke|kurama|susanoo|freeza|frieza|goku|vegeta|gohan|broly|oozaru|pikachu|sonic|mario|zelda|batman|superman|spider man|homem aranha|kuromi|hello kitty|personagem|character|franquia|franchise)\b/.test(p);
}

export interface CreativeMediaControl{
  novelty:number;
  fidelity:number;
  composition:number;
  publicBrief:string;
}

export function buildCreativeMediaControl(state:CognitiveState,prompt:string):CreativeMediaControl{
  const novelty=clamp(
    (state.human?.neuro?.curiosity??.5)*.28+
    (state.fly?.exploration??.5)*.2+
    (state.macaque?.regionalIntegration??.5)*.2+
    (state.organism?.drives?.curiosity??.5)*.32
  );
  const fidelity=clamp(
    (state.human?.executiveControl??.5)*.32+
    (state.human?.metacognition??.5)*.25+
    (1-(state.workspace?.uncertainty??.5))*.28+
    (state.workspace?.inhibition??.5)*.15
  );
  const composition=clamp(
    (state.human?.recurrentIntegration??.5)*.3+
    (state.macaque?.visualHierarchy??.5)*.25+
    (state.macaque?.pfcProjectionIntegration??.5)*.2+
    (state.organism?.drives?.novelty??.5)*.25
  );
  const sensitive=isIdentitySensitive(prompt);
  const publicBrief=[
    'PREDICTLM CREATIVE BRAIN — public control summary, not private reasoning.',
    'Novelty '+Math.round(novelty*100)+'%; fidelity discipline '+Math.round(fidelity*100)+'%; composition integration '+Math.round(composition*100)+'%.',
    sensitive
      ? 'Identity-sensitive request: creativity may change only camera, staging, lighting, depth and effects. It must NOT change character identity, canonical anatomy, costume, colors, subject count, requested form or action.'
      : 'Use controlled novelty to improve staging, camera, lighting, depth, visual hierarchy and one meaningful alternative composition without changing the user intent.',
    'Prefer a readable focal subject, coherent silhouettes and visible requested action. Do not add unrelated characters, technology motifs or decorative concepts.'
  ].join('\n');
  return {novelty,fidelity,composition,publicBrief};
}
