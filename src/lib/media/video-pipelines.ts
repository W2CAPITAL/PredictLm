import { compactText } from '@/lib/token-budget';
import {mediaContinuityContext} from '@/lib/media/continuity-tracker';
import {unityFabricContext} from '@/lib/unity-fabric';
import {compileVideoProductionPrompt} from '@/lib/media/media-production-prompt';

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
  {id:'sora2-prompt-director',name:'Chronological video prompt director',repo:'Reviral-ai/awesome-sora-2-prompts',role:'identity anchors → setup/change/resolution → motivated camera → continuity → audio/edit handoff',runtime:'reference'},
  {id:'sora2-playground',name:'Recoverable video jobs',repo:'alasano/sora-2-playground',role:'queue → persisted job id → refresh-safe polling → remix → IndexedDB/serverless storage',runtime:'reference'},
  {id:'higgsfield-cli',name:'Higgsfield CLI bridge',repo:'higgsfield-ai/cli',role:'authenticated external CLI with image/video/3D/audio generation; not a Vercel-native API endpoint',runtime:'adapter'},
  {id:'seedance-prompts',name:'Seedance prompt reference',repo:'HiAPIAI/awesome-seedance-2-0-prompts',role:'prompt examples/reference',runtime:'reference'},
  {id:'forge-film',name:'Film orchestration',repo:'F-R-L/forge-film',role:'film planning and shot continuity',runtime:'reference'},
  {id:'helios',name:'Long-video model reference',repo:'PKU-YuanGroup/Helios',role:'long-video coherence; not a Vercel runtime',runtime:'reference'},
  {id:'short-video-maker',name:'Local short compositor',repo:'gyoridavid/short-video-maker',role:'TTS/captions/background/remotion patterns',runtime:'reference'},
  {id:'consisid',name:'Identity consistency reference',repo:'PKU-YuanGroup/ConsisID',role:'identity-preserving image-to-video research',runtime:'reference'},
  {id:'ltx-comfyui',name:'LTX Video via ComfyUI',repo:'Lightricks/ComfyUI-LTXVideo',role:'real neural text/image-to-video workflows, draft→refine/upscale and audio/video generation',runtime:'adapter'},
  {id:'sana-video2',name:'SANA-Video 2.0',repo:'NVlabs/Sana',role:'efficient 720p text-to-video and text-image-to-video; 5s/8s release patterns',runtime:'adapter'},
  {id:'infinity',name:'Infinity visual synthesis',repo:'FoundationVision/Infinity',role:'prompt rewrite, high-resolution synthesis and self-correction patterns',runtime:'reference'},
  {id:'custom-diffusion',name:'Custom Diffusion concepts',repo:'adobe-research/custom-diffusion',role:'few-shot concept identity preservation and multi-concept composition patterns',runtime:'reference'},
  {id:'imagdressing',name:'IMAGDressing concepts',repo:'muzishen/IMAGDressing',role:'reference-conditioned identity/garment preservation with adapter-style control',runtime:'reference'},
  {id:'trackstudio',name:'Temporal identity tracking',repo:'playbox-dev/trackstudio',role:'stable tracked entity identity, cross-view continuity and scene-state ledger patterns',runtime:'reference'},
  {id:'youtube-agent',name:'Recoverable video production jobs',repo:'darkzOGx/youtube-automation-agent',role:'script → assets → render → publish job-stage and recovery patterns',runtime:'reference'},
  {id:'comfyui',name:'ComfyUI workflow graph',repo:'Comfy-Org/ComfyUI',role:'optional local/self-hosted graph for image/video stages',runtime:'adapter'},
  {id:'animeganv3',name:'AnimeGAN stylization',repo:'TachibanaYoshino/AnimeGANv3',role:'optional anime/toon stylization pass after semantic identity is locked',runtime:'adapter'},
  {id:'upscayl',name:'Upscale/restoration',repo:'upscayl/upscayl',role:'optional super-resolution postprocess through configured bridge',runtime:'adapter'}
];

export function buildLocalMotionPlan(prompt:string,aspect:string){
  return [
    'Use a imagem gerada como keyframe principal.',
    'Motion fallback local: push-in/pan sobre keyframe; isto não sintetiza movimento neural novo.',
    'Formato '+aspect+'; sem nova chamada de API.',
    'Exportação WebM pelo navegador; usar somente quando nenhum provider generativo real estiver configurado.',
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
  const continuityLedger=mediaContinuityContext({prompt,style,aspect});
  const continuity='same subject identity, same wardrobe/materials, same environment, same color palette, '+style.toLowerCase()+', '+aspect+', coherent continuity, high detail, no watermark. '+compactText(continuityLedger,420);
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


export function buildGenerativeVideoPrompt(input:{
  prompt:string;
  style:string;
  aspect:string;
  durationMs:number;
  directorBrief?:string;
  researchContext?:string;
}){
  const continuity=mediaContinuityContext({
    prompt:input.prompt,
    style:input.style,
    aspect:input.aspect
  });
  const unitySceneGuidance=/\b(unity|gameplay|game|jogo|voxel|3d|camera|câmera|cinematic|cinemático)\b/i.test(input.prompt)
    ? unityFabricContext()
    : '';
  return compileVideoProductionPrompt({
    prompt:input.prompt,
    style:input.style,
    aspect:input.aspect,
    durationMs:input.durationMs,
    continuityContext:continuity,
    directorBrief:input.directorBrief,
    researchContext:input.researchContext,
    extraGuidance:unitySceneGuidance
  });
}

export function mediaResearchQuery(prompt:string,kind:'image'|'video',style:string){
  const core=compactText(String(prompt||'').trim(),240);
  return [
    'deep research visual production references for',
    kind==='video'?'real generative video':'image generation',
    core,
    style,
    'canonical identity composition lighting camera material motion continuity reference'
  ].join(' ');
}

export function formatMediaResearchContext(data:any){
  const rows=[
    ...(Array.isArray(data?.web)?data.web:[]),
    ...(Array.isArray(data?.news)?data.news:[])
  ].slice(0,8);
  const images=(Array.isArray(data?.images)?data.images:[]).slice(0,4);
  const textRows=rows.map((x:any)=>[
    String(x?.title||'').trim(),
    String(x?.summary||x?.description||'').replace(/\s+/g,' ').trim().slice(0,220),
    x?.url?('source '+String(x.url)):''
  ].filter(Boolean).join(' — '));
  const imageRows=images.map((x:any)=>[
    String(x?.title||'visual reference').trim(),
    x?.site?('site '+String(x.site)):'',
    x?.url?('source '+String(x.url)):''
  ].filter(Boolean).join(' — '));
  return compactText([...textRows,...imageRows].join('\n'),1200);
}
