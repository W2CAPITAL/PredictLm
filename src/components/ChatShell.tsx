'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Bell, CheckCircle2, Clock3, Eye, Brain, Bug, ChevronDown, Code2, FileText, FolderOpen, Globe2, Image as ImageIcon, Library, Menu, PanelLeft, Plus, RefreshCw, Scale, Search, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Trash2, Volume2, X, Zap } from 'lucide-react';
import { useAssistantStore } from '@/lib/assistant-store';
import { answerLocally, browserCapabilities, cancelNeuralLoad, cancelNeuralWork, loadNeuralModel, neuralStatus, unloadNeuralModel, type NeuralTier } from '@/lib/browser-brain';
import { adaptiveInstructionContext, adaptiveMemoryStats, captureAdaptiveInstruction, isAdaptiveInstruction, rateAdaptiveAnswer } from '@/lib/adaptive-memory';
import { answerQuality, classifyConversation, directConversationReply, filterRelevantResearchItems, generativeOfflineReply, practicalHowToReply, responseTopicAlignment, signalsKnowledgeGap, stableFactualReply, shouldSearchConversation, synthesizeResearch } from '@/lib/chat-intelligence';
import { animateStoryboardToWebm } from '@/lib/media/local-motion';
import { buildStoryboardFrames } from '@/lib/media/video-pipelines';
import { autoVariationSeed, buildQualityImagePrompt } from '@/lib/media/prompt-quality';
import { trainingRuntimeStats } from '@/lib/training/context';
import { resolveCnjFromContext } from '@/lib/legal/cnj';
import { legalChatAnswer, legalDossierSummary, legalSources } from '@/lib/legal/presentation';
import { createLegalDossier } from '@/lib/legal/dossier';
import { isLegalDossierRequest, legalDossierMode } from '@/lib/legal/mode';
import { assessFraudRisk, formatFraudAssessment, isFraudAnalysisRequest } from '@/lib/security/fraud-defense';
import { isTutorRequest } from '@/lib/tutor-mode';
import { isGlobalLearningInstruction } from '@/lib/global-learning';
import { answerViaLocalRuntime, probeLocalRuntimes, setLocalRuntimeCredential } from '@/lib/local-runtime-router';
import { resolveConversationLanguage } from '@/lib/language-policy';
import { hasInternalReasoningLeak, publicAnswerGate, sanitizePublicAnswer } from '@/lib/public-answer-gate';
import { looksLikeOperationalMonologue } from '@/lib/human-presence';
import { cancelWebLLMLoad, loadWebLLMModel, unloadWebLLMModel, webLLMStatus, type WebLLMTier } from '@/lib/webllm-runtime';
import type { LegalProcessBundle } from '@/lib/legal/types';
import { useStudio } from '@/lib/store';
import { GrokBuildPanel } from '@/components/GrokBuildPanel';
import { GrokResearchPanel } from '@/components/GrokResearchPanel';
import { AnimalVisionPanel } from '@/components/AnimalVisionPanel';
import { GrokImaginePanel } from '@/components/GrokImaginePanel';
import { GrokPluginsPanel } from '@/components/GrokPluginsPanel';
import { GrokSimulationPanel } from '@/components/GrokSimulationPanel';
import { advanceBrowserDigitalBrainContext } from '@/lib/digital-brain';
import { detectReportIntent, renderReportHtml } from '@/lib/predict-dossier-html';
import { browserKnowledgeContext } from '@/lib/fusion/knowledge-fabric';
import { capabilityFusionContext } from '@/lib/fusion/capability-fabric';
import { speakBrowserText } from '@/lib/voice/browser-voice';

interface Props{
  onOpenLegal?:()=>void;
}

type GrokScreen='chat'|'library'|'build'|'research'|'imagine'|'simulation'|'vision'|'plugins';

type ChatMediaKind='image'|'video';

function detectChatMediaRequest(prompt:string):ChatMediaKind|null{
  const p=prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ');
  const explicit=/(gere|gerar|crie|criar|faca|faça|desenhe|renderize|produza|quero)/.test(p);
  if(!explicit)return null;
  if(/\b(video|clipe|animacao|animação|motion|filme|reel|short)\b/.test(p))return 'video';
  if(/\b(imagem|foto|ilustracao|ilustração|poster|logo|capa|render|arte)\b/.test(p))return 'image';
  return null;
}

function detectSimulationLaunchRequest(prompt:string){
  const p=prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const simulation=/\b(simulacao|simulacao de vida|simulacao ativa|life simulation|life simulator|mundo vivo|personagem ativa)\b/.test(p);
  const launch=/\b(ative|ativar|ativa|abra|abrir|inicie|iniciar|rode|rodar|execute|executar|comece|comecar|ligue|ligar|quero ver|quero uma)\b/.test(p);
  const appBuild=/\b(app|aplicativo|site|sistema|codigo|export|zip|build)\b/.test(p);
  return simulation&&launch&&!appBuild;
}

function simulationCommandHandoff(prompt:string){
  const cleaned=prompt
    .replace(/\b(ative|ativar|ativa|abra|abrir|inicie|iniciar|rode|rodar|execute|executar|comece|comecar|ligue|ligar)\b/gi,' ')
    .replace(/\b(a|o|uma|um)?\s*(simulação|simulacao|simulação de vida|simulacao de vida|life simulation|life simulator|studio)\b/gi,' ')
    .replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g,'')
    .replace(/\s+/g,' ')
    .trim();
  return cleaned.length>=4?cleaned:'';
}

function mediaSubject(prompt:string){
  return prompt
    .replace(/^(gere|gerar|crie|criar|faça|faca|desenhe|renderize|produza|quero)\s+/i,'')
    .replace(/^(uma?|um)\s+(imagem|foto|ilustração|ilustracao|vídeo|video|clipe|animação|animacao)\s+(de|com)?\s*/i,'')
    .trim()||prompt.trim();
}

function buildReasoningSummary(input:{
  kind:string;
  webCount?:number;
  localBrain?:boolean;
  provider?:boolean;
  localRuntime?:boolean;
  anchor?:boolean;
  deep?:boolean;
}){
  const parts:string[]=[];
  if(input.kind==='howto')parts.push('Tratei a pergunta como uma tarefa prática e priorizei passos que você consegue executar.');
  else if(input.kind==='current')parts.push('Separei o que precisava de informação atual do que já podia ser respondido pelo contexto.');
  else if(input.kind==='factual')parts.push('Chequei se a resposta permanecia no assunto e distinguia fato de inferência.');
  else if(input.kind==='hypothetical')parts.push('Tratei a premissa como hipótese e mantive a resposta dentro dela, sem puxar assuntos externos.');
  else if(input.kind==='context')parts.push('Continuei a partir do contexto recente relevante.');
  else parts.push('Respondi diretamente ao pedido atual e descartei contexto não solicitado.');
  if(input.webCount)parts.push('Cruzei '+input.webCount+' fonte(s) relevante(s) e descartei resultados que desviavam do tema.');
  if(input.anchor)parts.push('Mantive um piso prático para não trocar uma resposta útil por uma síntese mais vaga.');
  if(input.localBrain)parts.push('Uma segunda leitura independente apontou possíveis lacunas antes da resposta final.');
  if(input.deep)parts.push('Fiz uma revisão extra de aderência e contradições.');
  return parts.join(' ');
}

function filterDisplayedSources(prompt:string,sources:{title:string;source:string}[],limit=8){
  const sourceKind=classifyConversation(prompt,[]);
  const sourceRelevant=shouldSearchConversation(sourceKind,true,prompt)||sourceKind==='technical';
  if(!sourceRelevant)return [];
  const seen=new Set<string>();
  const rows=sources.filter(src=>{
    const key=src.source||src.title;
    if(!key||seen.has(key))return false;
    seen.add(key);
    const subject=(src.title+' '+src.source).replace(/https?:\/\/\S+/g,' ');
    return responseTopicAlignment(prompt,subject).relevant;
  });
  return rows.slice(0,limit);
}

function safeHistoricalContent(content:string){
  const sanitized=sanitizePublicAnswer(content);
  if(sanitized&&!looksLikeOperationalMonologue(sanitized))return sanitized;
  if(hasInternalReasoningLeak(content)||looksLikeOperationalMonologue(content))return 'Esta resposta antiga continha análise interna ou um relatório operacional em vez da resposta final. Gere novamente para receber uma resposta limpa.';
  return content;
}

async function fetchWithTimeout(input:RequestInfo|URL,init:RequestInit={},timeoutMs=15000,parentSignal?:AbortSignal){
  const controller=new AbortController();
  const onAbort=()=>controller.abort();
  if(parentSignal){
    if(parentSignal.aborted)controller.abort();
    else parentSignal.addEventListener('abort',onAbort,{once:true});
  }
  const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
  try{
    return await fetch(input,{...init,signal:controller.signal});
  }finally{
    window.clearTimeout(timer);
    parentSignal?.removeEventListener('abort',onAbort);
  }
}

