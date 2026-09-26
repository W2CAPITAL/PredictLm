import { compactText } from '@/lib/token-budget';

export type MediaQualityPass={
  id:string;
  label:string;
  required:boolean;
  goal:string;
};

export function mediaPostprocessPlan(input:{
  kind:'image'|'video';
  prompt:string;
  style?:string;
  identitySensitive?:boolean;
  hasReferences?:boolean;
}){
  const q=String(input.prompt||'').toLowerCase();
  const anime=/anime|manga|ghibli|cartoon|desenho|naruto|sasuke|kurama|susanoo/.test(q+' '+String(input.style||'').toLowerCase());
  const passes:MediaQualityPass[]=[
    {id:'semantic-lock',label:'Semantic lock',required:true,goal:'preserve requested subjects, count, action, canonical attributes and composition intent'},
    {id:'artifact-review',label:'Artifact review',required:true,goal:'detect anatomy/geometry duplication, text artifacts, broken hands/faces and scene drift'},
    {id:'lighting',label:'Lighting/color',required:false,goal:'improve contrast, material separation, readable silhouettes and cinematic depth'},
    {id:'upscale',label:'Upscale/detail',required:false,goal:'increase useful detail without halos, plastic textures or identity drift'}
  ];
  if(anime)passes.splice(2,0,{id:'anime-style',label:'Anime style pass',required:false,goal:'apply coherent anime/toon line, palette and shading while preserving identity'});
  if(input.kind==='video'){
    passes.splice(1,0,
      {id:'continuity',label:'Temporal continuity',required:true,goal:'preserve identity, wardrobe, environment, lighting and spatial state across frames'},
      {id:'motion',label:'Motion review',required:true,goal:'reject frozen slideshow output, teleporting camera, temporal warping and inconsistent physics'}
    );
  }
  return {
    version:1,
    identitySensitive:!!input.identitySensitive,
    referenceGrounded:!!input.hasReferences,
    anime,
    passes
  };
}

export function mediaQualityDirectives(input:{
  kind:'image'|'video';
  prompt:string;
  style?:string;
  identitySensitive?:boolean;
  hasReferences?:boolean;
}){
  const plan=mediaPostprocessPlan(input);
  return compactText([
    'MULTI-PASS MEDIA CONTRACT:',
    ...plan.passes.map((p,i)=>(i+1)+'. '+p.label+' — '+p.goal+'.'),
    plan.identitySensitive?'Identity fidelity is a hard gate; technical beauty cannot compensate for the wrong subject.':'',
    plan.referenceGrounded?'Reference pixels outrank stylistic embellishment when they conflict.':'',
    plan.anime?'Anime/toon stylization must preserve subject identity and scene semantics rather than replace them with a generic anime look.':'',
    input.kind==='video'?'Every shot must have a start state, physical action, end state and continuity handoff.':''
  ].filter(Boolean).join('\n'),1300);
}
