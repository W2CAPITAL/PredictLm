'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Code2, FolderOpen, Globe2, Image as ImageIcon, Library, Menu, PanelLeft, Plus, Scale, Search, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2, X, Zap } from 'lucide-react';
import { useAssistantStore } from '@/lib/assistant-store';
import { answerLocally, browserCapabilities, loadNeuralModel, neuralStatus, unloadNeuralModel, type NeuralTier } from '@/lib/browser-brain';
import { adaptiveInstructionContext, adaptiveMemoryStats, captureAdaptiveInstruction, isAdaptiveInstruction, rateAdaptiveAnswer } from '@/lib/adaptive-memory';
import { answerQuality, classifyConversation, directConversationReply, filterRelevantResearchItems, responseTopicAlignment, shouldSearchConversation, synthesizeResearch } from '@/lib/chat-intelligence';
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
import { publicAnswerGate } from '@/lib/public-answer-gate';
import { loadWebLLMModel, unloadWebLLMModel, webLLMStatus, type WebLLMTier } from '@/lib/webllm-runtime';
import type { LegalProcessBundle } from '@/lib/legal/types';
import { useStudio } from '@/lib/store';
import { GrokBuildPanel } from '@/components/GrokBuildPanel';
import { GrokResearchPanel } from '@/components/GrokResearchPanel';
import { GrokImaginePanel } from '@/components/GrokImaginePanel';
import { GrokPluginsPanel } from '@/components/GrokPluginsPanel';

interface Props{
  onOpenLegal?:()=>void;
}

type GrokScreen='chat'|'library'|'build'|'research'|'imagine'|'plugins';

type ChatMediaKind='image'|'video';

function detectChatMediaRequest(prompt:string):ChatMediaKind|null{
  const p=prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ');
  const explicit=/(gere|gerar|crie|criar|faca|faça|desenhe|renderize|produza|quero)/.test(p);
  if(!explicit)return null;
  if(/\b(video|clipe|animacao|animação|motion|filme|reel|short)\b/.test(p))return 'video';
  if(/\b(imagem|foto|ilustracao|ilustração|poster|logo|capa|render|arte)\b/.test(p))return 'image';
  return null;
}

