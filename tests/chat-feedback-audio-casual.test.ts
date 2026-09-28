import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {conversationAnswerIssue,directConversationReply,isPlayfulPrompt} from '../src/lib/chat-intelligence';
import {speakBrowserText,speakBrowserTextTracked,stopBrowserVoice} from '../src/lib/voice/browser-voice';

test('casual preference does not start with an unnecessary AI disclaimer',()=>{
  const reply=directConversationReply('ei cara, você gosta de pipoca?',[],{loaded:false,tier:null});
  assert.ok(reply);
  assert.match(String(reply),/pipoca/i);
  assert.doesNotMatch(String(reply),/não sou um ser vivo|sou uma ia|não tenho gosto físico/i);
});

test('invented personas and impossible geometry are recognized as playful conversation',()=>{
  assert.equal(isPlayfulPrompt('sou o chirupinga cara de lata aroxeada'),true);
  assert.equal(isPlayfulPrompt('um triangulo triangular as vezes pode ser um redondo quadrangular incluido em um 4d ultra pentagonal'),true);

  const persona=directConversationReply('sou o chirupinga cara de lata aroxeada',[],{loaded:false,tier:null});
  assert.match(String(persona),/chirupinga|dimensão|entidade/i);
  assert.doesNotMatch(String(persona),/quero pegar melhor a ideia|preciso de contexto/i);

  const shape=directConversationReply('um triangulo triangular as vezes pode ser um redondo quadrangular incluido em um 4d ultra pentagonal',[],{loaded:false,tier:null});
  assert.match(String(shape),/geometria|4D|interdimensional/i);
  assert.doesNotMatch(String(shape),/termos aleatórios|contexto específico/i);
});

test('browser speech uses a finite default volume when no volume option is supplied',()=>{
  const spoken:any[]=[];
  class FakeUtterance{
    text:string;
    lang='';
    rate=1;
    pitch=1;
    volume=1;
    voice:any=null;
    onstart:any=null;
    onend:any=null;
    onerror:any=null;
    constructor(text:string){this.text=text}
  }
  const synth={
    cancel(){},
    resume(){},
    getVoices(){return [{lang:'pt-BR'}]},
    speak(utterance:any){spoken.push(utterance)}
  };
  const previousWindow=(globalThis as any).window;
  const previousUtterance=(globalThis as any).SpeechSynthesisUtterance;
  (globalThis as any).window={speechSynthesis:synth};
  (globalThis as any).SpeechSynthesisUtterance=FakeUtterance;
  try{
    assert.equal(speakBrowserText('teste de áudio'),true);
    assert.equal(spoken.length,1);
    assert.equal(Number.isFinite(spoken[0].volume),true);
    assert.equal(spoken[0].volume,1);
  }finally{
    (globalThis as any).window=previousWindow;
    (globalThis as any).SpeechSynthesisUtterance=previousUtterance;
  }
});

test('tracked browser speech reports starting speaking and ended states',async()=>{
  const states:string[]=[];
  class FakeUtterance{
    text:string;
    lang='';
    rate=1;
    pitch=1;
    volume=1;
    voice:any=null;
    onstart:any=null;
    onend:any=null;
    onerror:any=null;
    constructor(text:string){this.text=text}
  }
  const synth={
    cancel(){},
    resume(){},
    getVoices(){return [{lang:'pt-BR'}]},
    addEventListener(){},
    removeEventListener(){},
    speak(utterance:any){
      utterance.onstart?.();
      setTimeout(()=>utterance.onend?.(),0);
    }
  };
  const previousWindow=(globalThis as any).window;
  const previousUtterance=(globalThis as any).SpeechSynthesisUtterance;
  (globalThis as any).window={speechSynthesis:synth,setTimeout,clearTimeout};
  (globalThis as any).SpeechSynthesisUtterance=FakeUtterance;
  try{
    const result=await speakBrowserTextTracked('Uma resposta curta para testar o áudio.',{lang:'pt-BR'},state=>states.push(state));
    assert.equal(result.ok,true);
    assert.equal(result.state,'ended');
    assert.ok(states.includes('starting'));
    assert.ok(states.includes('speaking'));
    assert.equal(states.at(-1),'ended');
    stopBrowserVoice();
  }finally{
    (globalThis as any).window=previousWindow;
    (globalThis as any).SpeechSynthesisUtterance=previousUtterance;
  }
});

test('chat response action buttons expose visible states and accessible pressed state',()=>{
  const ui=fs.readFileSync(new URL('../src/components/ChatShell.tsx',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../src/app/globals.css',import.meta.url),'utf8');
  assert.match(ui,/speakBrowserTextTracked/);
  assert.match(ui,/aria-pressed/);
  assert.match(ui,/Reproduzindo áudio/);
  assert.match(ui,/Áudio indisponível/);
  assert.match(ui,/Útil ✓/);
  assert.match(ui,/Não útil ✓/);
  assert.match(css,/grok-feedback-button\[data-state="speaking"\]/);
  assert.match(css,/predictlmAudioPulse/);
});

test('stream and clean-chat prompts explicitly preserve casual/playful tone',()=>{
  const stream=fs.readFileSync(new URL('../src/app/api/chat/stream/route.ts',import.meta.url),'utf8');
  const route=fs.readFileSync(new URL('../src/app/api/chat/route.ts',import.meta.url),'utf8');
  assert.match(stream,/Não termine toda resposta casual com uma pergunta/);
  assert.match(stream,/MODO LÚDICO/);
  assert.match(stream,/inventar um nome\/persona|nome\/persona/);
  assert.match(route,/não abra com “sou uma IA”/i);
  assert.match(route,/Não force uma pergunta no fim de toda resposta casual/);
});


test('playful answer gate rejects generic deflection and unnecessary AI disclaimer',()=>{
  assert.equal(
    conversationAnswerIssue('sou o chirupinga cara de lata aroxeada','Entendi. Continua — quero pegar melhor a ideia.'),
    'generic-playful-deflection'
  );
  assert.equal(
    conversationAnswerIssue('ei cara, você gosta de pipoca?','Não sou um ser vivo, mas se eu pudesse comer, pipoca seria boa.'),
    'unnecessary-ai-disclaimer'
  );
});

test('offline casual recovery does not force repetitive clarification',()=>{
  const first=String(directConversationReply('eu sou naruto uzucrack da aldeia da folha da maconha oculta',[],{loaded:false,tier:null})||'');
  assert.match(first,/naruto uzucrack|aldeia da folha/i);
  assert.doesNotMatch(first,/quero pegar melhor a ideia|preciso de contexto/i);

  const casual=String(generativeOfflineReply('hoje o negócio ficou estranho por aqui','casual')||'');
  assert.ok(casual.length>0);
  assert.doesNotMatch(casual,/continua — quero pegar melhor|quero pegar melhor a ideia/i);
});