export function ChatShell({onOpenLegal}:Props){
  const s=useAssistantStore();
  const studio=useStudio();
  const active=s.sessions.find(x=>x.id===s.activeId)||s.sessions[0];
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [sidebar,setSidebar]=useState(true);
  const [screen,setScreen]=useState<GrokScreen>('chat');
  const [searching,setSearching]=useState(false);
  const [search,setSearch]=useState('');
  const [plusOpen,setPlusOpen]=useState(false);
  const [modelMenu,setModelMenu]=useState(false);
  const [loadState,setLoadState]=useState<{tier:NeuralTier;progress:number|null;status:string}|null>(null);
  const [modelError,setModelError]=useState('');
  const [localRuntimeLabel,setLocalRuntimeLabel]=useState('Auto');
  const [modelTick,setModelTick]=useState(0);
  const [activity,setActivity]=useState<string[]>([]);
  const [legalHealth,setLegalHealth]=useState<{
    fetchedAt:string;
    latencyMs?:number;
    datajud:{ok:boolean;detail:string};
    djen:{ok:boolean;detail:string};
  }|null>(null);
  const [legalHealthBusy,setLegalHealthBusy]=useState(false);
  const bottom=useRef<HTMLDivElement>(null);
  const turnAbort=useRef<AbortController|null>(null);
  const caps=useMemo(()=>typeof window==='undefined'?{native:false,webgpu:false,memory:0,cores:0,recommended:'lite' as NeuralTier}:browserCapabilities(),[]);
  const neural=useMemo(()=>neuralStatus(),[modelTick,loadState]);
  const webllm=useMemo(()=>webLLMStatus(),[modelTick,loadState]);
  const memoryStats=useMemo(()=>typeof window==='undefined'?{count:0,trusted:0,lastUpdated:null}:adaptiveMemoryStats(),[modelTick]);
  const learningStats=useMemo(()=>trainingRuntimeStats(),[]);

  const visibleSessions=s.sessions.filter(chat=>chat.title.toLowerCase().includes(search.toLowerCase()));

  useEffect(()=>{
    try{
      const requested=new URLSearchParams(window.location.search).get('screen');
      if(requested==='simulation')setScreen('simulation');
    }catch{}
  },[]);

  useEffect(()=>{
    const onWarm=(event:Event)=>{
      const detail=(event as CustomEvent<any>).detail||{};
      if(detail.phase==='loading'){
        setLoadState({
          tier:detail.tier==='smart'?'smart':'lite',
          progress:typeof detail.progress==='number'?detail.progress:null,
          status:'Neural em segundo plano · '+String(detail.status||'carregando')
        });
      }else if(detail.phase==='ready'){
        setLoadState(null);
        setModelError('');
        setModelTick(x=>x+1);
      }else if(detail.phase==='error'){
        setLoadState(null);
        setModelTick(x=>x+1);
      }
    };
    window.addEventListener('predictlm:neural-warmup',onWarm as EventListener);
    return()=>window.removeEventListener('predictlm:neural-warmup',onWarm as EventListener);
  },[]);

  useEffect(()=>{
    const mq=window.matchMedia('(max-width: 760px)');
    const sync=(event?:MediaQueryListEvent)=>{
      if((event?.matches??mq.matches))setSidebar(false);
    };
    sync();
    mq.addEventListener?.('change',sync);
    document.documentElement.dataset.predictlmMobileShell='ready';
    return()=>{
      mq.removeEventListener?.('change',sync);
      delete document.documentElement.dataset.predictlmMobileShell;
    };
  },[]);

  async function refreshLegalHealth(){
    if(legalHealthBusy)return;
    setLegalHealthBusy(true);
    try{
      const r=await fetch('/api/legal/health',{cache:'no-store'});
      const data=await r.json().catch(()=>null);
      if(data?.datajud&&data?.djen)setLegalHealth(data);
      else setLegalHealth({
        fetchedAt:new Date().toISOString(),
        datajud:{ok:false,detail:'Não foi possível verificar o DataJud.'},
        djen:{ok:false,detail:'Não foi possível verificar o DJEN.'}
      });
    }catch{
      setLegalHealth({
        fetchedAt:new Date().toISOString(),
        datajud:{ok:false,detail:'Falha de rede na verificação do DataJud.'},
        djen:{ok:false,detail:'Falha de rede na verificação do DJEN.'}
      });
    }finally{
      setLegalHealthBusy(false);
    }
  }

  useEffect(()=>{
    void refreshLegalHealth();
    const id=window.setInterval(()=>void refreshLegalHealth(),5*60*1000);
    return()=>window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function closeSidebarOnMobile(){
    if(typeof window!=='undefined'&&window.matchMedia('(max-width: 760px)').matches)setSidebar(false);
  }

  async function webContext(query:string,signal?:AbortSignal){
    try{
      const r=await fetchWithTimeout('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,limit:8})},10000,signal);
      const data=await r.json();
      if(!r.ok)return {text:'',sources:[] as any[],items:[] as any[]};
      const rawItems=[...(data.web||[]),...(data.news||[])];
      const items=filterRelevantResearchItems(query,rawItems,8);
      const text=items.map((x:any,i:number)=>'WEB['+(i+1)+'] '+x.title+' — '+(x.summary||x.description||'')+' URL: '+x.url).join('\n');
      return {text,sources:items.map((x:any)=>({title:x.title,source:x.url})),items};
    }catch{return {text:'',sources:[] as any[],items:[] as any[]}}
  }

  async function requestApiAnswer(input:{
    prompt:string;
    language:string;
    kind:string;
    messages:{role:string;content:string}[];
    researchContext:string;
    localAdvisory:string;
    answerAnchor:string;
    brainContext:string;
    deep:boolean;
    clean?:boolean;
    signal:AbortSignal;
  }){
    try{
      const response=await fetchWithTimeout('/api/chat',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          ...(input.clean?{mode:'clean-chat',useHistory:true}:{}),
          prompt:input.prompt,
          language:input.language,
          messages:input.messages,
          researchContext:input.researchContext,
          localAdvisory:input.localAdvisory,
          answerAnchor:input.answerAnchor,
          brainContext:input.brainContext,
          deep:input.clean?false:input.deep,
          instructions:input.clean?'':adaptiveInstructionContext(4)
        })
      },input.clean?28000:36000,input.signal);
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data?.content)return {ok:false,text:'',data,reason:String(data?.code||data?.error||'provider-unavailable')};
      const gate=publicAnswerGate(String(data.content||''),input.language as any,input.prompt);
      if(!gate.ok)return {ok:false,text:'',data,reason:gate.reason||'public-gate'};
      const text=gate.content;
      const relevant=responseTopicAlignment(input.prompt,text).relevant;
      const quality=answerQuality(input.prompt,text);
      const minQuality=input.kind==='howto'?2:input.kind==='factual'?0:-1;
      if(!relevant)return {ok:false,text,data,reason:'off-topic'};
      if(quality<minQuality)return {ok:false,text,data,reason:'low-quality'};
      if(signalsKnowledgeGap(text))return {ok:false,text,data,reason:'knowledge-gap'};
      return {ok:true,text,data,reason:''};
    }catch(error:any){
      return {ok:false,text:'',data:{},reason:String(error?.message||error||'provider-error')};
    }
  }

  async function requestStreamingChat(input:{
    messages:Array<{role:string;content:string}>;
    language:string;
    signal:AbortSignal;
  }){
    try{
      const response=await fetch('/api/chat/stream',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:input.messages,language:input.language}),
        signal:input.signal
      });
      if(!response.ok||!response.body)return {ok:false,text:'',provider:'',model:''};

      const reader=response.body.getReader();
      const decoder=new TextDecoder();
      let buffer='';
      let accumulated='';
      let started=false;
      let provider='';
      let model='';

      while(true){
        const {done,value}=await reader.read();
        if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        const events=buffer.split('\n\n');
        buffer=events.pop()||'';

        for(const event of events){
          const line=event.split(/\r?\n/).find(x=>x.trim().startsWith('data:'));
          if(!line)continue;
          const payload=line.trim().slice(5).trim();
          if(!payload||payload==='[DONE]')continue;
          let data:any;
          try{data=JSON.parse(payload)}catch{continue}
          if(data?.error&&!started)return {ok:false,text:'',provider:'',model:''};
          if(data?.meta){
            provider=String(data.meta.provider||provider);
            model=String(data.meta.model||model);
          }
          if(typeof data?.content==='string'&&data.content){
            accumulated+=data.content;
            if(!started){
              started=true;
              s.addMessage({
                role:'assistant',
                content:accumulated,
                engine:'Predict Auto',
                status:'partial'
              });
            }else{
              s.updateLastAssistant(accumulated,'partial');
            }
            setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),20);
          }
          if(data?.done){
            provider=String(data.provider||provider);
            model=String(data.model||model);
          }
        }
      }

      if(!started||!accumulated.trim())return {ok:false,text:'',provider,model};
      s.updateLastAssistant(accumulated,'done');
      return {ok:true,text:accumulated,provider,model};
    }catch{
      return {ok:false,text:'',provider:'',model:''};
    }
  }

  async function requestPuterChat(input:{
    prompt:string;
    messages:Array<{role:string;content:string}>;
    language:string;
    signal:AbortSignal;
  }){
    if(typeof window==='undefined')return {ok:false,text:'',reason:'browser-only'};
    try{
      const mod:any=await import('@heyputer/puter.js');
      const puter:any=mod?.puter||mod?.default?.puter||mod?.default||null;
      if(!puter?.ai?.chat)return {ok:false,text:'',reason:'puter-unavailable'};

      const recent=input.messages
        .filter(x=>x&&(x.role==='user'||x.role==='assistant')&&typeof x.content==='string')
        .slice(-8)
        .map(x=>({role:x.role,content:safeHistoricalContent(x.content).slice(0,1200)}));
      const promptMessages=[
        {
          role:'system',
          content:[
            'You are PredictLM, a natural general-purpose conversational assistant.',
            input.language==='pt-BR'?'Answer in Brazilian Portuguese unless the user clearly requests another language.':'Answer in the user language.',
            'Answer the actual message directly. Keep recent conversation context.',
            'Do not mention providers, runtimes, knowledge packs, RAG, skills, routing or internal implementation.',
            'Do not output repository snippets, README fragments, Related/Relacionado sections or internal notes.'
          ].join(' ')
        },
        ...recent,
        {role:'user',content:input.prompt}
      ];

      let abortHandler:()=>void=()=>{};
      const aborted=new Promise((_,reject)=>{
        abortHandler=()=>reject(new DOMException('Aborted','AbortError'));
        input.signal.addEventListener('abort',abortHandler,{once:true});
      });
      const call=puter.ai.chat(promptMessages,{model:'gpt-5.6-luna',temperature:0.65,max_tokens:1000});
      const result:any=await Promise.race([call,aborted]);
      input.signal.removeEventListener('abort',abortHandler);

      const raw=typeof result==='string'
        ? result
        : typeof result?.message?.content==='string'
          ? result.message.content
          : Array.isArray(result?.message?.content)
            ? result.message.content.map((x:any)=>x?.text||'').join('\n')
            : typeof result?.content==='string'
              ? result.content
              : '';
      const gate=publicAnswerGate(String(raw||''),input.language as any,input.prompt);
      if(!gate.ok)return {ok:false,text:'',reason:gate.reason||'puter-gate'};
      if(!responseTopicAlignment(input.prompt,gate.content).relevant)return {ok:false,text:'',reason:'puter-off-topic'};
      if(signalsKnowledgeGap(gate.content))return {ok:false,text:'',reason:'puter-knowledge-gap'};
      return {ok:true,text:gate.content,reason:''};
    }catch(error:any){
      return {ok:false,text:'',reason:String(error?.message||error||'puter-error')};
    }
  }

  async function requestBrainReport(prompt:string,sourceText:string,signal:AbortSignal){
    try{
      const response=await fetchWithTimeout('/api/report-dossier/generate',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          request:prompt,
          sourceText,
          classification:'confidencial',
          theme:'auto',
          maxWordsPerSection:420
        })
      },88000,signal);
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data?.markdown)return {ok:false,data,error:String(data?.error||'Report Architect indisponível.')};
      return {ok:true,data,error:''};
    }catch(error:any){
      return {ok:false,data:null,error:String(error?.message||'Report Architect indisponível.')};
    }
  }

  function prepareReportArtifact(prompt:string,content:string){
    const intent=detectReportIntent(prompt);
    if(!intent.wantsReport)return null;
    const rendered=renderReportHtml(content,{
      meta:{kind:intent.kind,classification:'confidencial'}
    });
    try{
      sessionStorage.setItem('predictlm:dossier-prefill',content);
      sessionStorage.setItem('predictlm:dossier-kind',intent.kind);
    }catch{}
    if(!intent.wantsHtml)return {content,media:[] as any[],quality:rendered.quality};
    const blob=new Blob([rendered.html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const summary=rendered.dossier.sections.find(x=>x.role==='summary')?.body||'';
    const publicContent=[
      rendered.dossier.bottomLine?'**Conclusão em uma frase:** '+rendered.dossier.bottomLine:'',
      summary,
      'HTML pronto para baixar. O conteúdo completo também foi enviado ao Dossiê Studio.'
    ].filter(Boolean).join('\n\n');
    const filename=(rendered.dossier.title||'dossie')
      .normalize('NFD').replace(/\p{M}/gu,'')
      .replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'dossie';
    return {
      content:publicContent,
      media:[{kind:'file' as const,url,label:'Dossiê HTML',temporary:true,downloadName:filename+'.html',mime:'text/html'}],
      quality:rendered.quality
    };
  }

  async function send(){
    const prompt=input.trim();
    if(!prompt||busy)return;
    const history=active?.messages||[];
    const processNumber=resolveCnjFromContext(prompt,history.slice(-14).map(m=>m.content));
    const fraudIntent=isFraudAnalysisRequest(prompt);
    const tutorIntent=isTutorRequest(prompt);
    const learningInstruction=isGlobalLearningInstruction(prompt);
    const mediaKind=detectChatMediaRequest(prompt);
    const simulationLaunch=detectSimulationLaunchRequest(prompt);
    const reportIntent=detectReportIntent(prompt);
    const kind=classifyConversation(prompt,history);
    const language=resolveConversationLanguage(prompt,history);
    const brainContext=[
      advanceBrowserDigitalBrainContext(prompt).context,
      browserKnowledgeContext(prompt),
      capabilityFusionContext(prompt,'chat')
    ].filter(Boolean).join('\n\n');
    const currentNeural=neuralStatus();
    const currentWebLLM=webLLMStatus();
    const safeLocalDeep=s.deepThink&&((currentNeural.loaded&&currentNeural.backend==='webgpu')||currentWebLLM.loaded);
    const direct=directConversationReply(prompt,history,{loaded:currentNeural.loaded||currentWebLLM.loaded,tier:currentNeural.tier||currentWebLLM.tier});
    const needsWeb=shouldSearchConversation(kind,s.webEnabled,prompt);
    const showExecutionDetails=s.deepThink||needsWeb;

    setInput('');
    setScreen('chat');
    if(learningInstruction){
      captureAdaptiveInstruction(prompt);
      fetch('/api/learning/propose',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({instruction:prompt,surface:'chat'})
      }).catch(()=>{});
    }
    s.addMessage({role:'user',content:prompt});

    if(simulationLaunch){
      try{
        sessionStorage.setItem('predictlm:simulation-explicit-start','1');
        const handoff=simulationCommandHandoff(prompt);
        if(handoff)sessionStorage.setItem('predictlm:simulation-command',handoff);
      }catch{}
      setScreen('simulation');
      s.addMessage({
        role:'assistant',
        content:'Simulação ativada. Se sua frase também continha uma ação, ela foi entregue ao agente executor; caso contrário, o mundo segue em modo normal até você dar uma ordem.',
        engine:'Predict Auto',
        actions:['Life Simulation Studio aberto','Estado local preservado','Digital Brain conectado ao ciclo observar → priorizar → agir → memorizar'],
        status:'done'
      });
      setActivity([]);
      return;
    }
    const instructionLearned=isAdaptiveInstruction(prompt)&&captureAdaptiveInstruction(prompt);
    if(instructionLearned)setModelTick(x=>x+1);
    const turnController=new AbortController();
    turnAbort.current=turnController;
    setBusy(true);
    setActivity(
      processNumber
        ? ['Recuperando contexto do processo','Consultando DataJud e DJEN','Conferindo portal oficial quando necessário','Normalizando eventos e publicações','Preparando resposta']
        : fraudIntent
          ? ['Classificando sinais de fraude','Verificando links, credenciais e pagamento','Buscando contexto independente quando habilitado','Separando sinal de prova','Preparando triagem defensiva']
        : tutorIntent
          ? ['TUTOR · identificando objetivo de aprendizagem','PROBE · verificando o que precisa ser testado','TEACH/PRACTICE · recuperando contexto relevante','ASSESS · preparando checagem de domínio','REVIEW · preservando próximos passos']
        : mediaKind==='video'
          ? ['Interpretando o vídeo','Planejando 3 cenas coerentes','Gerando keyframes','Renderizando vídeo local','Preparando resultado']
          : mediaKind==='image'
            ? ['Interpretando a imagem','Aplicando qualidade e anti-artefatos','Gerando composição','Validando o resultado']
            : safeLocalDeep
              ? ['RECALL · recuperando contexto','ROUTE · identificando assunto e intenção','FORGE · preparando rascunho neural','AEGIS · revisando relevância','VERIFY · preparando resposta']
              : s.deepThink
                ? ['RECALL · recuperando contexto','ROUTE · identificando assunto e intenção','VERIFY · usando apenas contexto relevante']
                : ['Analisando contexto']
    );
    setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),20);

    try{
      if(reportIntent.wantsReport&&!processNumber){
        setActivity([
          'REPORT ARCHITECT · detectando o tipo e objetivo',
          'FORGE · extraindo fatos, métricas e padrões',
          'AEGIS · procurando contradições e lacunas',
          'PARALLAX · testando terceiro enquadramento',
          'CHAIR · redigindo e aplicando quality gate'
        ]);
        const context=history.slice(-10)
          .filter(m=>m.role==='user'||m.role==='assistant')
          .map(m=>(m.role==='user'?'USUÁRIO: ':'ASSISTENTE: ')+safeHistoricalContent(m.content))
          .join('\n\n')
          .slice(0,42000);
        const brainReport=await requestBrainReport(prompt,context,turnController.signal);
        if(brainReport.ok){
          const markdown=String(brainReport.data.markdown||'');
          const report=prepareReportArtifact(prompt,markdown);
          const brainNames=[
            'FORGE','AEGIS','PARALLAX',
            ...(brainReport.data?.brains?.councilX10?['COUNCIL X10']:[]),
            'CHAIR'
          ];
          s.addMessage({
            role:'assistant',
            content:report?.content||markdown,
            engine:'PredictLM · Report Architect',
            ...(report?.media?.length?{media:report.media}:{}),
            actions:[
              'Tipo detectado · '+String(brainReport.data?.blueprint?.label||brainReport.data?.blueprint?.kind||'relatório personalizado'),
              'Cérebros usados · '+brainNames.join(' · '),
              'Quality Gate · '+String(brainReport.data?.quality?.score??report?.quality?.score??'—')+'/100',
              ...(brainReport.data?.brains?.repaired?['CHAIR executou uma rodada adicional de reparo']:[]),
              'Conteúdo completo enviado ao Dossiê Studio'
            ],
            status:'done'
          });
          return;
        }
        // If the dedicated orchestrator is unavailable, continue through the
        // normal PredictLM answer path with the report contract already active.
        setActivity(['Report Architect avançado indisponível · usando rota normal com contrato de relatório']);
      }

      if(fraudIntent&&!processNumber){
        setActivity(['Classificando sinais de fraude','Verificando links, credenciais e pagamento']);
        const assessment=assessFraudRisk({texts:[prompt]});
        const web=s.webEnabled?await webContext(prompt,turnController.signal):{text:'',sources:[] as any[],items:[] as any[]};
        s.addMessage({
          role:'assistant',
          content:formatFraudAssessment(assessment),
          engine:'PredictLM · Fraud Shield',
          sources:web.sources,
          actions:[
            'Triagem local de engenharia social/credenciais/pagamento/link',
            ...(web.sources.length?['Pesquisa independente: '+web.sources.length+' fontes relevantes']:['Sem pesquisa web adicional']),
            'Sinal de risco mantido separado de prova de fraude'
          ],
          status:'done'
        });
        return;
      }

      if(mediaKind){
        const subject=mediaSubject(prompt);
        const seed=autoVariationSeed();
        if(mediaKind==='image'){
          setActivity(['Interpretando a imagem','Preparando referências visuais e identidade','Gerando composição']);
          const enhanced=buildQualityImagePrompt(subject,{style:'Cinematic',attempt:0});
          const r=await fetch('/api/media/generate',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({prompt:enhanced,width:1536,height:1536,seed,model:'flux',referenceMode:'auto'})
          });
          const data=await r.json();
          if(!r.ok||!data?.url)throw new Error(data?.error||'A geração de imagem não retornou um arquivo.');
          let imageUrl=String(data.url);
          let upscale:any={upscaled:false,provider:'none'};
          setActivity(['Imagem base criada em alta resolução','Super Resolution · tentando upscale 2×','Validando o resultado']);
          try{
            if(data.provider==='entity-self-reference'){
              upscale={upscaled:false,provider:'entity-self-reference',exact:true};
            }else{
            const up=await fetch('/api/media/upscale',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({sourceUrl:imageUrl,scale:2,model:'realesrgan-x4plus',faceEnhance:true})
            });
            const upData=await up.json().catch(()=>({}));
            if(up.ok&&upData?.upscaled&&upData?.url){
              imageUrl=String(upData.url);
              upscale=upData;
            }
            }
          }catch{}
          fetch('/api/media/library',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              kind:'image',
              status:'ready',
              provider:data.provider||'chat-media',
              model:data.model||'flux',
              prompt:subject,
              enhancedPrompt:enhanced,
              style:'Cinematic',
              aspectRatio:'1:1',
              width:1536,
              height:1536,
              seed,
              url:imageUrl,
              meta:{surface:'chat',storageMode:'metadata-only',upscale:{upscaled:!!upscale?.upscaled,provider:upscale?.provider||'none',model:upscale?.model||null,scale:upscale?.scale||1}}
            })
          }).catch(()=>{});
          s.addMessage({
            role:'assistant',
            content:'Imagem gerada a partir do seu pedido. Use **Imagine** quando quiser controlar estilo, proporção, vídeo e regeneração avançada.',
            engine:'PredictLM · Media',
            media:[{kind:'image',url:imageUrl,label:subject}],
            actions:[
              'Prompt interpretado',
              'Base gerada em 1536×1536',
              'Qualidade/anti-artefatos aplicada',
              upscale?.upscaled?'Super Resolution '+String(upscale.scale||2)+'× · '+String(upscale.model||'upscaler'):'Upscaler externo indisponível · imagem base preservada',
              ...(instructionLearned?['Instrução persistente aprendida localmente']:[]),
              'Metadados enviados para a Media Library'
            ],
            status:'done'
          });
          return;
        }

        const frames=buildStoryboardFrames(subject,'Cinematic','16:9');
        const urls:string[]=[];
        for(let i=0;i<frames.length;i++){
          setActivity(['Interpretando o vídeo','Planejando 3 cenas coerentes','Gerando cena '+(i+1)+'/'+frames.length]);
          const enhanced=buildQualityImagePrompt(frames[i].prompt,{
            style:'Cinematic',
            attempt:i,
            purpose:'keyframe',
            previousPrompt:i?frames[i-1].prompt:undefined
          });
          const r=await fetch('/api/media/generate',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({prompt:enhanced,width:1344,height:768,seed:seed+frames[i].seedOffset,model:'flux',referenceMode:'auto'})
          });
          const data=await r.json();
          if(!r.ok||!data?.url)throw new Error(data?.error||('Falha ao gerar a cena '+(i+1)+'.'));
          urls.push(String(data.url));
        }
        setActivity(['3 cenas criadas','Carregando keyframes','Renderizando vídeo no navegador']);
        const blob=await animateStoryboardToWebm({
          imageUrls:urls,
          width:1344,
          height:768,
          durationMs:9000,
          onFrameLoaded:(loaded,total)=>setActivity(['3 cenas criadas','Keyframes '+loaded+'/'+total+' carregados','Renderizando vídeo no navegador']),
          onProgress:value=>setActivity(['3 cenas criadas','Keyframes carregados','Renderizando vídeo · '+Math.round(value*100)+'%'])
        });
        const videoUrl=URL.createObjectURL(blob);
        fetch('/api/media/library',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            kind:'video',
            status:'ready',
            provider:'predict-chat-storyboard',
            model:'predict-storyboard-v1',
            prompt:subject,
            enhancedPrompt:subject,
            style:'Cinematic',
            aspectRatio:'16:9',
            width:1344,
            height:768,
            seed,
            url:null,
            meta:{surface:'chat',storageMode:'metadata-only',bytes:blob.size,mime:blob.type,frames:urls}
          })
        }).catch(()=>{});
        s.addMessage({
          role:'assistant',
          content:'Vídeo criado em **3 cenas** e renderizado localmente no navegador. O binário não foi enviado ao Supabase.',
          engine:'PredictLM · Media',
          media:[{kind:'video',url:videoUrl,label:subject,temporary:true}],
          actions:['Prompt de vídeo interpretado','Storyboard de 3 cenas planejado','3 keyframes gerados','Vídeo WebM renderizado no navegador','Metadados enviados para a Media Library'],
          status:'done'
        });
        return;
      }

      if(processNumber){
        const recalls=studio.notes.filter(n=>(n.title+' '+n.body).includes(processNumber)).slice(-5);
        const r=await fetch('/api/legal/process?number='+encodeURIComponent(processNumber),{cache:'no-store'});
        const data=await r.json();
        if(!r.ok)throw new Error(data?.error||'Falha na consulta processual');
        const legal=data as LegalProcessBundle;
        studio.addNote({
          title:'Processo '+legal.processNumber,
          body:legal.summary.sourceSummary+'\n'+legal.summary.status+'\nConsultado em '+legal.fetchedAt,
          tags:['processo','datajud','djen',legal.tribunalLabel.toLowerCase()],
          kind:'note'
        });
        if(isLegalDossierRequest(prompt)){
          const mode=legalDossierMode(prompt);
          const html=createLegalDossier(legal,{mode});
          const dossierUrl=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
          s.addMessage({
            role:'assistant',
            content:legalDossierSummary(legal,mode),
            engine:'PredictLM · Processos',
            sources:legalSources(legal),
            media:[{
              kind:'file',
              url:dossierUrl,
              label:'Dossiê HTML · '+legal.processNumber,
              downloadName:'dossie-'+legal.digits+(mode==='aggressive'?'-aegis':'')+'.html',
              mime:'text/html',
              temporary:true
            }],
            actions:[
              'Contexto/CNJ recuperado',
              'DataJud consultado',
              'DJEN consultado',
              'Erros de fonte preservados sem virar “zero resultados”',
              'Timeline e interpretação processual geradas',
              'Dossiê HTML criado em modo '+mode
            ],
            status:'done'
          });
          return;
        }

        s.addMessage({
          role:'assistant',
          content:legalChatAnswer(legal,prompt,{count:recalls.length,titles:recalls.map(x=>x.title)}),
          engine:'PredictLM · Processos',
          sources:legalSources(legal),
          actions:[
            'Contexto local recuperado',
            'DataJud consultado',
            'DJEN consultado',
            'Portal oficial considerado quando disponível',
            'Eventos normalizados e interpretados'
          ],
          status:'done'
        });
        return;
      }

      const messages=history.slice(-12).map(m=>({role:m.role,content:safeHistoricalContent(m.content)}));

      // Normal Chat follows the proven direct streaming architecture:
      // history -> API -> SSE tokens. No RAG/skills/gates are inserted before
      // the model for ordinary conversation. Specialized/deep/current turns
      // keep the richer PredictLM pipeline below.
      const directStreamEligible=!s.deepThink&&!needsWeb&&!tutorIntent&&!reportIntent.wantsReport&&prompt.length<=5000;
      if(directStreamEligible){
        setActivity(['Predict Auto · conectando ao modelo']);
        const streamed=await requestStreamingChat({
          messages:[...messages,{role:'user',content:prompt}],
          language,
          signal:turnController.signal
        });
        if(streamed.ok)return;
        if(direct&&kind==='casual'){
          s.addMessage({
            role:'assistant',
            content:direct,
            engine:'Predict Auto',
            status:'done'
          });
          return;
        }
      }

      const factualAnchor=kind==='factual'?stableFactualReply(prompt):null;
      const practicalAnchor=kind==='howto'?practicalHowToReply(prompt):null;
      const answerAnchor=kind==='howto'?(direct||practicalAnchor||''):(factualAnchor||direct||'');

      let web=needsWeb
        ? await webContext(prompt,turnController.signal)
        : {text:'',sources:[] as any[],items:[] as any[]};
      let research=web.items.length?synthesizeResearch(prompt,web.items):null;
      let researchContext=web.text;

      // FreeLLM-first: the provider mesh gets the first chance to generate a
      // substantive answer. PredictLM still supplies context, validation and
      // local/knowledge fallbacks when providers are unavailable.
      const offlineAnchor=generativeOfflineReply(prompt,kind);
      const localFallback=direct||practicalAnchor||factualAnchor||
        ((kind==='hypothetical'||kind==='howto')?offlineAnchor:null);

      const continuationLike=/^(?:e\b|mas\b|ent[aã]o\b|isso\b|ele\b|ela\b|eles\b|elas\b|continue\b|continua\b|e sobre\b)/i.test(prompt.trim());
      const cleanEligible=!needsWeb&&prompt.length<=900&&(
        kind==='hypothetical'||kind==='factual'||kind==='howto'||(kind==='general'&&!continuationLike)
      );

      const deliverProviderCandidate=(result:any)=>{
        if(!result.ok)return false;
        const apiSources=filterDisplayedSources(prompt,[
          ...web.sources,
          ...(Array.isArray(result.data?.sources)?result.data.sources:[])
        ],8);
        const report=prepareReportArtifact(prompt,result.text);
        s.addMessage({
          role:'assistant',
          content:report?.content||result.text,
          engine:'Predict Auto',
          sources:showExecutionDetails?apiSources:[],
          ...(report?.media?.length?{media:report.media}:{}),
          ...(showExecutionDetails||report?{
            reasoningSummary:showExecutionDetails?buildReasoningSummary({
              kind,
              webCount:apiSources.length,
              provider:true,
              anchor:!!answerAnchor,
              deep:s.deepThink
            }):undefined,
            actions:[
              result.data?.provider==='freellmapi'
                ? 'FreeLLMAPI respondeu como provider padrão'
                : 'Provider mesh respondeu',
              ...(apiSources.length?['Pesquisa integrada · '+apiSources.length+' fonte(s) relevante(s)']:[]),
              ...(report?['Report Architect · qualidade '+report.quality.score+'/100','Conteúdo completo disponível no Dossiê Studio']:[]),
              'Resposta final validada antes de exibir'
            ]
          }:{}),
          status:'done'
        });
        return true;
      };

      setActivity([
        'FREELLM FIRST · consultando provider padrão',
        'PREDICT CORE · aplicando histórico, contexto e validações',
        ...(needsWeb?['RESEARCH · contexto atual preparado']:[]),
        'VERIFY · validando aderência ao pedido'
      ]);

      let candidate=await requestApiAnswer({
        prompt,
        language,
        kind,
        messages,
        researchContext,
        localAdvisory:'',
        answerAnchor,
        brainContext,
        deep:s.deepThink,
        clean:cleanEligible,
        signal:turnController.signal
      });

      // Ordinary Chat stays conversational. A rejected clean answer must not
      // promote the turn into Agent Fabric / GitHub Knowledge / skill dumps.
      // Full orchestration is reserved for explicit DeepThink or turns that
      // genuinely require current/researched evidence.
      const shouldUseFullRoute=s.deepThink||needsWeb;
      if(!candidate.ok&&shouldUseFullRoute){
        setActivity([
          needsWeb?'RESEARCH · usando evidência necessária':'DEEPTHINK · ampliando análise',
          'PREDICT ROUTER · tentando rota completa',
          'VERIFY · mantendo foco no pedido'
        ]);
        candidate=await requestApiAnswer({
          prompt,
          language,
          kind,
          messages,
          researchContext,
          localAdvisory:'',
          answerAnchor,
          brainContext,
          deep:s.deepThink,
          clean:false,
          signal:turnController.signal
        });
      }

      if(deliverProviderCandidate(candidate))return;

      // If server-side providers are unavailable, keep normal chat intelligent
      // by trying the already-installed browser cloud API before local/template
      // fallbacks. This path remains isolated from RAG and skills.
      if(!s.deepThink&&!needsWeb&&kind!=='casual'&&kind!=='context'){
        setActivity(['Tentando uma segunda rota de conversa']);
        const puter=await requestPuterChat({
          prompt,
          messages,
          language,
          signal:turnController.signal
        });
        if(puter.ok){
          const report=prepareReportArtifact(prompt,puter.text);
          s.addMessage({
            role:'assistant',
            content:report?.content||puter.text,
            engine:'Predict Auto',
            ...(report?.media?.length?{media:report.media}:{}),
            ...(report?{actions:['Report Architect · qualidade '+report.quality.score+'/100','Conteúdo completo disponível no Dossiê Studio']}:{}),
            status:'done'
          });
          return;
        }
      }

      setActivity([
        'PROVIDER MESH · APIs não concluíram o turno',
        ...(currentNeural.loaded||currentWebLLM.loaded?['NEURAL LOCAL · tentando geração local']:['PREDICT CORE · tentando conhecimento local']),
        'VERIFY · preservando o pedido original'
      ]);

      const tryLocalBrain=async()=>{
        try{
          const local=await answerLocally(prompt,messages,{
            deep:s.deepThink,
            language,
            researchContext,
            knowledge:needsWeb||kind==='technical'||reportIntent.wantsReport||!!processNumber,
            fallbackText:localFallback||undefined,
            onStage:(stage)=>{
              const labels:Record<string,string>={
                recall:'RECALL · recuperando contexto',
                plan:'PLAN · estruturando resposta',
                forge:'FORGE · gerando resposta',
                aegis:'AEGIS · revisando resposta',
                verify:'VERIFY · validando resposta'
              };
              setActivity([labels[stage]||'PREDICT CORE · processando']);
            }
          });
          const gate=publicAnswerGate(local.content,language,prompt);
          const publicText=gate.ok?gate.content:sanitizePublicAnswer(local.content,prompt);
          const aligned=responseTopicAlignment(prompt,publicText||local.content);
          const weak=signalsKnowledgeGap(publicText||local.content)
            ||/não tenho (?:contexto|evidência)|nao tenho (?:contexto|evidencia)/i.test(publicText||local.content);
          const minQuality=kind==='howto'?2:kind==='factual'?0:-1;
          if(publicText&&aligned.relevant&&!weak&&answerQuality(prompt,publicText)>=minQuality){
            const localSources=filterDisplayedSources(prompt,local.sources||[],8);
            const report=prepareReportArtifact(prompt,publicText);
            s.addMessage({
              role:'assistant',
              content:report?.content||publicText,
              engine:'Predict Auto',
              sources:showExecutionDetails?localSources:[],
              ...(report?.media?.length?{media:report.media}:{}),
              ...(showExecutionDetails||report?{
                reasoningSummary:showExecutionDetails?buildReasoningSummary({
                  kind,
                  webCount:localSources.length,
                  localBrain:true,
                  anchor:!!localFallback,
                  deep:s.deepThink
                }):undefined,
                actions:[
                  'Resposta local validada',
                  ...(localSources.length?['Contexto relevante · '+localSources.length+' fonte(s)']:[]),
                  ...(report?['Report Architect · qualidade '+report.quality.score+'/100','Conteúdo completo disponível no Dossiê Studio']:[])
                ]
              }:{}),
              status:'done'
            });
            return true;
          }
        }catch{}
        return false;
      };

      if(await tryLocalBrain())return;

      // Online chat never starts downloading Qwen just because a cloud request
      // failed. Neural Local remains available when the user explicitly loaded
      // it from the model/offline controls.
      if(!currentNeural.loaded&&!currentWebLLM.loaded){
        setLoadState(null);
      }

      if(s.localRuntimeEnabled){
        setActivity(['PREDICT CORE · tentando runtime local configurado','VERIFY · validando resposta local']);
        try{
          const runtimeReply=await answerViaLocalRuntime(prompt,messages,{
            deep:s.deepThink,
            preferred:'auto',
            language,
            researchContext,
            signal:turnController.signal,
            advisoryOnly:false
          });
          setLocalRuntimeLabel(runtimeReply.label.replace(/ · \d+$/,''));
          const gate=publicAnswerGate(runtimeReply.content,language,prompt);
          const publicText=gate.ok?gate.content:sanitizePublicAnswer(runtimeReply.content,prompt);
          if(publicText&&responseTopicAlignment(prompt,publicText).relevant&&!signalsKnowledgeGap(publicText)){
            const report=prepareReportArtifact(prompt,publicText);
            s.addMessage({
              role:'assistant',
              content:report?.content||publicText,
              engine:'Predict Auto',
              sources:filterDisplayedSources(prompt,runtimeReply.sources||[],8),
              ...(report?.media?.length?{media:report.media}:{}),
              reasoningSummary:buildReasoningSummary({kind,webCount:runtimeReply.sources?.length||0,localBrain:true,deep:s.deepThink}),
              actions:[
                'PredictLM Core executou o runtime local',
                'Resposta final passou pelo Prompt OS, memória, skills e gate público',
                'Provider remoto não foi necessário nesta etapa',
                ...(report?['Report Architect · qualidade '+report.quality.score+'/100','Conteúdo completo disponível no Dossiê Studio']:[])
              ],
              status:'done'
            });
            return;
          }
        }catch{}
      }

      // Último caminho interno: o chat não quebra só porque nenhum provider
      // remoto respondeu. Mantemos o pedido dentro do PredictLM.
      const safeFallbacks=[practicalAnchor,factualAnchor,direct,research?.content,offlineAnchor]
        .filter(Boolean) as string[];
      for(const fallback of safeFallbacks){
        const gate=publicAnswerGate(fallback,language,prompt);
        const publicText=gate.ok?gate.content:sanitizePublicAnswer(fallback,prompt);
        if(publicText&&responseTopicAlignment(prompt,publicText).relevant&&!signalsKnowledgeGap(publicText)){
          s.addMessage({
            role:'assistant',
            content:publicText,
            engine:'Predict Auto',
            sources:research?.sources||[],
            reasoningSummary:buildReasoningSummary({kind,webCount:research?.sources?.length||0,anchor:true}),
            actions:[
              'Providers opcionais não concluíram o turno',
              'PredictLM usou resposta interna compatível com o mesmo pedido',
              'Nenhuma dependência de Grok, Claude ou ChatGPT'
            ],
            status:'done'
          });
          return;
        }
      }

      const rescue=generativeOfflineReply(prompt,kind)||'Entendi. Tenta me dizer de outro jeito e eu sigo daqui.';
      s.addMessage({
        role:'assistant',
        content:sanitizePublicAnswer(rescue,prompt)||rescue,
        engine:'Predict Auto',
        ...(showExecutionDetails?{actions:['Resposta de contingência utilizada']}:{ }),
        status:'done'
      });
      return;
    }catch(err:any){
      if(turnController.signal.aborted)return;
      const message='Não consegui concluir toda a execução. **Falha:** '+(err?.message||'erro desconhecido')+'.';
      s.addMessage({
        role:'assistant',
        content:message,
        actions:activity.length?activity:['A tarefa foi iniciada, mas falhou antes de concluir.'],
        status:'error'
      });
      fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'error',surface:'chat',message,metadata:{prompt}})}).catch(()=>{});
    }finally{
      if(turnAbort.current===turnController)turnAbort.current=null;
      setBusy(false);
      setActivity([]);
      setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),30);
    }
  }

  function cancelCurrentTurn(){
    turnAbort.current?.abort();
    turnAbort.current=null;
    cancelNeuralWork();
    setBusy(false);
    setActivity([]);
    setModelTick(x=>x+1);
    setModelError('Execução interrompida para manter o app responsivo.');
  }

  async function cancelModelLoad(){
    const local=cancelNeuralLoad();
    const web=await cancelWebLLMLoad();
    if(local||web){
      setLoadState(null);
      setModelTick(x=>x+1);
      setModelError('Carregamento local cancelado. O Predict Auto continua por knowledge, pesquisa e providers configurados.');
    }
  }

  async function toggleLocalRuntime(){
    if(s.localRuntimeEnabled){
      s.setLocalRuntimeEnabled(false);
      setLocalRuntimeLabel('Auto');
      setModelMenu(false);
      return;
    }
    setModelError('');
    setLocalRuntimeLabel('Procurando…');
    try{
      const runtimes=await probeLocalRuntimes();
      const found=runtimes.find(x=>x.available);
      if(!found){
        setLocalRuntimeLabel('Auto');
        setModelError('Nenhum runtime local acessível. Configure o FreeLLMAPI ou inicie Ollama, llamafile/NanoMind, GenieX ou LowRAM; o runtime precisa aceitar acesso local/CORS.');
        return;
      }
      setLocalRuntimeLabel(found.label.replace(/ · \d+$/,''));
      s.setLocalRuntimeEnabled(true);
      setModelMenu(false);
    }catch(err:any){
      setLocalRuntimeLabel('Auto');
      setModelError(err?.message||'Não foi possível detectar runtime local.');
    }
  }

  async function configureFreeLLMAPI(){
    const key=window.prompt('Cole a unified key do FreeLLMAPI local (ela fica somente neste navegador):','');
    if(!key?.trim())return;
    setLocalRuntimeCredential('freellmapi',key.trim());
    setModelError('');
    setLocalRuntimeLabel('FreeLLMAPI');
    try{
      const runtimes=await probeLocalRuntimes();
      const found=runtimes.find(x=>x.id==='freellmapi'&&x.available);
      if(!found)throw new Error('FreeLLMAPI não respondeu em localhost:3001. Inicie o router e confirme a unified key/CORS.');
      s.setLocalRuntimeEnabled(true);
      setLocalRuntimeLabel('FreeLLMAPI');
      setModelMenu(false);
    }catch(err:any){
      setModelError(err?.message||'Não foi possível conectar ao FreeLLMAPI local.');
    }
  }

  async function enableAutoLocal(){
    setModelMenu(false);
    setModelError('');
    setLoadState({tier:'lite',progress:null,status:'Preparando modo offline sob demanda…'});
    try{
      if(caps.webgpu){
        try{
          await loadWebLLMModel('lite',p=>setLoadState({tier:'lite',progress:p.progress,status:'GPU local · '+p.status}));
          unloadNeuralModel();
          setLoadState(null);
          setModelTick(x=>x+1);
          return;
        }catch{
          await unloadWebLLMModel();
          setLoadState({tier:'lite',progress:null,status:'GPU indisponível · usando modo econômico CPU/WASM'});
        }
      }
      await loadNeuralModel('lite',p=>setLoadState({tier:'lite',progress:p.progress,status:'Modo offline · '+p.status}),{persistPreference:true});
      setLoadState(null);
      setModelTick(x=>x+1);
    }catch(err:any){
      setLoadState(null);
      setModelTick(x=>x+1);
      setModelError((err?.message||'Falha ao ativar o modo offline')+'. O Predict Auto continua funcionando pelo servidor/pesquisa sem carregar outro modelo local.');
    }
  }

  async function enableWebLLM(tier:WebLLMTier){
    setModelMenu(false);
    setModelError('');
    setLoadState({tier,progress:null,status:'iniciando WebLLM/WebGPU'});
    try{
      await loadWebLLMModel(tier,p=>setLoadState({tier,progress:p.progress,status:p.status}));
      unloadNeuralModel();
      setLoadState(null);
      setModelTick(x=>x+1);
    }catch(err:any){
      setLoadState(null);
      setModelTick(x=>x+1);
      setModelError((err?.message||'Falha ao carregar WebLLM')+'. O Neural Lite CPU/WASM continua disponível.');
    }
  }

  async function enableNeural(tier:NeuralTier){
    setModelMenu(false);setModelError('');setLoadState({tier,progress:null,status:tier==='lite'?'iniciando modo econômico CPU/WASM':'testando WebGPU e fallback'});
    try{
      await loadNeuralModel(tier,p=>setLoadState({tier,progress:p.progress,status:p.status}));
      await unloadWebLLMModel();
      setLoadState(null);
      setModelTick(x=>x+1);
    }catch(err:any){
      setLoadState(null);
      setModelTick(x=>x+1);
      setModelError((err?.message||'Falha ao carregar modelo local')+'. Tente o modo Lite/CPU se o Smart não couber nesta máquina.');
    }
  }

  function openChat(id?:string){
    if(id)s.setActive(id);
    setScreen('chat');
    closeSidebarOnMobile();
  }

  function unloadNeural(){
    unloadNeuralModel();
    void unloadWebLLMModel();
    setLoadState(null);
    setModelMenu(false);
    setModelError('Modelo local descarregado e memória liberada.');
    setModelTick(x=>x+1);
  }

  function sendFeedback(kind:'positive'|'negative',message:string){
    rateAdaptiveAnswer(message,kind==='positive');
    setModelTick(x=>x+1);
    fetch('/api/feedback',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({kind,surface:'chat',message,metadata:{sessionId:active?.id||null}})
    }).catch(()=>{});
  }

  const hasMessages=!!active?.messages.length;
  const modeLabel='Predict Auto';

  return <div className={'grok-shell '+(sidebar?'sidebar-open':'sidebar-closed')}>
    <aside className="grok-sidebar">
      <div className="grok-sidebar-top grok-sidebar-brandbar">
        <button className="grok-logo grok-brand-logo" onClick={()=>{s.createChat();setScreen('chat')}} title="Nova conversa"><Scale size={20}/></button>
        <div className="grok-brand-copy"><b>PredictLM</b><small>Inteligência Jurídica</small></div>
        <div className="grok-top-icons">
          <button onClick={()=>setSearching(v=>!v)} title="Buscar"><Search size={17}/></button>
          <button onClick={()=>setSidebar(false)} title="Recolher sidebar"><PanelLeft size={17}/></button>
        </div>
      </div>

      {searching&&<div className="grok-search"><Search size={14}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conversas"/></div>}

      <nav className="grok-nav">
        <button className={screen==='chat'?'active':''} onClick={()=>openChat()}><span><Send size={16}/></span>Chat</button>
        <button onClick={()=>{window.location.href='/cognitive/fly'}}><span><Bug size={16}/></span>Mosca</button>
        <button className={screen==='build'?'active':''} onClick={()=>{setScreen('build');closeSidebarOnMobile()}}><span><Code2 size={16}/></span>Build</button>
        <button className={screen==='simulation'?'active':''} onClick={()=>{setScreen('simulation');closeSidebarOnMobile()}}><span><Activity size={16}/></span>Simulação</button>
        <button onClick={()=>{closeSidebarOnMobile();onOpenLegal?.()}}><span><Scale size={16}/></span>Processos</button>
        <button onClick={()=>{window.location.href='/dossie-studio'}}><span><FileText size={16}/></span>Dossiês</button>
        <button className={screen==='imagine'?'active':''} onClick={()=>{setScreen('imagine');closeSidebarOnMobile()}}><span><ImageIcon size={16}/></span>Imagine</button>
        <button className={screen==='vision'?'active':''} onClick={()=>{setScreen('vision');closeSidebarOnMobile()}}><span><Eye size={16}/></span>Visão</button>
        <button className={screen==='library'?'active':''} onClick={()=>{setScreen('library');closeSidebarOnMobile()}}><span><Library size={16}/></span>Library</button>
        <button className={s.webEnabled?'active':''} onClick={()=>{s.setWebEnabled(true);setScreen('chat');closeSidebarOnMobile()}}><span><Globe2 size={16}/></span>Pesquisa no Chat</button>
      </nav>

      <div className="grok-history-label grok-history-head"><span>Recentes</span><button onClick={()=>{s.createChat();setScreen('chat')}} title="Nova conversa"><Plus size={12}/></button></div>
      <div className="grok-history">{visibleSessions.map(chat=><div className={'grok-history-row '+(chat.id===s.activeId&&screen==='chat'?'active':'')} key={chat.id}>
        <button className="grok-history-open" onClick={()=>openChat(chat.id)} title={chat.title}>{chat.title}</button>
        <button className="grok-history-delete" title="Apagar conversa" onClick={()=>{
          if(window.confirm('Apagar a conversa “'+chat.title+'”?'))s.deleteSession(chat.id);
        }}><Trash2 size={11}/></button>
      </div>)}</div>

      <div className="grok-sidebar-bottom">
        <button className={screen==='plugins'?'active':''} onClick={()=>{setScreen('plugins');closeSidebarOnMobile()}}><FolderOpen size={16}/> Plugins</button>
        <div className="grok-profile"><div>P</div><span><b>Predict Auto</b><small>FreeLLM padrão · APIs + local fallback</small></span></div>
      </div>
    </aside>
    {sidebar?<button className="grok-mobile-backdrop" aria-label="Fechar menu" onClick={()=>setSidebar(false)}/>:null}

    <main className="grok-main">
      {!sidebar&&<button className="grok-reopen" onClick={()=>setSidebar(true)}><Menu size={18}/></button>}
      <div className="grok-status"><span className="private-dot"/> Privado</div>

      {screen==='library'?<LibraryScreen sessions={s.sessions} openChat={openChat} deleteChat={s.deleteSession} createChat={()=>{s.createChat();setScreen('chat')}}/>:
      screen==='build'?<GrokBuildPanel/>:
      screen==='research'?<GrokResearchPanel/>:
      screen==='imagine'?<GrokImaginePanel/>:
      screen==='vision'?<AnimalVisionPanel onChat={text=>{s.addMessage({role:'user',content:'Identificar o animal da foto',status:'done'});s.addMessage({role:'assistant',content:text,engine:'Visão',status:'done'});setScreen('chat');}}/>:
      screen==='simulation'?<GrokSimulationPanel/>:
      screen==='plugins'?<GrokPluginsPanel/>:
      !hasMessages?<section className="grok-home grok-home-dashboard">
        <div className="grok-dashboard-grid">
          <div className="grok-home-core">
            <div className="grok-hero-copy">
              <span>SUA PLATAFORMA DE IA JURÍDICA</span>
              <h1>O que vamos <em>explorar hoje?</em></h1>
              <p>Pesquise, analise, construa e automatize fluxos jurídicos com inteligência artificial, seus dados e fontes oficiais.</p>
            </div>

            <Composer value={input} setValue={setInput} send={send} cancelTurn={cancelCurrentTurn} busy={busy} modeLabel={modeLabel} web={s.webEnabled} setWeb={s.setWebEnabled} deep={s.deepThink} setDeep={s.setDeepThink} plusOpen={plusOpen} setPlusOpen={setPlusOpen} modelMenu={modelMenu} setModelMenu={setModelMenu} enableAutoLocal={enableAutoLocal} enableNeural={enableNeural} caps={caps} neural={neural} memoryStats={memoryStats} learningStats={learningStats} webllm={webllm} enableWebLLM={enableWebLLM} configureFreeLLMAPI={configureFreeLLMAPI} cloud={s.cloudEnabled} setCloud={s.setCloudEnabled} localRuntime={s.localRuntimeEnabled} toggleLocalRuntime={toggleLocalRuntime} localRuntimeLabel={localRuntimeLabel} unloadNeural={unloadNeural} onOpenBuild={()=>setScreen('build')} onOpenResearch={()=>{s.setWebEnabled(true);setScreen('chat')}} onOpenVision={()=>setScreen('vision')} onOpenMedia={()=>setScreen('imagine')} onOpenSimulation={()=>setScreen('simulation')} onOpenLegal={onOpenLegal}/>

            <div className="grok-home-cards">
              <button className="grok-home-card teal" onClick={()=>{setScreen('build');closeSidebarOnMobile()}}>
                <span className="grok-home-card-icon"><Code2 size={22}/></span>
                <b>Build Mode</b>
                <p>Crie e continue sites, apps, sistemas e dashboards sem sair do ambiente.</p>
                <strong>Começar agora <ChevronDown size={14}/></strong>
              </button>
              <button className="grok-home-card violet" onClick={()=>{setScreen('simulation');closeSidebarOnMobile()}}>
                <span className="grok-home-card-icon"><Activity size={22}/></span>
                <b>Simulação de Vida</b>
                <p>Rode uma simulação persistente com personagem, rotina, relações, memória e NeuroCore.</p>
                <strong>Abrir simulador <ChevronDown size={14}/></strong>
              </button>
              <button className="grok-home-card amber" onClick={()=>{closeSidebarOnMobile();onOpenLegal?.()}}>
                <span className="grok-home-card-icon"><Scale size={22}/></span>
                <b>Processos</b>
                <p>Consulte e analise processos em tempo real com DataJud, DJEN e fontes oficiais.</p>
                <strong>Pesquisar processos <ChevronDown size={14}/></strong>
              </button>
              <button className="grok-home-card blue" onClick={()=>{closeSidebarOnMobile();onOpenLegal?.()}}>
                <span className="grok-home-card-icon"><ShieldCheck size={22}/></span>
                <b>Monitoramento Jurídico</b>
                <p>Confira movimentações, publicações e o estado atual das integrações jurídicas.</p>
                <strong>Consultar <ChevronDown size={14}/></strong>
              </button>
            </div>

            <div className="grok-quick-actions">
              <span>Ações rápidas</span>
              <div>
                <button onClick={()=>{setInput('Analise este documento e destaque fatos, riscos e próximos passos.');setScreen('chat')}}><FileText size={13}/>Analisar documento</button>
                <button onClick={()=>{setInput('Resuma este processo de forma direta, com situação atual e próximos passos.');setScreen('chat')}}><Scale size={13}/>Resumir processo</button>
                <button onClick={()=>{s.setWebEnabled(true);setInput('Pesquise jurisprudência atual sobre: ');setScreen('chat')}}><Search size={13}/>Pesquisar jurisprudência</button>
                <button onClick={()=>{setInput('Crie uma minuta jurídica com base no contexto que vou fornecer.');setScreen('chat')}}><FileText size={13}/>Criar minuta</button>
              </div>
            </div>
          </div>

          <aside className="grok-home-side">
            <section className="grok-system-card">
              <header><div><ShieldCheck size={16}/><b>Status dos sistemas</b></div><span><i/>Tempo real</span></header>

              <article className={'grok-source-health '+(legalHealth?.datajud.ok?'ok':'error')}>
                <span className="health-orb">{legalHealth?.datajud.ok?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}</span>
                <div><b>DataJud</b><strong>{legalHealth?.datajud.ok?'Online':'Requer atenção'}</strong><small>{legalHealth?.datajud.detail||'Verificando API pública...'}</small></div>
                <button onClick={refreshLegalHealth} disabled={legalHealthBusy}>{legalHealthBusy?<RefreshCw className="spin" size={12}/>:<RefreshCw size={12}/>}Verificar</button>
              </article>

              <article className={'grok-source-health '+(legalHealth?.djen.ok?'ok':'error')}>
                <span className="health-orb">{legalHealth?.djen.ok?<CheckCircle2 size={19}/>:<AlertTriangle size={19}/>}</span>
                <div><b>DJEN</b><strong>{legalHealth?.djen.ok?'Online':'Requer atenção'}</strong><small>{legalHealth?.djen.detail||'Verificando comunicações...'}</small></div>
                <button onClick={refreshLegalHealth} disabled={legalHealthBusy}>{legalHealthBusy?<RefreshCw className="spin" size={12}/>:<RefreshCw size={12}/>}Verificar</button>
              </article>
            </section>

            <section className="grok-system-card grok-system-health">
              <header><div><Activity size={16}/><b>Saúde do sistema</b></div><span className={(legalHealth?.datajud.ok&&legalHealth?.djen.ok)?'healthy':'attention'}><i/>{(legalHealth?.datajud.ok&&legalHealth?.djen.ok)?'Operacional':'Atenção'}</span></header>
              <div className="grok-health-row"><span><Globe2 size={13}/>Fontes jurídicas</span><b>{legalHealth?.datajud.ok&&legalHealth?.djen.ok?'2/2 online':legalHealth?'parcial':'verificando'}</b></div>
              <div className="grok-health-row"><span><Brain size={13}/>Memória adaptativa</span><b>{memoryStats?.trusted||0}/{memoryStats?.count||0} confiáveis</b></div>
              <div className="grok-health-row"><span><Library size={13}/>Base de conhecimento</span><b>{learningStats?.sources?.total||0} fontes</b></div>
              <div className="grok-health-row"><span><Zap size={13}/>Neural local</span><b>{neural?.loaded||webllm?.loaded?'Ativo':'Sob demanda'}</b></div>
              <footer><Clock3 size={13}/><span><b>Última verificação</b><small>{legalHealth?.fetchedAt?new Date(legalHealth.fetchedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'aguardando'}</small></span></footer>
            </section>

            <section className="grok-system-card grok-activity-card">
              <header><div><Bell size={16}/><b>Atividade recente</b></div></header>
              <div className={legalHealth?.datajud.ok?'ok':'warn'}><span>{legalHealth?.datajud.ok?<CheckCircle2 size={13}/>:<AlertTriangle size={13}/>}</span><p><b>{legalHealth?.datajud.ok?'DataJud verificado':'DataJud com falha'}</b><small>{legalHealth?.datajud.detail||'Aguardando verificação.'}</small></p></div>
              <div className={legalHealth?.djen.ok?'ok':'warn'}><span>{legalHealth?.djen.ok?<CheckCircle2 size={13}/>:<AlertTriangle size={13}/>}</span><p><b>{legalHealth?.djen.ok?'DJEN verificado':'DJEN com falha'}</b><small>{legalHealth?.djen.detail||'Aguardando verificação.'}</small></p></div>
              <div className="info"><span><Brain size={13}/></span><p><b>Predict Auto pronto</b><small>Chat, pesquisa, memória e runtimes continuam disponíveis.</small></p></div>
            </section>
          </aside>
        </div>
      </section>:
      <section className="grok-conversation-wrap">
        <div className="grok-conversation">{active.messages.map(m=><article className={'grok-message '+m.role} key={m.id}><div className="grok-avatar">{m.role==='assistant'?<Sparkles size={14}/>:<span>EU</span>}</div><div className="grok-message-body"><div className="grok-message-meta"><b>{m.role==='assistant'?'PredictLM':'Você'}</b>{m.engine&&<span>{m.engine}</span>}</div><div className="grok-message-text">{renderText(safeHistoricalContent(m.content))}</div>{m.reasoningSummary&&m.role==='assistant'?<details className="grok-reasoning"><summary><Brain size={11}/><span>Raciocínio</span><ChevronDown className="grok-reasoning-chevron" size={11}/></summary><p>{m.reasoningSummary}</p></details>:null}{m.media?.length?<div className="grok-media-results">{m.media.map((media,i)=>media.kind==='image'?<a href={media.url} target="_blank" rel="noreferrer" key={i}><img src={media.url} alt={media.label||'Imagem gerada'}/></a>:media.kind==='video'?<video key={i} src={media.url} controls loop playsInline/>:<a className="grok-file-result" href={media.url} download={media.downloadName||media.label||'arquivo'} key={i}><b>{media.label||'Arquivo gerado'}</b><span>{media.mime||'arquivo'} · baixar</span></a>)}</div>:null}{m.sources?.length?<details className="grok-sources"><summary>{m.sources.length} fontes/contextos</summary>{m.sources.map((src,i)=><div key={i}><b>{src.title}</b><span>{src.source}</span></div>)}</details>:null}{m.role==='assistant'?<div className="grok-feedback"><button onClick={()=>speakBrowserText(m.content,{lang:'pt-BR'})} title="Ouvir resposta"><Volume2 size={11}/></button><button onClick={()=>sendFeedback('positive',m.content)} title="Resposta útil"><ThumbsUp size={11}/></button><button onClick={()=>sendFeedback('negative',m.content)} title="Resposta incompleta ou errada"><ThumbsDown size={11}/></button></div>:null}</div></article>)}{busy&&<article className="grok-message assistant"><div className="grok-avatar"><Sparkles size={14}/></div><div className="grok-message-body"><div className="grok-message-meta"><b>PredictLM</b><span>gerando</span></div><details className="grok-reasoning grok-reasoning-live"><summary><Brain size={11}/><span>Raciocínio</span><i className="grok-live-dot"/><ChevronDown className="grok-reasoning-chevron" size={11}/></summary>{activity.length>0?<div className="grok-activity">{activity.map((x,i)=><div key={x}><span>{i===activity.length-1?'…':'→'}</span>{x}</div>)}</div>:<p>Preparando a resposta final.</p>}</details></div></article>}<div ref={bottom}/></div>
        <div className="grok-bottom-composer"><Composer compact value={input} setValue={setInput} send={send} cancelTurn={cancelCurrentTurn} busy={busy} modeLabel={modeLabel} web={s.webEnabled} setWeb={s.setWebEnabled} deep={s.deepThink} setDeep={s.setDeepThink} plusOpen={plusOpen} setPlusOpen={setPlusOpen} modelMenu={modelMenu} setModelMenu={setModelMenu} enableAutoLocal={enableAutoLocal} enableNeural={enableNeural} caps={caps} neural={neural} memoryStats={memoryStats} learningStats={learningStats} webllm={webllm} enableWebLLM={enableWebLLM} configureFreeLLMAPI={configureFreeLLMAPI} cloud={s.cloudEnabled} setCloud={s.setCloudEnabled} localRuntime={s.localRuntimeEnabled} toggleLocalRuntime={toggleLocalRuntime} localRuntimeLabel={localRuntimeLabel} unloadNeural={unloadNeural} onOpenBuild={()=>setScreen('build')} onOpenResearch={()=>{s.setWebEnabled(true);setScreen('chat')}} onOpenVision={()=>setScreen('vision')} onOpenMedia={()=>setScreen('imagine')} onOpenSimulation={()=>setScreen('simulation')} onOpenLegal={onOpenLegal}/></div>
      </section>}

      {loadState&&<div className="grok-model-load"><div><b>Carregando {loadState.tier}</b><span>{loadState.status}</span></div><strong>{loadState.progress!=null?Math.round(loadState.progress)+'%':'…'}</strong><button onClick={cancelModelLoad}>Cancelar</button></div>}
      {modelError&&<div className="grok-model-error">{modelError}<button onClick={()=>setModelError('')}><X size={12}/></button></div>}
    </main>
  </div>
}

function Composer(props:any){
  const {value,setValue,send,cancelTurn,busy,modeLabel,web,setWeb,deep,setDeep,plusOpen,setPlusOpen,modelMenu,setModelMenu,enableAutoLocal,unloadNeural,neural,webllm,memoryStats,learningStats,onOpenBuild,onOpenResearch,onOpenMedia,onOpenVision,onOpenSimulation,onOpenLegal,compact}=props;
  const localReady=!!(neural?.loaded||webllm?.loaded);
  return <div className={'grok-composer-shell '+(compact?'compact':'')}>
    <textarea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Pergunte qualquer coisa"/>
    <div className="grok-composer-actions">
      <div className="grok-plus-wrap"><button className="grok-plus" onClick={()=>setPlusOpen((v:boolean)=>!v)}><Plus size={18}/></button>{plusOpen&&<div className="grok-plus-menu"><button onClick={onOpenBuild}><Code2 size={14}/><span><b>Build Mode</b><small>Continuar ou criar aplicativo</small></span></button><button onClick={onOpenLegal}><Scale size={14}/><span><b>Processos</b><small>DataJud + DJEN + dossiê</small></span></button><button onClick={onOpenSimulation}><Activity size={14}/><span><b>Simulação ativa</b><small>Personagem, mundo, memória e NeuroCore</small></span></button><button onClick={()=>{setWeb(true);setPlusOpen(false)}}><Globe2 size={14}/><span><b>Pesquisar no Chat</b><small>Usar fontes atuais nesta conversa</small></span></button><button onClick={onOpenVision}><Eye size={14}/><span><b>Identificar animal</b><small>Analisar uma foto</small></span></button><button onClick={onOpenMedia}><ImageIcon size={14}/><span><b>Imagine</b><small>Abrir Media Studio</small></span></button></div>}</div>
      <div className="grok-composer-right">
        <button className={web?'active':''} onClick={()=>setWeb(!web)}><Globe2 size={13}/>Web</button>
        <button className={deep?'active':''} onClick={()=>setDeep(!deep)}><Brain size={13}/>{deep?'Deep':'Fast'}</button>
        <div className="grok-model-wrap">
          <button className="predict-auto-trigger" onClick={()=>setModelMenu((v:boolean)=>!v)}><Zap size={13}/>{modeLabel}</button>
          {modelMenu&&<div className="grok-model-menu grok-auto-menu">
            <div className="grok-auto-head"><span className="grok-auto-orb"><Sparkles size={15}/></span><div><b>Predict Auto</b><span>PredictLM Core responde por Neural Local, WebLLM, knowledge e memória; pesquisa e providers configurados entram apenas quando úteis.</span></div></div>
            <div className="grok-auto-status">
              <span><i className="online"/> PredictLM Core · resposta principal</span>
              <span><i className={localReady?'online':''}/> {localReady?'Neural Local pronto':'Neural Local sob demanda'}</span>
              <small>{learningStats?.sources?.total||0} fontes · Skill Forge {learningStats?.githubKnowledge?.chunks||0} chunks · memória {memoryStats?.trusted||0}/{memoryStats?.count||0}</small>
            </div>
            {!localReady&&<button onClick={enableAutoLocal}><b>Ativar Neural Local</b><span>Baixa o motor econômico para responder diretamente dentro do PredictLM, sem exigir API externa.</span></button>}
            {localReady&&<button onClick={unloadNeural}><b>Liberar memória local</b><span>Descarrega GPU/CPU local; o Predict Auto continua por knowledge, pesquisa e providers configurados.</span></button>}
          </div>}
        </div>
        <button className="grok-send" onClick={busy?cancelTurn:send} disabled={!busy&&!value.trim()} title={busy?'Parar execução':'Enviar'}>{busy?<X size={17}/>:<Send size={17}/>}</button>
      </div>
    </div>
  </div>
}

function LibraryScreen({sessions,openChat,deleteChat,createChat}:{sessions:any[];openChat:(id:string)=>void;deleteChat:(id:string)=>void;createChat:()=>void}){
  return <section className="grok-library">
    <div className="grok-library-head"><div><span>Library</span><h1>Suas conversas</h1><p>Histórico local do PredictLM.</p></div><button onClick={createChat}><Plus size={14}/>Nova conversa</button></div>
    <div className="grok-library-grid">{sessions.map(chat=><article key={chat.id}>
      <button className="grok-library-open" onClick={()=>openChat(chat.id)}><Sparkles size={16}/><b>{chat.title}</b><span>{chat.messages.length} mensagens</span></button>
      <button className="grok-library-delete" title="Apagar conversa" onClick={()=>{
        if(window.confirm('Apagar a conversa “'+chat.title+'”?'))deleteChat(chat.id);
      }}><Trash2 size={13}/>Apagar</button>
    </article>)}</div>
  </section>
}

function renderText(text:string){
  const parts=text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:<React.Fragment key={i}>{part}</React.Fragment>)}</>;
}
