import {compactText} from '@/lib/token-budget';

export interface MediaContinuityLedger{
  version:1;
  subjectLock:string;
  environmentLock:string;
  cameraRule:string;
  temporalRules:string[];
  evidenceFields:string[];
}

function clean(value:string,max=260){
  return compactText(String(value||'').replace(/\s+/g,' ').trim(),max);
}

function subjectHint(prompt:string){
  const q=clean(prompt,280);
  if(!q)return 'the same requested subjects, count, identity, wardrobe/materials and canonical attributes';
  return 'the exact subjects requested in: "'+q+'"';
}

export function buildMediaContinuityLedger(input:{
  prompt:string;
  style?:string;
  aspect?:string;
  referenceCount?:number;
}):MediaContinuityLedger{
  const style=clean(input.style||'Cinematic',48);
  const aspect=clean(input.aspect||'16:9',24);
  const refs=Math.max(0,Math.floor(Number(input.referenceCount)||0));
  return {
    version:1,
    subjectLock:subjectHint(input.prompt)+(refs?' · '+refs+' visual reference(s) outrank stylistic invention':''),
    environmentLock:'Keep one coherent environment, time-of-day, lighting direction, scale and spatial layout unless the user explicitly requests a transition.',
    cameraRule:'Camera motion may change framing, but must not teleport subjects, reverse spatial relationships or create unexplained cuts. Aspect '+aspect+'.',
    temporalRules:[
      'Track each named subject as the same entity across every frame/shot.',
      'Keep wardrobe, materials, colors, symbols, body/object geometry and relative scale stable.',
      'Every shot has an observable start state, physical action and end state that becomes the next shot start state.',
      'Secondary motion must follow the primary action; avoid frozen subjects with only pan/zoom.',
      'Do not duplicate, merge or silently replace tracked subjects.',
      'Visual style remains '+style+' while identity and scene semantics stay fixed.'
    ],
    evidenceFields:[
      'subject identity',
      'subject count',
      'wardrobe/material state',
      'environment/location',
      'camera position/motion',
      'start state',
      'action',
      'end state'
    ]
  };
}

export function mediaContinuityContext(input:{
  prompt:string;
  style?:string;
  aspect?:string;
  referenceCount?:number;
}){
  const ledger=buildMediaContinuityLedger(input);
  return [
    'TEMPORAL CONTINUITY LEDGER (TrackStudio-inspired identity tracking pattern):',
    'SUBJECT LOCK · '+ledger.subjectLock,
    'ENVIRONMENT LOCK · '+ledger.environmentLock,
    'CAMERA · '+ledger.cameraRule,
    ...ledger.temporalRules.map(rule=>'RULE · '+rule),
    'VERIFY · '+ledger.evidenceFields.join(' · ')
  ].join('\n');
}
