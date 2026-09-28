import type {ImagePromptMode} from '@/lib/media/grok-imagine-parity';

function boolEnv(value:string|undefined,fallback=false){
  const text=String(value||'').trim();
  if(!text)return fallback;
  return /^(?:1|true|yes|on)$/i.test(text);
}

export function qwenImageConfig(env:NodeJS.ProcessEnv=process.env){
  const key=String(env.QWEN_IMAGE_API_KEY||env.DASHSCOPE_API_KEY||'').trim();
  return {
    enabled:!!key,
    key,
    base:String(env.QWEN_IMAGE_BASE_URL||'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').trim().replace(/\/$/,''),
    model:String(env.QWEN_IMAGE_MODEL||'qwen-image-3.0-pro').trim(),
    timeoutMs:Math.max(12000,Math.min(45000,Number(env.QWEN_IMAGE_TIMEOUT_MS)||28000)),
    promptExtendRaw:String(env.QWEN_IMAGE_PROMPT_EXTEND||'').trim(),
    enableThinking:boolEnv(env.QWEN_IMAGE_ENABLE_THINKING,false)
  };
}

export function qwenPromptExtend(promptMode:ImagePromptMode|String,rawEnv=''){
  const raw=String(rawEnv||'').trim();
  if(raw)return /^(?:1|true|yes|on)$/i.test(raw);
  return String(promptMode)!=='literal';
}

export function buildQwenImageRequestBody(input:{
  model:string;
  prompt:string;
  width:number;
  height:number;
  seed:number;
  negativePrompt?:string;
  references?:string[];
  promptMode:ImagePromptMode|String;
  promptExtendRaw?:string;
  enableThinking?:boolean;
}){
  const references=[...new Set((input.references||[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,3);
  return {
    model:input.model,
    prompt:input.prompt,
    size:Math.max(512,Math.min(2048,Math.round(input.width)))+'x'+Math.max(512,Math.min(2048,Math.round(input.height))),
    n:1,
    seed:Math.max(0,Math.min(2147483647,Math.floor(Number(input.seed)||0))),
    ...(input.negativePrompt?{negative_prompt:input.negativePrompt}:{}),
    ...(references.length?{image:references}:{}),
    prompt_extend:qwenPromptExtend(input.promptMode,input.promptExtendRaw),
    prompt_extend_mode:'direct',
    enable_thinking:!!input.enableThinking,
    watermark:false
  };
}
