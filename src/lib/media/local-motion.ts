export type LocalMotionStyle='push-in'|'pan-right'|'pan-left'|'drift';

export async function animateImageToWebm(opts:{
  imageUrl:string;
  width:number;
  height:number;
  durationMs?:number;
  fps?:number;
  motion?:LocalMotionStyle;
  onProgress?:(value:number)=>void;
}){
  if(typeof window==='undefined')throw new Error('A geração local de vídeo só roda no navegador.');
  if(typeof MediaRecorder==='undefined')throw new Error('Seu navegador não oferece MediaRecorder para exportar vídeo.');

  const source=new Image();
  // Para URLs same-origin isso não é necessário, mas mantém compatibilidade
  // com providers configurados que enviem CORS corretamente.
  source.crossOrigin='anonymous';
  source.referrerPolicy='no-referrer';

  const loaded=new Promise<void>((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new Error('A imagem demorou demais para carregar.')),30000);
    source.onload=()=>{
      window.clearTimeout(timer);
      if(!source.naturalWidth||!source.naturalHeight)reject(new Error('A imagem não possui dimensões válidas.'));
      else resolve();
    };
    source.onerror=()=>{
      window.clearTimeout(timer);
      reject(new Error('Não foi possível ler a imagem para gerar o vídeo.'));
    };
  });
  source.src=opts.imageUrl;
  await loaded;

  const longest=Math.max(opts.width,opts.height);
  const scale=longest>1080?1080/longest:1;
  const width=Math.max(256,Math.round(opts.width*scale));
  const height=Math.max(256,Math.round(opts.height*scale));
  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvas indisponível.');

  const fps=Math.max(12,Math.min(opts.fps||24,30));
  const duration=Math.max(2500,Math.min(opts.durationMs||6000,12000));
  const capture=(canvas as HTMLCanvasElement & {captureStream?:(fps?:number)=>MediaStream}).captureStream;
  if(!capture)throw new Error('Seu navegador não oferece canvas.captureStream().');
  const stream=capture.call(canvas,fps);

  const mime=[
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ].find(x=>MediaRecorder.isTypeSupported(x))||'';
  if(!mime)throw new Error('Seu navegador não possui encoder WebM compatível.');

  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3_500_000});
  const chunks:BlobPart[]=[];
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};

  const motion=opts.motion||'push-in';
  const ease=(t:number)=>t*t*(3-2*t);
  const draw=(raw:number)=>{
    const progress=ease(Math.max(0,Math.min(1,raw)));
    const cover=Math.max(width/source.naturalWidth,height/source.naturalHeight);
    let zoom=1.02;
    let xBias=.5;
    let yBias=.5;

    if(motion==='push-in'){
      zoom=1.02+0.12*progress;
      xBias=.46+0.08*progress;
      yBias=.50-0.03*progress;
    }else if(motion==='pan-right'){
      zoom=1.08;
      xBias=.36+0.28*progress;
      yBias=.50;
    }else if(motion==='pan-left'){
      zoom=1.08;
      xBias=.64-0.28*progress;
      yBias=.50;
    }else{
      zoom=1.04+0.07*Math.sin(progress*Math.PI);
      xBias=.46+0.10*Math.sin(progress*Math.PI*2);
      yBias=.48+0.05*Math.cos(progress*Math.PI*2);
    }

    const sw=Math.min(source.naturalWidth,source.naturalWidth/(cover*zoom));
    const sh=Math.min(source.naturalHeight,source.naturalHeight/(cover*zoom));
    const panX=Math.max(0,Math.min(source.naturalWidth-sw,(source.naturalWidth-sw)*xBias));
    const panY=Math.max(0,Math.min(source.naturalHeight-sh,(source.naturalHeight-sh)*yBias));

    ctx.fillStyle='#000';
    ctx.fillRect(0,0,width,height);
    ctx.drawImage(source,panX,panY,sw,sh,0,0,width,height);

    const vignette=ctx.createRadialGradient(
      width/2,height/2,Math.min(width,height)*0.12,
      width/2,height/2,Math.max(width,height)*0.72
    );
    vignette.addColorStop(0,'rgba(0,0,0,0)');
    vignette.addColorStop(1,'rgba(0,0,0,.18)');
    ctx.fillStyle=vignette;
    ctx.fillRect(0,0,width,height);
  };

  // Primeiro frame antes de iniciar o encoder evita arquivos vazios em alguns Chromium.
  draw(0);

  return new Promise<Blob>((resolve,reject)=>{
    let stopped=false;
    const started=performance.now();

    const fail=(message:string)=>{
      if(stopped)return;
      stopped=true;
      try{if(recorder.state!=='inactive')recorder.stop()}catch{}
      stream.getTracks().forEach(t=>t.stop());
      reject(new Error(message));
    };

    recorder.onerror=()=>fail('Falha ao codificar o vídeo local.');
    recorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(stopped)return;
      stopped=true;
      const blob=new Blob(chunks,{type:mime});
      if(blob.size<2048){
        reject(new Error('O navegador gerou um arquivo de vídeo vazio.'));
        return;
      }
      opts.onProgress?.(1);
      resolve(blob);
    };

    try{recorder.start(250)}catch{fail('Não foi possível iniciar o encoder de vídeo.');return}

    const frame=(now:number)=>{
      if(stopped)return;
      const progress=Math.min(1,(now-started)/duration);
      draw(progress);
      opts.onProgress?.(progress);
      if(progress<1){
        requestAnimationFrame(frame);
      }else{
        try{recorder.requestData()}catch{}
        window.setTimeout(()=>{
          try{if(recorder.state!=='inactive')recorder.stop()}catch{fail('Falha ao finalizar o vídeo.')}
        },220);
      }
    };
    requestAnimationFrame(frame);
  });
}

