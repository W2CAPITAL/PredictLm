export interface BrowserVoiceOptions{
  lang?:string;
  rate?:number;
  pitch?:number;
  volume?:number;
}

export type BrowserVoiceState='starting'|'speaking'|'ended'|'stopped'|'error';

export interface BrowserVoiceResult{
  ok:boolean;
  state:BrowserVoiceState;
  error?:string;
}

let voiceRunId=0;

function clean(text:string){
  return String(text||'')
    .replace(/https?:\/\/\S+/g,' link ')
    .replace(/[*_#>|\`]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,12000);
}

function finiteOr(value:unknown,fallback:number){
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}

function chunkSpeech(text:string,max=260){
  const source=clean(text);
  if(!source)return [] as string[];
  const sentences=source.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g)||[source];
  const chunks:string[]=[];
  let current='';
  const push=()=>{
    const value=current.trim();
    if(value)chunks.push(value);
    current='';
  };
  for(const sentence of sentences){
    const part=sentence.trim();
    if(!part)continue;
    if((current+' '+part).trim().length<=max){
      current=(current+' '+part).trim();
      continue;
    }
    push();
    if(part.length<=max){current=part;continue}
    const words=part.split(/\s+/);
    for(const word of words){
      if((current+' '+word).trim().length>max)push();
      current=(current+' '+word).trim();
    }
  }
  push();
  return chunks;
}

function chooseVoice(synth:SpeechSynthesis,lang:string){
  const voices=synth.getVoices();
  const wanted=lang.toLowerCase();
  return voices.find(v=>v.lang.toLowerCase()===wanted)
    ||voices.find(v=>v.lang.toLowerCase().startsWith(wanted.split('-')[0]))
    ||voices[0]
    ||null;
}

export function browserVoiceCapabilities(){
  if(typeof window==='undefined')return {synthesis:false,voices:0};
  const synthesis='speechSynthesis' in window&&typeof SpeechSynthesisUtterance!=='undefined';
  return {synthesis,voices:synthesis?window.speechSynthesis.getVoices().length:0};
}

export function stopBrowserVoice(){
  voiceRunId+=1;
  if(typeof window==='undefined'||!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
}

export function speakBrowserText(text:string,options:BrowserVoiceOptions={}){
  if(typeof window==='undefined'||!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined')return false;
  const content=clean(text);
  if(!content)return false;
  const synth=window.speechSynthesis;
  voiceRunId+=1;
  synth.cancel();
  const utterance=new SpeechSynthesisUtterance(content);
  utterance.lang=options.lang||'pt-BR';
  utterance.rate=Math.max(.7,Math.min(1.35,finiteOr(options.rate,1)));
  utterance.pitch=Math.max(.6,Math.min(1.5,finiteOr(options.pitch,1)));
  utterance.volume=Math.max(0,Math.min(1,finiteOr(options.volume,1)));
  const preferred=chooseVoice(synth,utterance.lang);
  if(preferred)utterance.voice=preferred;
  try{
    synth.resume();
    synth.speak(utterance);
    return true;
  }catch{
    return false;
  }
}

export async function speakBrowserTextTracked(
  text:string,
  options:BrowserVoiceOptions={},
  onState?:(state:BrowserVoiceState)=>void
):Promise<BrowserVoiceResult>{
  if(typeof window==='undefined'||!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined'){
    onState?.('error');
    return {ok:false,state:'error',error:'speech-synthesis-unavailable'};
  }
  const chunks=chunkSpeech(text);
  if(!chunks.length){
    onState?.('error');
    return {ok:false,state:'error',error:'empty-text'};
  }

  const synth=window.speechSynthesis;
  const runId=++voiceRunId;
  synth.cancel();
  onState?.('starting');

  const lang=options.lang||'pt-BR';
  const rate=Math.max(.7,Math.min(1.35,finiteOr(options.rate,1)));
  const pitch=Math.max(.6,Math.min(1.5,finiteOr(options.pitch,1)));
  const volume=Math.max(0,Math.min(1,finiteOr(options.volume,1)));

  // Some Chromium/WebView builds populate voices only after voiceschanged.
  if(!synth.getVoices().length){
    await new Promise<void>(resolve=>{
      let settled=false;
      const finish=()=>{
        if(settled)return;
        settled=true;
        synth.removeEventListener?.('voiceschanged',finish);
        resolve();
      };
      synth.addEventListener?.('voiceschanged',finish,{once:true});
      window.setTimeout(finish,350);
    });
  }

  if(runId!==voiceRunId){
    onState?.('stopped');
    return {ok:false,state:'stopped'};
  }

  const voice=chooseVoice(synth,lang);
  synth.resume();

  for(const chunk of chunks){
    if(runId!==voiceRunId){
      onState?.('stopped');
      return {ok:false,state:'stopped'};
    }
    const result=await new Promise<BrowserVoiceResult>(resolve=>{
      const utterance=new SpeechSynthesisUtterance(chunk);
      utterance.lang=lang;
      utterance.rate=rate;
      utterance.pitch=pitch;
      utterance.volume=volume;
      if(voice)utterance.voice=voice;

      let settled=false;
      const finish=(value:BrowserVoiceResult)=>{
        if(settled)return;
        settled=true;
        window.clearTimeout(watchdog);
        resolve(value);
      };
      const watchdog=window.setTimeout(()=>finish({ok:false,state:'error',error:'speech-timeout'}),45_000);

      utterance.onstart=()=>onState?.('speaking');
      utterance.onend=()=>finish({ok:true,state:'ended'});
      utterance.onerror=(event:any)=>finish({
        ok:false,
        state:runId===voiceRunId?'error':'stopped',
        error:String(event?.error||'speech-error')
      });

      try{
        synth.speak(utterance);
      }catch(error:any){
        finish({ok:false,state:'error',error:String(error?.message||error||'speech-error')});
      }
    });
    if(!result.ok){
      onState?.(result.state);
      return result;
    }
  }

  if(runId!==voiceRunId){
    onState?.('stopped');
    return {ok:false,state:'stopped'};
  }
  onState?.('ended');
  return {ok:true,state:'ended'};
}
