import {fusionHealth,FUSION_SOURCES,type FusionSurface} from '@/lib/fusion/capability-fabric';

export type RuntimeAdapterId=
  |'firecrawl'
  |'comfyui-image'
  |'comfyui-video'
  |'comfyui-upscale'
  |'paddleocr'
  |'media-upscaler'
  |'voice-studio'
  |'animegan-stylizer'
  |'scrapling'
  |'changedetection'
  |'chrome-devtools'
  |'trackstudio';

export interface RuntimeAdapterState{
  id:RuntimeAdapterId;
  label:string;
  surfaces:FusionSurface[];
  configured:boolean;
  mode:'hosted-api'|'self-hosted'|'local-bridge';
  required:string[];
  optional:string[];
  notes:string;
}

function has(name:string){
  return Boolean(String(process.env[name]||'').trim());
}

function any(names:string[]){
  return names.some(has);
}

export function runtimeAdapterStates():RuntimeAdapterState[]{
  return [
    {
      id:'firecrawl',
      label:'Firecrawl',
      surfaces:['research','browser','documents'],
      configured:has('FIRECRAWL_API_KEY'),
      mode:'hosted-api',
      required:['FIRECRAWL_API_KEY'],
      optional:[],
      notes:'Search/scrape path. Falls back to free research providers when absent.'
    },
    {
      id:'comfyui-image',
      label:'ComfyUI Image',
      surfaces:['media'],
      configured:any(['COMFYUI_IMAGE_BASE_URL','COMFYUI_BASE_URL'])&&has('COMFYUI_IMAGE_WORKFLOW_JSON'),
      mode:'self-hosted',
      required:['COMFYUI_IMAGE_BASE_URL or COMFYUI_BASE_URL','COMFYUI_IMAGE_WORKFLOW_JSON'],
      optional:['COMFYUI_IMAGE_OUTPUT_NODE'],
      notes:'Workflow JSON receives PredictLM prompt/seed/size/reference tokens.'
    },
    {
      id:'comfyui-video',
      label:'ComfyUI Video',
      surfaces:['video'],
      configured:has('COMFYUI_VIDEO_BASE_URL')&&has('COMFYUI_VIDEO_WORKFLOW_JSON'),
      mode:'self-hosted',
      required:['COMFYUI_VIDEO_BASE_URL','COMFYUI_VIDEO_WORKFLOW_JSON'],
      optional:[],
      notes:'Existing queued video workflow adapter with image-to-video support.'
    },
    {
      id:'comfyui-upscale',
      label:'ComfyUI Upscale',
      surfaces:['media'],
      configured:any(['COMFYUI_UPSCALE_BASE_URL','COMFYUI_BASE_URL'])&&has('COMFYUI_UPSCALE_WORKFLOW_JSON'),
      mode:'self-hosted',
      required:['COMFYUI_UPSCALE_BASE_URL or COMFYUI_BASE_URL','COMFYUI_UPSCALE_WORKFLOW_JSON'],
      optional:['COMFYUI_UPSCALE_OUTPUT_NODE'],
      notes:'Optional workflow stage for local/offline super-resolution.'
    },
    {
      id:'paddleocr',
      label:'PaddleOCR / PP-Structure',
      surfaces:['documents'],
      configured:any(['PADDLEOCR_BASE_URL','DOCUMENT_OCR_BASE_URL']),
      mode:'self-hosted',
      required:['PADDLEOCR_BASE_URL or DOCUMENT_OCR_BASE_URL'],
      optional:['PADDLEOCR_API_KEY','DOCUMENT_OCR_API_KEY'],
      notes:'Layout/tables/formulas OCR adapter. The core does not pretend OCR ran when absent.'
    },
    {
      id:'media-upscaler',
      label:'Generic Upscale Adapter',
      surfaces:['media'],
      configured:has('MEDIA_UPSCALE_BASE_URL'),
      mode:'self-hosted',
      required:['MEDIA_UPSCALE_BASE_URL'],
      optional:['MEDIA_UPSCALE_API_KEY','MEDIA_UPSCALE_MODEL','MEDIA_UPSCALE_MODE'],
      notes:'Compatible with Real-ESRGAN/Upscayl-style HTTP bridges.'
    },
    {
      id:'voice-studio',
      label:'Voice Studio Bridge',
      surfaces:['voice','media'],
      configured:has('VOICE_STUDIO_BASE_URL'),
      mode:'local-bridge',
      required:['VOICE_STUDIO_BASE_URL'],
      optional:['VOICE_STUDIO_API_KEY'],
      notes:'Optional transcription/synthesis/dubbing bridge; identity-sensitive voice cloning still requires explicit consent.'
    },
    {
      id:'animegan-stylizer',
      label:'AnimeGAN Stylizer',
      surfaces:['media','video'],
      configured:has('ANIMEGAN_BASE_URL'),
      mode:'self-hosted',
      required:['ANIMEGAN_BASE_URL'],
      optional:['ANIMEGAN_API_KEY','ANIMEGAN_MODEL'],
      notes:'Optional stylization pass; never replaces identity/reference grounding.'
    },
    {
      id:'scrapling',
      label:'Scrapling Extractor',
      surfaces:['research','browser'],
      configured:has('SCRAPLING_BASE_URL'),
      mode:'self-hosted',
      required:['SCRAPLING_BASE_URL'],
      optional:['SCRAPLING_API_KEY'],
      notes:'Optional resilient extraction bridge used only when explicitly configured.'
    },
    {
      id:'changedetection',
      label:'ChangeDetection',
      surfaces:['research','browser'],
      configured:has('CHANGEDETECTION_BASE_URL'),
      mode:'self-hosted',
      required:['CHANGEDETECTION_BASE_URL'],
      optional:['CHANGEDETECTION_API_KEY'],
      notes:'Optional website change watch backend; monitoring is never claimed when this adapter is absent.'
    },
    {
      id:'chrome-devtools',
      label:'Chrome DevTools MCP',
      surfaces:['browser','build'],
      configured:has('CHROME_DEVTOOLS_MCP_URL'),
      mode:'local-bridge',
      required:['CHROME_DEVTOOLS_MCP_URL'],
      optional:[],
      notes:'Optional browser debugging bridge for DOM/network/console/performance evidence.'
    },
    {
      id:'trackstudio',
      label:'TrackStudio',
      surfaces:['media','video'],
      configured:has('TRACKSTUDIO_BASE_URL'),
      mode:'self-hosted',
      required:['TRACKSTUDIO_BASE_URL'],
      optional:['TRACKSTUDIO_API_KEY'],
      notes:'Optional temporal/object tracking bridge for identity and scene continuity.'
    }
  ];
}

export function capabilityRuntimeSnapshot(){
  const adapters=runtimeAdapterStates();
  return {
    fusion:fusionHealth(),
    sources:FUSION_SOURCES.length,
    adapters,
    configuredAdapters:adapters.filter(x=>x.configured).map(x=>x.id),
    offlineFirst:true,
    generatedAt:new Date().toISOString()
  };
}