export function downloadBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}


async function loadStoryboardImage(url:string,timeoutMs=55000){
  const image=new Image();
  image.crossOrigin='anonymous';
  image.referrerPolicy='no-referrer';
  const loaded=new Promise<HTMLImageElement>((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new Error('Uma cena demorou demais para carregar.')),timeoutMs);
    image.onload=()=>{
      window.clearTimeout(timer);
      if(!image.naturalWidth||!image.naturalHeight)reject(new Error('Uma cena retornou imagem inválida.'));
      else resolve(image);
    };
    image.onerror=()=>{
      window.clearTimeout(timer);
      reject(new Error('Não foi possível gerar/carregar uma das cenas do vídeo.'));
    };
  });
  image.src=url;
  return loaded;
}

export async function animateStoryboardToWebm(opts:{
  imageUrls:string[];
  width:number;
  height:number;
  durationMs?:number;
  fps?:number;
  onProgress?:(value:number)=>void;
  onFrameLoaded?:(loaded:number,total:number)=>void;
}){
  if(typeof window==='undefined')throw new Error('A geração local de vídeo só roda no navegador.');
  if(typeof MediaRecorder==='undefined')throw new Error('Seu navegador não oferece MediaRecorder.');
  if(opts.imageUrls.length<2)throw new Error('O storyboard precisa de pelo menos duas cenas.');

  const sources:HTMLImageElement[]=[];
  for(let i=0;i<opts.imageUrls.length;i++){
    sources.push(await loadStoryboardImage(opts.imageUrls[i]));
    opts.onFrameLoaded?.(i+1,opts.imageUrls.length);
    if(i<opts.imageUrls.length-1)await new Promise(r=>window.setTimeout(r,700));
  }

  const longest=Math.max(opts.width,opts.height);
  const scale=longest>1080?1080/longest:1;
  const width=Math.max(256,Math.round(opts.width*scale));
  const height=Math.max(256,Math.round(opts.height*scale));
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvas indisponível.');

  const fps=Math.max(12,Math.min(opts.fps||24,30));
  const duration=Math.max(5000,Math.min(opts.durationMs||9000,18000));
  const capture=(canvas as HTMLCanvasElement & {captureStream?:(fps?:number)=>MediaStream}).captureStream;
  if(!capture)throw new Error('Seu navegador não oferece canvas.captureStream().');
  const stream=capture.call(canvas,fps);
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
  if(!mime)throw new Error('Seu navegador não possui encoder WebM compatível.');

  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4_000_000});
  const chunks:BlobPart[]=[];
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};

  const ease=(t:number)=>t*t*(3-2*t);
  const drawCover=(img:HTMLImageElement,local:number,alpha=1,reverse=false)=>{
    const p=ease(Math.max(0,Math.min(1,local)));
    const cover=Math.max(width/img.naturalWidth,height/img.naturalHeight);
    const zoom=1.035+0.07*p;
    const sw=Math.min(img.naturalWidth,img.naturalWidth/(cover*zoom));
    const sh=Math.min(img.naturalHeight,img.naturalHeight/(cover*zoom));
    const bias=reverse?.58-.14*p:.42+.14*p;
    const panX=Math.max(0,Math.min(img.naturalWidth-sw,(img.naturalWidth-sw)*bias));
    const panY=Math.max(0,Math.min(img.naturalHeight-sh,(img.naturalHeight-sh)*(.49-.03*p)));
    ctx.globalAlpha=alpha;
    ctx.drawImage(img,panX,panY,sw,sh,0,0,width,height);
    ctx.globalAlpha=1;
  };

  const draw=(raw:number)=>{
    ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
    const segments=sources.length;
    const scaled=Math.min(segments-0.000001,Math.max(0,raw)*segments);
    const index=Math.min(segments-1,Math.floor(scaled));
    const local=scaled-index;
    const next=Math.min(segments-1,index+1);
    drawCover(sources[index],local,1,index%2===1);

    if(next!==index&&local>.72){
      const mix=ease((local-.72)/.28);
      drawCover(sources[next],Math.max(0,(local-.72)/.28),mix,next%2===1);
    }

    const vignette=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*.12,width/2,height/2,Math.max(width,height)*.76);
    vignette.addColorStop(0,'rgba(0,0,0,0)');
    vignette.addColorStop(1,'rgba(0,0,0,.17)');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  };

  draw(0);
  return new Promise<Blob>((resolve,reject)=>{
    let done=false;
    const started=performance.now();
    recorder.onerror=()=>{if(!done){done=true;stream.getTracks().forEach(t=>t.stop());reject(new Error('Falha ao codificar o storyboard.'));}};
    recorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(done)return;
      done=true;
      const blob=new Blob(chunks,{type:mime});
      if(blob.size<2048){reject(new Error('O storyboard gerou arquivo vazio.'));return}
      opts.onProgress?.(1);
      resolve(blob);
    };
    recorder.start(250);

    const frame=(now:number)=>{
      if(done)return;
      const progress=Math.min(1,(now-started)/duration);
      draw(progress);
      opts.onProgress?.(progress);
      if(progress<1)requestAnimationFrame(frame);
      else window.setTimeout(()=>{try{recorder.requestData()}catch{};window.setTimeout(()=>recorder.stop(),180)},80);
    };
    requestAnimationFrame(frame);
  });
}
