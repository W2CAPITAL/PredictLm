import { compactText } from '@/lib/token-budget';

export type MediaPipelinePattern={
  id:string;
  name:string;
  repo:string;
  role:string;
  runtime:'browser'|'adapter'|'reference';
};

export const MEDIA_PIPELINE_PATTERNS:MediaPipelinePattern[]=[
  {id:'agnes-scenes',name:'Multi-scene orchestration',repo:'lcy362/agnes-video-generator',role:'prompt → scenes → narration/subtitles → resume',runtime:'reference'},
  {id:'openmontage',name:'Agentic production pipeline',repo:'calesthio/OpenMontage',role:'research → script → assets → timeline → composition',runtime:'reference'},
  {id:'toonflow',name:'Storyboard production graph',repo:'HBAI-Ltd/Toonflow-app',role:'planning → characters → storyboard → supervision',runtime:'reference'},
  {id:'pixelle',name:'Video workflow nodes',repo:'ATH-MaaS/Pixelle-Video',role:'visual workflow and generation adapters',runtime:'reference'},
  {id:'openshorts',name:'Short-form assembly',repo:'mutonby/openshorts',role:'shorts pipeline',runtime:'reference'},
  {id:'youtube-shorts',name:'AI Shorts pipeline',repo:'Anil-matcha/AI-Youtube-Shorts-Generator',role:'short script/assets/render flow',runtime:'reference'},
  {id:'hotclip',name:'Clip extraction/composition',repo:'xixihhhh/hotclip',role:'clip workflow',runtime:'reference'},
  {id:'veo',name:'Veo provider adapter',repo:'mountsea-ai/veo-api',role:'optional hosted video provider',runtime:'adapter'},
  {id:'seedance',name:'Seedance provider adapter',repo:'seedance2-api/seedance2-api',role:'optional hosted video provider',runtime:'adapter'},
  {id:'sora',name:'Sora provider adapter',repo:'mountsea-ai/sora-api',role:'optional hosted video provider',runtime:'adapter'},
  {id:'seedance-prompts',name:'Seedance prompt reference',repo:'HiAPIAI/awesome-seedance-2-0-prompts',role:'prompt examples/reference',runtime:'reference'},
  {id:'forge-film',name:'Film orchestration',repo:'F-R-L/forge-film',role:'film planning and shot continuity',runtime:'reference'},
  {id:'helios',name:'Long-video model reference',repo:'PKU-YuanGroup/Helios',role:'long-video coherence; not a Vercel runtime',runtime:'reference'},
  {id:'short-video-maker',name:'Local short compositor',repo:'gyoridavid/short-video-maker',role:'TTS/captions/background/remotion patterns',runtime:'reference'},
  {id:'consisid',name:'Identity consistency reference',repo:'PKU-YuanGroup/ConsisID',role:'identity-preserving image-to-video research',runtime:'reference'}
];

export function buildLocalMotionPlan(prompt:string,aspect:string){
  return [
    'Use a imagem gerada como keyframe principal.',
    'Movimento local: push-in suave de 6s com pan cinematográfico.',
    'Formato '+aspect+'; sem nova chamada de API.',
    'Exportação WebM pelo navegador; arquivo não é enviado ao Supabase por padrão.',
    prompt.trim()?('Direção visual: '+prompt.trim()):'Manter a composição original.'
  ];
}


export type StoryboardFrame={
  id:string;
  label:string;
  prompt:string;
  seedOffset:number;
};

export function buildStoryboardFrames(prompt:string,style:string,aspect:string):StoryboardFrame[]{
  const subject=compactText(prompt.trim()||'cinematic subject',180);
  const continuity='same subject identity, same wardrobe/materials, same environment, same color palette, '+style.toLowerCase()+', '+aspect+', coherent continuity, high detail, no watermark';
  return [
    {
      id:'establishing',
      label:'Plano geral',
      seedOffset:0,
      prompt:subject+', wide establishing shot, clear environment, cinematic depth, '+continuity
    },
    {
      id:'action',
      label:'Ação',
      seedOffset:17,
      prompt:subject+', medium dynamic action shot, stronger motion cues, consistent subject and environment, '+continuity
    },
    {
      id:'reveal',
      label:'Revelação',
      seedOffset:31,
      prompt:subject+', close cinematic reveal, expressive detail, dramatic lighting peak, consistent subject and environment, '+continuity
    }
  ];
}
