import type {MinecraftRenderPreset} from '@/lib/simulation/minecraft-render-optimizer';

export interface MinecraftMediaExportMeta{
  kind:'image'|'video';
  preset:MinecraftRenderPreset;
  sourceWidth:number;
  sourceHeight:number;
  outputWidth:number;
  outputHeight:number;
  fps?:number;
  enhancementStages:string[];
}

function safeName(value:string){
  return value.replace(/[^a-z0-9-_]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').toLowerCase();
}

export function minecraftMediaFileName(kind:'image'|'video',seed:number,preset:MinecraftRenderPreset){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  return safeName('predictlm-minecraft-'+seed+'-'+preset+'-'+stamp)+(kind==='image'?'.png':'.webm');
}

export async function exportEnhancedCanvasPng(
  source:HTMLCanvasElement,
  options:{seed:number;preset:MinecraftRenderPreset;contrast:number;saturation:number;maxEdge?:number}
){
  const rect=source.getBoundingClientRect();
  const dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1);
  const maxEdge=Math.max(1280,Math.min(4096,options.maxEdge||2560));
  const desiredW=Math.max(source.width,Math.floor(rect.width*dpr));
  const desiredH=Math.max(source.height,Math.floor(rect.height*dpr));
  const limit=Math.min(1,maxEdge/Math.max(desiredW,desiredH));
  const width=Math.max(1,Math.floor(desiredW*limit));
  const height=Math.max(1,Math.floor(desiredH*limit));
  const output=document.createElement('canvas');
  output.width=width;output.height=height;
  const ctx=output.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D indisponível para exportação.');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.filter='contrast('+options.contrast.toFixed(3)+') saturate('+options.saturation.toFixed(3)+')';
  ctx.drawImage(source,0,0,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>{
    output.toBlob(value=>value?resolve(value):reject(new Error('Falha ao codificar PNG.')),'image/png');
  });
  const filename=minecraftMediaFileName('image',options.seed,options.preset);
  const meta:MinecraftMediaExportMeta={
    kind:'image',preset:options.preset,sourceWidth:source.width,sourceHeight:source.height,
    outputWidth:width,outputHeight:height,
    enhancementStages:['adaptive-render-scale','high-quality-spatial-resample','contrast/saturation-preservation','png-encode']
  };
  return{blob,filename,meta};
}

export function downloadBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}

export function mediaRecorderForCanvas(
  canvas:HTMLCanvasElement,
  options:{fps:number;mimeType:string;bitsPerSecond?:number}
){
  if(typeof MediaRecorder==='undefined'||typeof canvas.captureStream!=='function')throw new Error('Gravação de canvas não é suportada neste navegador.');
  const stream=canvas.captureStream(Math.max(1,Math.min(120,options.fps)));
  const recorder=new MediaRecorder(stream,{
    ...(options.mimeType?{mimeType:options.mimeType}:{}),
    videoBitsPerSecond:options.bitsPerSecond||8_000_000
  });
  return{recorder,stream};
}
