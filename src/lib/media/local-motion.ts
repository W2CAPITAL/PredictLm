export async function animateImageToWebm(opts:{
  imageUrl:string;
  width:number;
  height:number;
  durationMs?:number;
  fps?:number;
  onProgress?:(value:number)=>void;
}){
  if(typeof window==='undefined')throw new Error('Animação local só roda no navegador.');
  if(typeof MediaRecorder==='undefined')throw new Error('Seu navegador não oferece MediaRecorder.');

  const source=new Image();
  source.crossOrigin='anonymous';
  source.referrerPolicy='no-referrer';
  source.src=opts.imageUrl;
  await new Promise<void>((resolve,reject)=>{
    source.onload=()=>resolve();
    source.onerror=()=>reject(new Error('Não foi possível ler a imagem para animação local.'));
  });

  const longest=Math.max(opts.width,opts.height);
  const scale=longest>960?960/longest:1;
  const width=Math.max(256,Math.round(opts.width*scale));
  const height=Math.max(256,Math.round(opts.height*scale));
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas indisponível.');

  const fps=Math.max(12,Math.min(opts.fps||24,30));
  const duration=Math.max(2500,Math.min(opts.durationMs||6000,12000));
  const stream=(canvas as any).captureStream(fps) as MediaStream;
  const mime=[
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ].find(x=>MediaRecorder.isTypeSupported(x))||'video/webm';
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2_500_000});
  const chunks:BlobPart[]=[];
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};

  const draw=(progress:number)=>{
    const cover=Math.max(width/source.naturalWidth,height/source.naturalHeight);
    const zoom=1+0.08*progress;
    const sw=source.naturalWidth/(cover*zoom);
    const sh=source.naturalHeight/(cover*zoom);
    const panX=(source.naturalWidth-sw)*(0.42+0.16*progress);
    const panY=(source.naturalHeight-sh)*(0.48-0.05*progress);
    ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
    ctx.drawImage(source,panX,panY,sw,sh,0,0,width,height);
    const vignette=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*0.1,width/2,height/2,Math.max(width,height)*0.75);
    vignette.addColorStop(0,'rgba(0,0,0,0)');
    vignette.addColorStop(1,'rgba(0,0,0,.16)');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  };

  return new Promise<Blob>((resolve,reject)=>{
    const started=performance.now();
    recorder.onerror=()=>reject(new Error('Falha ao codificar o vídeo local.'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}));
    recorder.start(250);

    const frame=(now:number)=>{
      const progress=Math.min(1,(now-started)/duration);
      draw(progress);
      opts.onProgress?.(progress);
      if(progress<1)requestAnimationFrame(frame);
      else setTimeout(()=>recorder.stop(),100);
    };
    requestAnimationFrame(frame);
  });
}

export function downloadBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
