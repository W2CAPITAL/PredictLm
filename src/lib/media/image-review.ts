export interface ImageQualityReview{
  score:number;
  observations:string[];
  promptHints:string[];
  metrics:{
    brightness:number;
    contrast:number;
    clipping:number;
    edgeEnergy:number;
    saturation:number;
  };
}

async function loadImage(url:string){
  const img=new Image();
  img.crossOrigin='anonymous';
  img.referrerPolicy='no-referrer';
  const ready=new Promise<HTMLImageElement>((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new Error('Tempo excedido ao analisar a imagem anterior.')),25000);
    img.onload=()=>{window.clearTimeout(timer);resolve(img)};
    img.onerror=()=>{window.clearTimeout(timer);reject(new Error('Não foi possível analisar a imagem anterior.'))};
  });
  img.src=url;
  return ready;
}

export async function reviewImageQuality(url:string):Promise<ImageQualityReview>{
  if(typeof window==='undefined')throw new Error('A revisão visual precisa do navegador.');
  const img=await loadImage(url);
  const max=320;
  const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const width=Math.max(32,Math.round(img.naturalWidth*scale));
  const height=Math.max(32,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas indisponível para revisão visual.');
  ctx.drawImage(img,0,0,width,height);
  const data=ctx.getImageData(0,0,width,height).data;

  let lumSum=0,lumSq=0,clip=0,satSum=0,edges=0,edgeCount=0;
  const lums=new Float32Array(width*height);
  for(let i=0,p=0;i<data.length;i+=4,p++){
    const r=data[i],g=data[i+1],b=data[i+2];
    const lum=.2126*r+.7152*g+.0722*b;
    lums[p]=lum;
    lumSum+=lum;lumSq+=lum*lum;
    if(lum<8||lum>247)clip++;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    satSum+=mx===0?0:(mx-mn)/mx;
  }
  for(let y=1;y<height;y++){
    for(let x=1;x<width;x++){
      const p=y*width+x;
      edges+=Math.abs(lums[p]-lums[p-1])+Math.abs(lums[p]-lums[p-width]);
      edgeCount+=2;
    }
  }
  const count=width*height;
  const brightness=lumSum/count;
  const contrast=Math.sqrt(Math.max(0,lumSq/count-brightness*brightness));
  const clipping=clip/count;
  const edgeEnergy=edgeCount?edges/edgeCount:0;
  const saturation=satSum/count;

  const observations:string[]=[];
  const promptHints:string[]=[];
  // This is a technical pixel-level heuristic, not semantic/identity validation.
  // Keep headroom so the UI never presents a theatrical 100/100 from luminance/edges alone.
  let score=94;

  if(brightness<42){score-=18;observations.push('imagem muito escura');promptHints.push('lift exposure while preserving black detail and natural highlights')}
  if(brightness>218){score-=18;observations.push('imagem clara demais');promptHints.push('recover highlight detail and use balanced exposure')}
  if(contrast<24){score-=14;observations.push('baixo contraste/volume');promptHints.push('stronger depth separation, dimensional lighting and local contrast')}
  if(clipping>.18){score-=18;observations.push('áreas extensas estouradas ou esmagadas');promptHints.push('avoid clipped blacks and blown highlights')}
  if(edgeEnergy<5.5){score-=15;observations.push('pouca definição aparente');promptHints.push('crisp focal subject, fine material detail and clean edges')}
  if(saturation<.07){score-=8;observations.push('cores excessivamente apagadas');promptHints.push('controlled color separation and richer but natural chroma')}
  if(saturation>.72){score-=10;observations.push('saturação excessiva');promptHints.push('restrained natural color grading and realistic materials')}

  if(!observations.length){
    observations.push('métricas técnicas equilibradas; fidelidade de identidade/composição ainda depende de revisão semântica');
    promptHints.push('preserve technical clarity, exact subject identity and requested action while improving composition, camera position and visual hierarchy');
  }

  return {
    score:Math.max(0,Math.min(94,Math.round(score))),
    observations,
    promptHints,
    metrics:{
      brightness:Math.round(brightness),
      contrast:Math.round(contrast),
      clipping:Number(clipping.toFixed(3)),
      edgeEnergy:Number(edgeEnergy.toFixed(2)),
      saturation:Number(saturation.toFixed(3))
    }
  };
}

export async function preloadGeneratedImage(url:string,timeoutMs=55000){
  const img=new Image();
  img.crossOrigin='anonymous';
  img.referrerPolicy='no-referrer';
  return new Promise<{width:number;height:number}>((resolve,reject)=>{
    const timer=window.setTimeout(()=>reject(new Error('A imagem demorou demais para ficar pronta.')),timeoutMs);
    img.onload=()=>{
      window.clearTimeout(timer);
      if(!img.naturalWidth||!img.naturalHeight)reject(new Error('A imagem retornou sem dimensões válidas.'));
      else resolve({width:img.naturalWidth,height:img.naturalHeight});
    };
    img.onerror=()=>{window.clearTimeout(timer);reject(new Error('O provider não entregou uma imagem válida.'))};
    img.src=url;
  });
}

// Semantic review is separate from pixel metrics: no model means unverified.
export async function reviewSemanticImage(url:string,prompt:string):Promise<import('./canonical-matchup').SemanticImageReview>{
  const unavailable={status:'unavailable' as const,issues:[],retryPrompt:''};
  try{
    const img=await loadImage(url);
    const scale=Math.min(1,768/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=canvas.getContext('2d');if(!ctx)return unavailable;
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const response=await fetch('/api/media/review',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt,image:canvas.toDataURL('image/jpeg',.85)}),
      signal:AbortSignal.timeout(28000)
    });
    if(!response.ok)return unavailable;
    const data=await response.json();
    if(data?.status==='passed')return {status:'passed',issues:[],retryPrompt:''};
    if(data?.status==='failed'&&Array.isArray(data?.issues)){
      return {
        status:'failed',
        issues:data.issues.map((x:any)=>String(x||'').trim()).filter(Boolean).slice(0,6),
        retryPrompt:String(data?.retryPrompt||'').trim().slice(0,1400)
      };
    }
    return unavailable;
  }catch{return unavailable;}
}

export async function reviewCanonicalImage(url:string,prompt:string){
  return reviewSemanticImage(url,prompt);
}
