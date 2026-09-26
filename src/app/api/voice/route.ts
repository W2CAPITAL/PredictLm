import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

type VoiceMode='synthesize'|'transcribe'|'dub';

function config(){
  const base=String(process.env.VOICE_STUDIO_BASE_URL||'').trim().replace(/\/$/,'');
  return {
    base,
    key:String(process.env.VOICE_STUDIO_API_KEY||'').trim(),
    synthPath:String(process.env.VOICE_STUDIO_SYNTH_PATH||'/synthesize').trim(),
    transcribePath:String(process.env.VOICE_STUDIO_TRANSCRIBE_PATH||'/transcribe').trim(),
    dubPath:String(process.env.VOICE_STUDIO_DUB_PATH||'/dub').trim()
  };
}

function safeMode(value:any):VoiceMode|null{
  const mode=String(value||'').toLowerCase();
  return mode==='synthesize'||mode==='transcribe'||mode==='dub'?mode:null;
}

function endpoint(base:string,path:string){
  return base+'/'+path.replace(/^\/+/, '');
}

export async function GET(){
  const cfg=config();
  return NextResponse.json({
    configured:!!cfg.base,
    provider:cfg.base?'voice-studio-bridge':'browser-voice',
    modes:cfg.base?['synthesize','transcribe','dub']:['browser-synthesis'],
    identitySensitiveAudio:'explicit-consent-required'
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const mode=safeMode(body?.mode);
    if(!mode)return NextResponse.json({error:'mode must be synthesize, transcribe or dub'},{status:400});

    const cfg=config();
    if(!cfg.base){
      return NextResponse.json({
        error:'VoiceStudio bridge não configurado no servidor.',
        code:'VOICE_STUDIO_NOT_CONFIGURED',
        browserFallback:mode==='synthesize',
        required:['VOICE_STUDIO_BASE_URL']
      },{status:503});
    }

    const cloneVoice=Boolean(body?.cloneVoice||body?.voiceReference);
    if(cloneVoice&&body?.consent!==true){
      return NextResponse.json({
        error:'Clonagem/identidade de voz exige consentimento explícito.',
        code:'VOICE_CONSENT_REQUIRED'
      },{status:400});
    }

    const text=String(body?.text||'').trim().slice(0,12000);
    const sourceUrl=String(body?.sourceUrl||'').trim().slice(0,4000);
    if(mode==='synthesize'&&!text)return NextResponse.json({error:'text is required'},{status:400});
    if((mode==='transcribe'||mode==='dub')&&!sourceUrl)return NextResponse.json({error:'sourceUrl is required'},{status:400});

    const path=mode==='synthesize'?cfg.synthPath:mode==='transcribe'?cfg.transcribePath:cfg.dubPath;
    const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json, audio/*, video/*'};
    if(cfg.key)headers.Authorization='Bearer '+cfg.key;

    const upstream=await fetch(endpoint(cfg.base,path),{
      method:'POST',
      headers,
      body:JSON.stringify({
        mode,
        text,
        sourceUrl,
        language:String(body?.language||'pt-BR').slice(0,16),
        voice:String(body?.voice||'').slice(0,160),
        speed:Number.isFinite(Number(body?.speed))?Math.max(.5,Math.min(2,Number(body.speed))):1,
        cloneVoice,
        voiceReference:String(body?.voiceReference||'').slice(0,4000),
        consent:body?.consent===true
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(55000)
    });

    const contentType=String(upstream.headers.get('content-type')||'');
    if(/^(audio|video)\//i.test(contentType)){
      return new NextResponse(upstream.body,{
        status:upstream.status,
        headers:{
          'Content-Type':contentType,
          'Cache-Control':'private, max-age=60'
        }
      });
    }

    const raw=await upstream.text();
    let data:any={};
    try{data=JSON.parse(raw)}catch{data={text:raw}}
    if(!upstream.ok){
      return NextResponse.json({
        error:'VoiceStudio upstream HTTP '+upstream.status,
        detail:data?.error||data?.message||String(raw).slice(0,400)
      },{status:502});
    }
    return NextResponse.json({
      provider:'voice-studio',
      mode,
      ...data
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return NextResponse.json({error:String(error?.message||'Falha no pipeline de voz.')},{status:500});
  }
}
