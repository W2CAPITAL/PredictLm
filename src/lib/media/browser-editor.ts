import {normalizeEditorProject,type EditorClip,type EditorFilter,type EditorProject} from './editor-model';

type Drawable=HTMLImageElement|HTMLVideoElement;
type AudioCapture={stream:MediaStream;source:MediaStreamAudioSourceNode;gain:GainNode}|null;

function loadImage(url:string){
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    const el=new Image();el.crossOrigin='anonymous';el.referrerPolicy='no-referrer';
    const timer=window.setTimeout(()=>reject(new Error('Imagem demorou demais para carregar.')),30000);
    el.onload=()=>{clearTimeout(timer);resolve(el)};
    el.onerror=()=>{clearTimeout(timer);reject(new Error('Não foi possível carregar uma imagem da timeline.'))};
    el.src=url;
  });
}

function loadVideo(url:string){
  return new Promise<HTMLVideoElement>((resolve,reject)=>{
    const el=document.createElement('video');
    el.crossOrigin='anonymous';el.preload='auto';el.playsInline=true;el.muted=true;
    const timer=window.setTimeout(()=>reject(new Error('Vídeo demorou demais para carregar.')),45000);
    el.onloadedmetadata=()=>{clearTimeout(timer);resolve(el)};
    el.onerror=()=>{clearTimeout(timer);reject(new Error('Não foi possível carregar um vídeo da timeline. Verifique CORS/origem do arquivo.'))};
    el.src=url;el.load();
  });
}

function filterCss(filter:EditorFilter){
  if(filter==='cinematic')return'contrast(1.08) saturate(.92) brightness(.96)';
  if(filter==='warm')return'sepia(.12) saturate(1.12) brightness(1.02)';
  if(filter==='cool')return'hue-rotate(8deg) saturate(.9) contrast(1.04)';
  if(filter==='mono')return'grayscale(1) contrast(1.08)';
  if(filter==='vivid')return'saturate(1.28) contrast(1.08)';
  return'none';
}

function drawMedia(ctx:CanvasRenderingContext2D,media:Drawable,width:number,height:number,fit:'cover'|'contain',alpha=1){
  const mw=media instanceof HTMLVideoElement?media.videoWidth:media.naturalWidth;
  const mh=media instanceof HTMLVideoElement?media.videoHeight:media.naturalHeight;
  if(!mw||!mh)return;
  const scale=fit==='contain'?Math.min(width/mw,height/mh):Math.max(width/mw,height/mh);
  const dw=mw*scale,dh=mh*scale,dx=(width-dw)/2,dy=(height-dh)/2;
  ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,alpha));ctx.drawImage(media,dx,dy,dw,dh);ctx.restore();
}

