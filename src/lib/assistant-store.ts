'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hasInternalReasoningLeak, sanitizePublicAnswer } from './public-answer-gate';
import { looksLikeOperationalMonologue } from './human-presence';

export interface AssistantMessage {
  id:string;
  role:'user'|'assistant';
  content:string;
  createdAt:number;
  engine?:string;
  sources?:{title:string;source:string}[];
  actions?:string[];
  reasoningSummary?:string;
  status?:'done'|'partial'|'error';
  media?:{kind:'image'|'video'|'file';url:string;label?:string;temporary?:boolean;downloadName?:string;mime?:string}[];
}
export interface ChatSession {
  id:string;
  title:string;
  messages:AssistantMessage[];
  createdAt:number;
  updatedAt:number;
}

interface AssistantState {
  sessions:ChatSession[];
  activeId:string;
  webEnabled:boolean;
  deepThink:boolean;
  cloudEnabled:boolean;
  localRuntimeEnabled:boolean;
  createChat():void;
  setActive(id:string):void;
  addMessage(message:Omit<AssistantMessage,'id'|'createdAt'>):void;
  updateLastAssistant(content:string,status?:AssistantMessage['status']):void;
  clearActive():void;
  deleteSession(id:string):void;
  setWebEnabled(v:boolean):void;
  setDeepThink(v:boolean):void;
  setCloudEnabled(v:boolean):void;
  setLocalRuntimeEnabled(v:boolean):void;
}

const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const empty=():ChatSession=>({id:id(),title:'Nova conversa',messages:[],createdAt:Date.now(),updatedAt:Date.now()});
const initial=empty();

export const useAssistantStore=create<AssistantState>()(persist((set)=>({
  sessions:[initial],
  activeId:initial.id,
  webEnabled:false,
  deepThink:false,
  cloudEnabled:false,
  localRuntimeEnabled:false,
  createChat:()=>set(s=>{const chat=empty();return {sessions:[chat,...s.sessions],activeId:chat.id}}),
  setActive:(activeId)=>set({activeId}),
  addMessage:(message)=>set(s=>{
    let safeMessage=message;
    if(message.role==='assistant'){
      const sanitized=sanitizePublicAnswer(message.content);
      if(sanitized&&!looksLikeOperationalMonologue(sanitized))safeMessage={...message,content:sanitized};
      else if(hasInternalReasoningLeak(message.content)||looksLikeOperationalMonologue(message.content)){
        safeMessage={...message,content:'A geração anterior trouxe análise interna ou um relatório operacional em vez da resposta final. Gere novamente para receber uma resposta limpa.'};
      }
    }
    const next={...safeMessage,id:id(),createdAt:Date.now()} as AssistantMessage;
    return {sessions:s.sessions.map(chat=>{
      if(chat.id!==s.activeId)return chat;
      const messages=[...chat.messages,next];
      const first=messages.find(m=>m.role==='user')?.content||'Nova conversa';
      return {...chat,title:first.slice(0,42),messages,updatedAt:Date.now()};
    })};
  }),
  updateLastAssistant:(content,status='partial')=>set(s=>({
    sessions:s.sessions.map(chat=>{
      if(chat.id!==s.activeId)return chat;
      const messages=[...chat.messages];
      let index=-1;
      for(let i=messages.length-1;i>=0;i--){
        if(messages[i].role==='assistant'){index=i;break}
      }
      if(index<0)return chat;
      let nextContent=content;
      if(status==='done'){
        const sanitized=sanitizePublicAnswer(content);
        if(sanitized&&!looksLikeOperationalMonologue(sanitized))nextContent=sanitized;
        else if(hasInternalReasoningLeak(content)||looksLikeOperationalMonologue(content)){
          nextContent='A resposta gerada continha conteúdo interno em vez da resposta final. Tente novamente.';
        }
      }
      messages[index]={...messages[index],content:nextContent,status};
      return {...chat,messages,updatedAt:Date.now()};
    })
  })),
  clearActive:()=>set(s=>({sessions:s.sessions.map(chat=>chat.id===s.activeId?{...chat,messages:[],title:'Nova conversa',updatedAt:Date.now()}:chat)})),
  deleteSession:(sessionId)=>set(s=>{
    const rest=s.sessions.filter(x=>x.id!==sessionId);
    if(rest.length)return {sessions:rest,activeId:s.activeId===sessionId?rest[0].id:s.activeId};
    const chat=empty();return {sessions:[chat],activeId:chat.id};
  }),
  setWebEnabled:(webEnabled)=>set({webEnabled}),
  setDeepThink:(deepThink)=>set({deepThink}),
  setCloudEnabled:(cloudEnabled)=>set({cloudEnabled}),
  setLocalRuntimeEnabled:(localRuntimeEnabled)=>set({localRuntimeEnabled})
}),{
  name:'predictlm-assistant-v1',
  version:2,
  migrate:(persisted:any,version)=>{
    const state=persisted||{};
    if(version<2)return {...state,deepThink:false};
    return state;
  }
}));