function mediaSubject(prompt:string){
  return prompt
    .replace(/^(gere|gerar|crie|criar|faça|faca|desenhe|renderize|produza|quero)\s+/i,'')
    .replace(/^(uma?|um)\s+(imagem|foto|ilustração|ilustracao|vídeo|video|clipe|animação|animacao)\s+(de|com)?\s*/i,'')
    .trim()||prompt.trim();
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
  const bottom=useRef<HTMLDivElement>(null);
  const caps=useMemo(()=>typeof window==='undefined'?{native:false,webgpu:false,memory:0,cores:0,recommended:'lite' as NeuralTier}:browserCapabilities(),[]);
  const neural=useMemo(()=>neuralStatus(),[modelTick,loadState]);
  const webllm=useMemo(()=>webLLMStatus(),[modelTick,loadState]);
  const memoryStats=useMemo(()=>typeof window==='undefined'?{count:0,trusted:0,lastUpdated:null}:adaptiveMemoryStats(),[modelTick]);
  const learningStats=useMemo(()=>trainingRuntimeStats(),[]);

  const visibleSessions=s.sessions.filter(chat=>chat.title.toLowerCase().includes(search.toLowerCase()));

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

  async function webContext(query:string){
    try{
      const r=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,limit:12})});
      const data=await r.json();
      if(!r.ok)return {text:'',sources:[] as any[],items:[] as any[]};
      const rawItems=[...(data.web||[]),...(data.news||[])];
      const items=filterRelevantResearchItems(query,rawItems,10);
      const text=items.map((x:any,i:number)=>'WEB['+(i+1)+'] '+x.title+' — '+(x.summary||x.description||'')+' URL: '+x.url).join('\n');
      return {text,sources:items.map((x:any)=>({title:x.title,source:x.url})),items};
    }catch{return {text:'',sources:[] as any[],items:[] as any[]}}
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
    const kind=classifyConversation(prompt,history);
    const language=resolveConversationLanguage(prompt,history);
    const currentNeural=neuralStatus();
    const currentWebLLM=webLLMStatus();
    const direct=directConversationReply(prompt,history,{loaded:currentNeural.loaded||currentWebLLM.loaded,tier:currentNeural.tier||currentWebLLM.tier});
    const needsWeb=shouldSearchConversation(kind,s.webEnabled,prompt);

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
    const instructionLearned=isAdaptiveInstruction(prompt)&&captureAdaptiveInstruction(prompt);
    if(instructionLearned)setModelTick(x=>x+1);
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
            : s.deepThink&&(currentNeural.loaded||currentWebLLM.loaded)
              ? ['RECALL · recuperando contexto','ROUTE · identificando assunto e intenção','FORGE · preparando rascunho neural','AEGIS · revisando relevância','VERIFY · preparando resposta']
              : s.deepThink
                ? ['RECALL · recuperando contexto','ROUTE · identificando assunto e intenção','VERIFY · usando apenas contexto relevante']
                : ['Analisando contexto']
    );
    setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),20);

    try{
      if(fraudIntent&&!processNumber){
        setActivity(['Classificando sinais de fraude','Verificando links, credenciais e pagamento']);
        const assessment=assessFraudRisk({texts:[prompt]});
        const web=s.webEnabled?await webContext(prompt):{text:'',sources:[] as any[],items:[] as any[]};
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
          setActivity(['Interpretando a imagem','Aplicando qualidade e anti-artefatos','Gerando composição']);
          const enhanced=buildQualityImagePrompt(subject,{style:'Cinematic',attempt:0});
          const r=await fetch('/api/media/generate',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({prompt:enhanced,width:1536,height:1536,seed,model:'flux'})
          });
          const data=await r.json();
          if(!r.ok||!data?.url)throw new Error(data?.error||'A geração de imagem não retornou um arquivo.');
          let imageUrl=String(data.url);
          let upscale:any={upscaled:false,provider:'none'};
          setActivity(['Imagem base criada em alta resolução','Super Resolution · tentando upscale 2×','Validando o resultado']);
          try{
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
            body:JSON.stringify({prompt:enhanced,width:1344,height:768,seed:seed+frames[i].seedOffset,model:'flux'})
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

      const web=needsWeb?await webContext(prompt):{text:'',sources:[] as any[],items:[] as any[]};
      const research=web.items.length?synthesizeResearch(prompt,web.items):null;
      const messages=history.slice(-12).map(m=>({role:m.role,content:m.content}));
      const researchContext=web.text;
      const fallbackText=direct||research?.content||undefined;

      if(kind!=='casual'&&kind!=='context'){
        setActivity(['CACHE · verificando resposta reutilizável','SKILL/RAG · recuperando GitHub top-k','CASCADE · tentando provider configurado','VERIFY · preparando resposta']);
        try{
          const cloudResponse=await fetch('/api/chat',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({prompt,researchContext,language,messages,deep:s.deepThink,instructions:adaptiveInstructionContext(4)})
          });
          const cloudData=await cloudResponse.json();
          if(cloudResponse.ok&&cloudData?.content){
            const gatedCloud=publicAnswerGate(String(cloudData.content||''),language);
            const cloudText=gatedCloud.ok?gatedCloud.content:'';
            const relevant=!!cloudText&&responseTopicAlignment(prompt,cloudText).relevant;
            const quality=cloudText?answerQuality(prompt,cloudText):-99;
            if(!relevant||(kind==='howto'&&quality<3)){
              setActivity(['Provider respondeu com baixa aderência','Continuando no Predict Auto','VERIFY · procurando resposta melhor']);
            }else{
            const cloudSources=[
              ...web.sources,
              ...(Array.isArray(cloudData.sources)?cloudData.sources:[])
            ].filter((x:any,i:number,a:any[])=>a.findIndex(y=>y.source===x.source)===i).slice(0,10);
            s.addMessage({
              role:'assistant',
              content:cloudText,
              engine:'Predict Auto',
              sources:cloudSources,
              actions:[
                ...(needsWeb&&cloudSources.length?['Pesquisa integrada · '+cloudSources.length+' fonte(s) relevante(s)']:[]),
                'Resposta final validada antes de exibir'
              ],
              status:'done'
            });
            return;
            }
          }
        }catch{}
        setActivity(['Provider Mesh não respondeu','Predict Auto usando próximo runtime disponível','VERIFY · preparando resposta']);
      }


      if(s.localRuntimeEnabled){
        setActivity(['TOKEN SAVER · compactando histórico/contexto','LOCAL ROUTER · detectando runtime','SKILL/RAG · injetando somente top-k','VERIFY · checando resposta']);
        try{
          const localReply=await answerViaLocalRuntime(prompt,messages,{deep:s.deepThink,preferred:'auto',language,researchContext});
          const relevant=responseTopicAlignment(prompt,localReply.content).relevant;
          if(relevant){
            setLocalRuntimeLabel(localReply.label.replace(/ · \d+$/,''));
            const localSources=[
              ...web.sources,
              ...localReply.sources
            ].filter((x:any,i:number,a:any[])=>a.findIndex(y=>y.source===x.source)===i).slice(0,10);
            s.addMessage({
              role:'assistant',
              content:localReply.content,
              engine:'Predict Auto',
              sources:localSources,
              actions:[
                ...(needsWeb&&localSources.length?['Pesquisa integrada · '+localSources.length+' fonte(s) relevante(s)']:[]),
                'Resposta final validada antes de exibir'
              ],
              status:'done'
            });
            return;
          }
          setActivity(['Local API respondeu fora do assunto','Retornando ao próximo motor']);
        }catch(err:any){
          setActivity(['Local API indisponível: '+String(err?.message||'falha').slice(0,120),'Retornando ao próximo motor']);
        }
      }

      let reply=await answerLocally(prompt,messages,{
        preferNative:false,
        knowledge:s.deepThink,
        fallbackText,
        language,
        researchContext,
        deep:s.deepThink&&(currentNeural.loaded||currentWebLLM.loaded),
        onStage:stage=>{
          if(!s.deepThink||!(currentNeural.loaded||currentWebLLM.loaded))return;
          const stages={
            recall:['RECALL · recuperando contexto'],
            plan:['RECALL · contexto recuperado','ROUTE · assunto identificado','FORGE · gerando rascunho neural'],
            forge:['FORGE · gerando resposta neural'],
            aegis:['FORGE · rascunho concluído','AEGIS · criticando resposta e removendo desvios'],
            verify:['FORGE · concluído','AEGIS · revisão concluída','VERIFY · checando aderência ao pedido']
          } as const;
          setActivity([...stages[stage]]);
        }
      });

      const directScore=direct?answerQuality(prompt,direct):-99;
      const replyScore=answerQuality(prompt,reply.content);
      const researchScore=research?answerQuality(prompt,research.content):-99;

      const neuralRelevant=(reply.engine==='neural-lite'||reply.engine==='neural-smart'||reply.engine==='webllm')&&responseTopicAlignment(prompt,reply.content).relevant;
      if(direct&&!neuralRelevant&&directScore>=replyScore){
        reply={...reply,content:direct,sources:web.sources.slice(0,4)};
      }else if(research&&!neuralRelevant&&researchScore>replyScore){
        reply={...reply,content:research.content,sources:research.sources};
      }else if((reply.engine==='knowledge'||reply.engine==='knowledge-fallback')&&research&&!direct){
        reply={...reply,content:research.content,sources:research.sources};
      }else if(web.sources.length){
        reply.sources=[...web.sources,...(reply.sources||[])].slice(0,10);
      }

      const gate=publicAnswerGate(reply.content,language);
      if(!gate.ok){
        const candidates=[direct,research?.content].filter(Boolean) as string[];
        const valid=candidates.map(x=>publicAnswerGate(x,language)).find(x=>x.ok);
        if(valid)reply={...reply,content:valid.content,sources:web.sources.slice(0,6)};
        else throw new Error('Não foi possível produzir uma resposta final válida para exibição.');
      }else{
        reply={...reply,content:gate.content};
      }
      const engineLabel='Predict Auto';
      const actions=[
        ...(needsWeb?['Pesquisa integrada ao Chat'+(web.sources.length?' · '+web.sources.length+' fonte(s) relevante(s)':' · nenhuma fonte útil encontrada')]:[]),
        ...(tutorIntent?['Modo de aprendizagem aplicado']:[]),
        'Resposta final validada antes de exibir'
      ];
      s.addMessage({role:'assistant',content:reply.content,engine:engineLabel,sources:reply.sources,actions,status:'done'});
    }catch(err:any){
      const message='Não consegui concluir toda a execução. **Falha:** '+(err?.message||'erro desconhecido')+'.';
      s.addMessage({
        role:'assistant',
        content:message,
        actions:activity.length?activity:['A tarefa foi iniciada, mas falhou antes de concluir.'],
        status:'error'
      });
      fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'error',surface:'chat',message,metadata:{prompt}})}).catch(()=>{});
    }finally{
      setBusy(false);
      setActivity([]);
      setTimeout(()=>bottom.current?.scrollIntoView({behavior:'smooth'}),30);
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
      <div className="grok-sidebar-top">
        <button className="grok-logo" onClick={()=>{s.createChat();setScreen('chat')}} title="Nova conversa"><Sparkles size={20}/></button>
        <div className="grok-top-icons">
          <button onClick={()=>setSearching(v=>!v)} title="Buscar"><Search size={18}/></button>
          <button onClick={()=>setSidebar(false)} title="Recolher sidebar"><PanelLeft size={18}/></button>
        </div>
      </div>

      {searching&&<div className="grok-search"><Search size={14}/><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar conversas"/></div>}

      <nav className="grok-nav">
        <button className={screen==='chat'?'active':''} onClick={()=>openChat()}><span><Send size={16}/></span>Chat</button>
        <button className={screen==='build'?'active':''} onClick={()=>setScreen('build')}><span><Code2 size={16}/></span>Build</button>
        <button onClick={onOpenLegal}><span><Scale size={16}/></span>Processos</button>
        <button className={screen==='imagine'?'active':''} onClick={()=>setScreen('imagine')}><span><ImageIcon size={16}/></span>Imagine</button>
        <button className={screen==='library'?'active':''} onClick={()=>setScreen('library')}><span><Library size={16}/></span>Library</button>
        <button className={screen==='research'?'active':''} onClick={()=>setScreen('research')}><span><Globe2 size={16}/></span>Research</button>
      </nav>

      <div className="grok-history-label grok-history-head"><span>Recentes</span><button onClick={()=>{s.createChat();setScreen('chat')}} title="Nova conversa"><Plus size={12}/></button></div>
      <div className="grok-history">{visibleSessions.map(chat=><div className={'grok-history-row '+(chat.id===s.activeId&&screen==='chat'?'active':'')} key={chat.id}>
        <button className="grok-history-open" onClick={()=>openChat(chat.id)} title={chat.title}>{chat.title}</button>
        <button className="grok-history-delete" title="Apagar conversa" onClick={()=>{
          if(window.confirm('Apagar a conversa “'+chat.title+'”?'))s.deleteSession(chat.id);
        }}><Trash2 size={11}/></button>
      </div>)}</div>

      <div className="grok-sidebar-bottom">
        <button className={screen==='plugins'?'active':''} onClick={()=>setScreen('plugins')}><FolderOpen size={16}/> Plugins</button>
        <div className="grok-profile"><div>P</div><span><b>Predict Local</b><small>private · local-first</small></span></div>
      </div>
    </aside>

    <main className="grok-main">
      {!sidebar&&<button className="grok-reopen" onClick={()=>setSidebar(true)}><Menu size={18}/></button>}
      <div className="grok-status"><span className="private-dot"/> Private</div>

      {screen==='library'?<LibraryScreen sessions={s.sessions} openChat={openChat} deleteChat={s.deleteSession} createChat={()=>{s.createChat();setScreen('chat')}}/>:
      screen==='build'?<GrokBuildPanel/>:
      screen==='research'?<GrokResearchPanel/>:
      screen==='imagine'?<GrokImaginePanel/>:
      screen==='plugins'?<GrokPluginsPanel/>:
      !hasMessages?<section className="grok-home">
        <h1>O que vamos explorar?</h1>
        <Composer value={input} setValue={setInput} send={send} busy={busy} modeLabel={modeLabel} web={s.webEnabled} setWeb={s.setWebEnabled} deep={s.deepThink} setDeep={s.setDeepThink} plusOpen={plusOpen} setPlusOpen={setPlusOpen} modelMenu={modelMenu} setModelMenu={setModelMenu} enableAutoLocal={enableAutoLocal} enableNeural={enableNeural} caps={caps} neural={neural} memoryStats={memoryStats} learningStats={learningStats} webllm={webllm} enableWebLLM={enableWebLLM} configureFreeLLMAPI={configureFreeLLMAPI} cloud={s.cloudEnabled} setCloud={s.setCloudEnabled} localRuntime={s.localRuntimeEnabled} toggleLocalRuntime={toggleLocalRuntime} localRuntimeLabel={localRuntimeLabel} unloadNeural={unloadNeural} onOpenBuild={()=>setScreen('build')} onOpenResearch={()=>setScreen('research')} onOpenMedia={()=>setScreen('imagine')} onOpenLegal={onOpenLegal}/>
        <button className="grok-build-card" onClick={()=>setScreen('build')}><div className="build-card-icon"><Code2 size={21}/></div><div><b>Build Mode</b><span>Crie e continue sites, apps, sistemas e dashboards sem sair do shell.</span></div><strong>Experimentar</strong></button>
        <div className="grok-home-foot"><span className="private-dot"/> TwinCore X10 · memória local · projeto persistente</div>
      </section>:
      <section className="grok-conversation-wrap">
        <div className="grok-conversation">{active.messages.map(m=><article className={'grok-message '+m.role} key={m.id}><div className="grok-avatar">{m.role==='assistant'?<Sparkles size={14}/>:<span>EU</span>}</div><div className="grok-message-body"><div className="grok-message-meta"><b>{m.role==='assistant'?'PredictLM':'Você'}</b>{m.engine&&<span>{m.engine}</span>}</div><div className="grok-message-text">{renderText(m.content)}</div>{m.media?.length?<div className="grok-media-results">{m.media.map((media,i)=>media.kind==='image'?<a href={media.url} target="_blank" rel="noreferrer" key={i}><img src={media.url} alt={media.label||'Imagem gerada'}/></a>:media.kind==='video'?<video key={i} src={media.url} controls loop playsInline/>:<a className="grok-file-result" href={media.url} download={media.downloadName||media.label||'arquivo'} key={i}><b>{media.label||'Arquivo gerado'}</b><span>{media.mime||'arquivo'} · baixar</span></a>)}</div>:null}{m.actions?.length?<details className={'grok-actions '+(m.status||'done')}><summary>{m.status==='error'?'Execução interrompida':m.status==='partial'?'Execução parcial':'O que foi feito'}</summary>{m.actions.map((x,i)=><div key={i}><span>{i+1}</span>{x}</div>)}</details>:null}{m.sources?.length?<details className="grok-sources"><summary>{m.sources.length} fontes/contextos</summary>{m.sources.map((src,i)=><div key={i}><b>{src.title}</b><span>{src.source}</span></div>)}</details>:null}{m.role==='assistant'?<div className="grok-feedback"><button onClick={()=>sendFeedback('positive',m.content)} title="Resposta útil"><ThumbsUp size={11}/></button><button onClick={()=>sendFeedback('negative',m.content)} title="Resposta incompleta ou errada"><ThumbsDown size={11}/></button></div>:null}</div></article>)}{busy&&<article className="grok-message assistant"><div className="grok-avatar"><Sparkles size={14}/></div><div className="grok-message-body"><div className="grok-message-meta"><b>PredictLM</b><span>working</span></div><div className="grok-thinking"><i/><i/><i/> executando ferramentas</div>{activity.length>0&&<div className="grok-activity">{activity.map((x,i)=><div key={x}><span>{i===activity.length-1?'…':'→'}</span>{x}</div>)}</div>}</div></article>}<div ref={bottom}/></div>
        <div className="grok-bottom-composer"><Composer compact value={input} setValue={setInput} send={send} busy={busy} modeLabel={modeLabel} web={s.webEnabled} setWeb={s.setWebEnabled} deep={s.deepThink} setDeep={s.setDeepThink} plusOpen={plusOpen} setPlusOpen={setPlusOpen} modelMenu={modelMenu} setModelMenu={setModelMenu} enableAutoLocal={enableAutoLocal} enableNeural={enableNeural} caps={caps} neural={neural} memoryStats={memoryStats} learningStats={learningStats} webllm={webllm} enableWebLLM={enableWebLLM} configureFreeLLMAPI={configureFreeLLMAPI} cloud={s.cloudEnabled} setCloud={s.setCloudEnabled} localRuntime={s.localRuntimeEnabled} toggleLocalRuntime={toggleLocalRuntime} localRuntimeLabel={localRuntimeLabel} unloadNeural={unloadNeural} onOpenBuild={()=>setScreen('build')} onOpenResearch={()=>setScreen('research')} onOpenMedia={()=>setScreen('imagine')} onOpenLegal={onOpenLegal}/></div>
      </section>}

      {loadState&&<div className="grok-model-load"><div><b>Carregando {loadState.tier}</b><span>{loadState.status}</span></div><strong>{loadState.progress!=null?Math.round(loadState.progress)+'%':'…'}</strong></div>}
      {modelError&&<div className="grok-model-error">{modelError}<button onClick={()=>setModelError('')}><X size={12}/></button></div>}
    </main>
  </div>
}

function Composer(props:any){
  const {value,setValue,send,busy,modeLabel,web,setWeb,deep,setDeep,plusOpen,setPlusOpen,modelMenu,setModelMenu,enableAutoLocal,unloadNeural,neural,webllm,memoryStats,learningStats,onOpenBuild,onOpenResearch,onOpenMedia,onOpenLegal,compact}=props;
  const localReady=!!(neural?.loaded||webllm?.loaded);
  return <div className={'grok-composer-shell '+(compact?'compact':'')}>
    <textarea value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Pergunte qualquer coisa — o Predict Auto escolhe o melhor motor disponível"/>
    <div className="grok-composer-actions">
      <div className="grok-plus-wrap"><button className="grok-plus" onClick={()=>setPlusOpen((v:boolean)=>!v)}><Plus size={18}/></button>{plusOpen&&<div className="grok-plus-menu"><button onClick={onOpenBuild}><Code2 size={14}/><span><b>Build Mode</b><small>Continuar ou criar aplicativo</small></span></button><button onClick={onOpenLegal}><Scale size={14}/><span><b>Processos</b><small>DataJud + DJEN + dossiê</small></span></button><button onClick={onOpenResearch}><Globe2 size={14}/><span><b>Research</b><small>Pesquisar fontes atuais</small></span></button><button onClick={onOpenMedia}><ImageIcon size={14}/><span><b>Imagine</b><small>Abrir Media Studio</small></span></button></div>}</div>
      <div className="grok-composer-right">
        <button className={web?'active':''} onClick={()=>setWeb(!web)}><Globe2 size={13}/>Web</button>
        <button className={deep?'active':''} onClick={()=>setDeep(!deep)}><Brain size={13}/>{deep?'Deep':'Fast'}</button>
        <div className="grok-model-wrap">
          <button className="predict-auto-trigger" onClick={()=>setModelMenu((v:boolean)=>!v)}><Zap size={13}/>{modeLabel}</button>
          {modelMenu&&<div className="grok-model-menu grok-auto-menu">
            <div className="grok-auto-head"><span className="grok-auto-orb"><Sparkles size={15}/></span><div><b>Predict Auto</b><span>Um único motor lógico. O roteador escolhe servidor, pesquisa, memória e runtime local sem expor modelos.</span></div></div>
            <div className="grok-auto-status">
              <span><i className="online"/> Provider Mesh automático</span>
              <span><i className={localReady?'online':''}/> {localReady?'Modo offline pronto':'Local sob demanda'}</span>
              <small>{learningStats?.sources?.total||0} fontes · Skill Forge {learningStats?.githubKnowledge?.chunks||0} chunks · memória {memoryStats?.trusted||0}/{memoryStats?.count||0}</small>
            </div>
            {!localReady&&<button onClick={enableAutoLocal}><b>Ativar modo offline</b><span>Baixa apenas o motor local econômico quando você pedir. Nada é carregado automaticamente.</span></button>}
            {localReady&&<button onClick={unloadNeural}><b>Liberar memória local</b><span>Descarrega GPU/CPU local; o Predict Auto continua pelo servidor e pesquisa.</span></button>}
          </div>}
        </div>
        <button className="grok-send" onClick={send} disabled={!value.trim()||busy}><Send size={17}/></button>
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
