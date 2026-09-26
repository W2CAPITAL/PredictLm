'use client';

import {useEffect} from 'react';
import {emitAppLearningEvent,recordAppLearningEvent} from '@/lib/app-learning';

function pathOnly(input:string){
  try{
    const url=new URL(input,window.location.origin);
    return url.origin===window.location.origin?url.pathname:url.origin+url.pathname;
  }catch{return String(input||'').split('?')[0].slice(0,160)}
}

function labelFor(target:EventTarget|null){
  const el=target instanceof Element?target:null;
  if(!el)return 'unknown';
  const direct=
    el.getAttribute('data-learning-id')||
    el.getAttribute('aria-label')||
    el.getAttribute('title')||
    el.getAttribute('name')||
    el.getAttribute('role')||
    el.tagName.toLowerCase();
  const text=(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,72);
  return (direct+(text&&text.toLowerCase()!==direct.toLowerCase()?' · '+text:'')).slice(0,120);
}

function surface(){
  return typeof window==='undefined'?'server':window.location.pathname||'/';
}

export function AppLearningObserver(){
  useEffect(()=>{
    recordAppLearningEvent({
      surface:surface(),
      action:'surface-mounted',
      kind:'navigation',
      success:true,
      salience:.35
    });

    const onClick=(event:MouseEvent)=>{
      const el=event.target instanceof Element?event.target.closest('button,a,[role="button"],input,select,textarea,[data-learning-id]'):null;
      if(!el)return;
      const tag=el.tagName.toLowerCase();
      const type=(el instanceof HTMLInputElement?el.type:'').toLowerCase();
      if(type==='password'||type==='hidden')return;
      emitAppLearningEvent({
        surface:surface(),
        action:'click '+labelFor(el),
        kind:'interaction',
        salience:tag==='button'?.56:.42,
        metadata:{tag,type:type||undefined}
      });
    };

    const onSubmit=(event:SubmitEvent)=>{
      const form=event.target instanceof HTMLFormElement?event.target:null;
      emitAppLearningEvent({
        surface:surface(),
        action:'submit '+(form?.getAttribute('aria-label')||form?.getAttribute('name')||form?.id||'form'),
        kind:'interaction',
        salience:.68
      });
    };

    const onChange=(event:Event)=>{
      const el=event.target instanceof Element?event.target:null;
      if(!el)return;
      const type=el instanceof HTMLInputElement?el.type:'';
      if(type==='password'||type==='hidden'||type==='file')return;
      emitAppLearningEvent({
        surface:surface(),
        action:'change '+labelFor(el),
        kind:'interaction',
        salience:.28,
        metadata:{tag:el.tagName.toLowerCase(),type:type||undefined}
      });
    };

    const onError=(event:ErrorEvent)=>{
      emitAppLearningEvent({
        surface:surface(),
        action:'runtime-error '+String(event.message||'unknown error').slice(0,100),
        kind:'error',
        success:false,
        uncertainty:.9,
        salience:.96
      });
    };

    const onRejection=(event:PromiseRejectionEvent)=>{
      const reason=event.reason instanceof Error?event.reason.message:String(event.reason||'promise rejection');
      emitAppLearningEvent({
        surface:surface(),
        action:'unhandled-rejection '+reason.slice(0,100),
        kind:'error',
        success:false,
        uncertainty:.92,
        salience:.98
      });
    };

    document.addEventListener('click',onClick,true);
    document.addEventListener('submit',onSubmit,true);
    document.addEventListener('change',onChange,true);
    window.addEventListener('error',onError);
    window.addEventListener('unhandledrejection',onRejection);

    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
      const method=String(init?.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase();
      const url=pathOnly(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      const started=performance.now();
      try{
        const response=await nativeFetch(input,init);
        const durationMs=Math.round(performance.now()-started);
        emitAppLearningEvent({
          surface:surface(),
          action:method+' '+url,
          kind:url.includes('/api/research')?'research':
            url.includes('/api/media')?'media':
            url.includes('/api/legal')?'legal':
            url.includes('/api/agent')?'build':'api',
          success:response.ok,
          durationMs,
          uncertainty:response.ok?.24:.78,
          salience:response.ok?.45:.9,
          metadata:{status:response.status}
        });
        return response;
      }catch(error){
        emitAppLearningEvent({
          surface:surface(),
          action:method+' '+url,
          kind:'error',
          success:false,
          durationMs:Math.round(performance.now()-started),
          uncertainty:.94,
          salience:.98,
          metadata:{network:true}
        });
        throw error;
      }
    };

    const originalPush=history.pushState.bind(history);
    const originalReplace=history.replaceState.bind(history);
    const routeEvent=(action:string)=>{
      queueMicrotask(()=>emitAppLearningEvent({
        surface:surface(),
        action,
        kind:'navigation',
        success:true,
        salience:.34
      }));
    };
    history.pushState=((...args:Parameters<History['pushState']>)=>{
      const out=originalPush(...args);
      routeEvent('route-push '+surface());
      return out;
    }) as History['pushState'];
    history.replaceState=((...args:Parameters<History['replaceState']>)=>{
      const out=originalReplace(...args);
      routeEvent('route-replace '+surface());
      return out;
    }) as History['replaceState'];
    const onPop=()=>routeEvent('route-pop '+surface());
    window.addEventListener('popstate',onPop);

    const onSemantic=(event:Event)=>{
      const custom=event as CustomEvent;
      const detail=custom.detail||{};
      if(!detail||typeof detail!=='object')return;
      emitAppLearningEvent({
        surface:String(detail.surface||surface()),
        action:String(detail.action||'semantic-event'),
        kind:detail.kind||'interaction',
        success:typeof detail.success==='boolean'?detail.success:undefined,
        durationMs:Number(detail.durationMs||0)||undefined,
        novelty:Number(detail.novelty||0)||undefined,
        uncertainty:Number(detail.uncertainty||0)||undefined,
        salience:Number(detail.salience||0)||undefined,
        metadata:detail.metadata&&typeof detail.metadata==='object'?detail.metadata:undefined
      });
    };
    window.addEventListener('predictlm:learning-event',onSemantic as EventListener);

    return()=>{
      document.removeEventListener('click',onClick,true);
      document.removeEventListener('submit',onSubmit,true);
      document.removeEventListener('change',onChange,true);
      window.removeEventListener('error',onError);
      window.removeEventListener('unhandledrejection',onRejection);
      window.removeEventListener('popstate',onPop);
      window.removeEventListener('predictlm:learning-event',onSemantic as EventListener);
      window.fetch=nativeFetch;
      history.pushState=originalPush;
      history.replaceState=originalReplace;
    };
  },[]);

  return null;
}