function drawCaption(ctx:CanvasRenderingContext2D,text:string,width:number,height:number){
  const caption=String(text||'').trim();if(!caption)return;
  const maxWidth=width*.84,font=Math.max(18,Math.round(width/32));
  ctx.save();ctx.font=`700 ${font}px system-ui,-apple-system,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const words=caption.split(/\s+/),lines:string[]=[];let line='';
  for(const word of words){const trial=(line+' '+word).trim();if(ctx.measureText(trial).width>maxWidth&&line){lines.push(line);line=word}else line=trial}
  if(line)lines.push(line);
  const shown=lines.slice(0,3),lineHeight=font*1.22,boxH=shown.length*lineHeight+font*.9,y=height-boxH/2-height*.055;
  ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(width*.06,y-boxH/2,width*.88,boxH);
  ctx.lineWidth=Math.max(2,font*.08);ctx.strokeStyle='rgba(0,0,0,.85)';ctx.fillStyle='#fff';
  shown.forEach((value,i)=>{const ly=y+(i-(shown.length-1)/2)*lineHeight;ctx.strokeText(value,width/2,ly,maxWidth);ctx.fillText(value,width/2,ly,maxWidth)});
  ctx.restore();
}

function connectCapturedAudio(media:HTMLVideoElement,clip:EditorClip,audioContext:AudioContext|null,audioDestination:MediaStreamAudioDestinationNode|null):AudioCapture{
  if(!audioContext||!audioDestination||clip.volume<=0)return null;
  const capture=(media as HTMLVideoElement&{captureStream?:()=>MediaStream}).captureStream;
  if(!capture)return null;
  try{
    const captured=capture.call(media);
    const audioTracks=captured.getAudioTracks();
    if(!audioTracks.length){captured.getTracks().forEach(track=>track.stop());return null}
    const audioOnly=new MediaStream(audioTracks);
    const source=audioContext.createMediaStreamSource(audioOnly);
    const gain=audioContext.createGain();gain.gain.value=clip.volume;
    source.connect(gain);gain.connect(audioDestination);
    return {stream:captured,source,gain};
  }catch{return null}
}

function disconnectCapturedAudio(capture:AudioCapture){
  if(!capture)return;
  try{capture.source.disconnect()}catch{}
  try{capture.gain.disconnect()}catch{}
  capture.stream.getTracks().forEach(track=>{try{track.stop()}catch{}});
}

async function recordClip(input:{clip:EditorClip;project:EditorProject;ctx:CanvasRenderingContext2D;width:number;height:number;onProgress?:(v:number)=>void;offset:number;total:number;audioContext:AudioContext|null;audioDestination:MediaStreamAudioDestinationNode|null}){
  const {clip,project,ctx,width,height}=input;
  const media=clip.kind==='image'?await loadImage(clip.url):await loadVideo(clip.url);
  let rawDuration=clip.duration;
  let audioCapture:AudioCapture=null;
  if(media instanceof HTMLVideoElement){
    const mediaDuration=Number.isFinite(media.duration)?media.duration:clip.duration;
    const end=clip.trimEnd==null?Math.min(mediaDuration,Math.max(clip.trimStart+.25,clip.trimStart+clip.duration)):Math.min(mediaDuration,Math.max(clip.trimStart+.1,clip.trimEnd));
    rawDuration=Math.max(.1,end-clip.trimStart);
    media.currentTime=Math.min(clip.trimStart,Math.max(0,mediaDuration-.05));media.playbackRate=clip.speed;
    await new Promise<void>(resolve=>{if(media.readyState>=2)return resolve();media.onseeked=()=>resolve();setTimeout(resolve,1200)});
    await media.play().catch(()=>{});
    audioCapture=connectCapturedAudio(media,clip,input.audioContext,input.audioDestination);
  }
  const duration=Math.max(.25,rawDuration/clip.speed),started=performance.now();
  try{
    await new Promise<void>((resolve,reject)=>{
      const frame=(now:number)=>{
        const local=Math.min(1,(now-started)/(duration*1000));
        ctx.save();ctx.fillStyle=project.background||'#000';ctx.fillRect(0,0,width,height);ctx.filter=filterCss(project.filter);
        const fadeWindow=Math.min(.22,Math.max(.06,.7/duration));
        const alpha=clip.transition==='fade'?Math.min(1,local/fadeWindow,(1-local)/fadeWindow):1;
        try{drawMedia(ctx,media,width,height,clip.fit,alpha)}catch{ctx.restore();reject(new Error('O navegador bloqueou o desenho do vídeo por CORS/origem. Use arquivo local ou mídia servida pelo próprio PredictLM.'));return}
        ctx.restore();drawCaption(ctx,project.caption,width,height);
        input.onProgress?.(Math.min(1,(input.offset+local*duration)/Math.max(.001,input.total)));
        if(local<1)requestAnimationFrame(frame);else resolve();
      };
      requestAnimationFrame(frame);
    });
  }finally{
    disconnectCapturedAudio(audioCapture);
    if(media instanceof HTMLVideoElement){try{media.pause()}catch{}media.removeAttribute('src');media.load()}
  }
}

export async function renderEditorProjectToWebm(projectInput:EditorProject,onProgress?:(value:number)=>void){
  if(typeof window==='undefined'||typeof MediaRecorder==='undefined')throw new Error('Exportação local exige um navegador com MediaRecorder.');
  const project=normalizeEditorProject(projectInput);
  if(!project.clips.length)throw new Error('Adicione pelo menos um clip à timeline.');
  const longest=Math.max(project.width,project.height),scale=longest>1280?1280/longest:1;
  const width=Math.max(256,Math.round(project.width*scale)),height=Math.max(256,Math.round(project.height*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas indisponível.');
  const capture=(canvas as HTMLCanvasElement&{captureStream?:(fps?:number)=>MediaStream}).captureStream;
  if(!capture)throw new Error('canvas.captureStream() indisponível.');
  const canvasStream=capture.call(canvas,project.fps);

  let audioContext:AudioContext|null=null;
  let audioDestination:MediaStreamAudioDestinationNode|null=null;
  try{
    if(typeof AudioContext!=='undefined'){
      audioContext=new AudioContext();
      await audioContext.resume().catch(()=>{});
      audioDestination=audioContext.createMediaStreamDestination();
    }
  }catch{audioContext=null;audioDestination=null}

  const stream=audioDestination
    ?new MediaStream([...canvasStream.getVideoTracks(),...audioDestination.stream.getAudioTracks()])
    :canvasStream;
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
  if(!mime){canvasStream.getTracks().forEach(x=>x.stop());if(audioContext)await audioContext.close().catch(()=>{});throw new Error('Encoder WebM indisponível.')}
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4_500_000}),chunks:BlobPart[]=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const stopped=new Promise<Blob>((resolve,reject)=>{
    recorder.onerror=()=>reject(new Error('Falha ao codificar a timeline.'));
    recorder.onstop=()=>{stream.getTracks().forEach(x=>x.stop());canvasStream.getTracks().forEach(x=>x.stop());const blob=new Blob(chunks,{type:mime});blob.size>2048?resolve(blob):reject(new Error('O encoder retornou um arquivo vazio.'))};
  });
  recorder.start(250);
  const total=project.clips.reduce((sum,c)=>sum+Math.max(.25,(c.trimEnd!=null?Math.max(.1,c.trimEnd-c.trimStart):c.duration)/c.speed),0);
  let offset=0;
  try{
    for(const clip of project.clips){
      const clipDuration=Math.max(.25,(clip.trimEnd!=null?Math.max(.1,clip.trimEnd-clip.trimStart):clip.duration)/clip.speed);
      await recordClip({clip,project,ctx,width,height,onProgress,offset,total,audioContext,audioDestination});offset+=clipDuration;
    }
    onProgress?.(1);try{recorder.requestData()}catch{};await new Promise(r=>setTimeout(r,120));recorder.stop();
    return await stopped;
  }catch(error){
    try{if(recorder.state!=='inactive')recorder.stop()}catch{}
    stream.getTracks().forEach(x=>x.stop());canvasStream.getTracks().forEach(x=>x.stop());
    throw error;
  }finally{
    if(audioContext)await audioContext.close().catch(()=>{});
  }
}

export function downloadEditorProject(project:EditorProject){
  const blob=new Blob([JSON.stringify(normalizeEditorProject(project),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='predictlm-imagine-edit.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
