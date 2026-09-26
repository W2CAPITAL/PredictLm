export interface BrowserVoiceOptions{
  lang?:string;
  rate?:number;
  pitch?:number;
  volume?:number;
}

function clean(text:string){
  return String(text||'')
    .replace(/https?:\/\/\S+/g,' link ')
    .replace(/[*_#>|`]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,12000);
}

export function browserVoiceCapabilities(){
  if(typeof window==='undefined')return {synthesis:false,voices:0};
  const synthesis='speechSynthesis' in window;
  return {synthesis,voices:synthesis?window.speechSynthesis.getVoices().length:0};
}

export function stopBrowserVoice(){
  if(typeof window==='undefined'||!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
}

export function speakBrowserText(text:string,options:BrowserVoiceOptions={}){
  if(typeof window==='undefined'||!('speechSynthesis' in window))return false;
  const content=clean(text);
  if(!content)return false;
  const synth=window.speechSynthesis;
  synth.cancel();
  const utterance=new SpeechSynthesisUtterance(content);
  utterance.lang=options.lang||'pt-BR';
  utterance.rate=Math.max(.7,Math.min(1.35,Number(options.rate)||1));
  utterance.pitch=Math.max(.6,Math.min(1.5,Number(options.pitch)||1));
  utterance.volume=Math.max(0,Math.min(1,Number(options.volume)??1));
  const voices=synth.getVoices();
  const preferred=voices.find(v=>v.lang.toLowerCase()==='pt-br')
    ||voices.find(v=>v.lang.toLowerCase().startsWith('pt'))
    ||voices[0];
  if(preferred)utterance.voice=preferred;
  synth.speak(utterance);
  return true;
}
