'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AssistantMessage {
  id:string;
  role:'user'|'assistant';
  content:string;
  createdAt:number;
  engine?:string;
  sources?:{title:string;source:string}[];
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
  createChat():void;
  setActive(id:string):void;
  addMessage(message:Omit<AssistantMessage,'id'|'createdAt'>):void;
  clearActive():void;
  deleteSession(id:string):void;
  setWebEnabled(v:boolean):void;
  setDeepThink(v:boolean):void;
}

const id=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const empty=():ChatSession=>({id:id(),title:'Nova conversa',messages:[],createdAt:Date.now(),updatedAt:Date.now()});
const initial=empty();

export const useAssistantStore=create<AssistantState>()(persist((set)=>({
  sessions:[initial],
  activeId:initial.id,
  webEnabled:false,
  deepThink:true,
  createChat:()=>set(s=>{const chat=empty();return {sessions:[chat,...s.sessions],activeId:chat.id}}),
  setActive:(activeId)=>set({activeId}),
  addMessage:(message)=>set(s=>{
    const next={...message,id:id(),createdAt:Date.now()} as AssistantMessage;
    return {sessions:s.sessions.map(chat=>{
      if(chat.id!==s.activeId)return chat;
      const messages=[...chat.messages,next];
      const first=messages.find(m=>m.role==='user')?.content||'Nova conversa';
      return {...chat,title:first.slice(0,42),messages,updatedAt:Date.now()};
    })};
  }),
  clearActive:()=>set(s=>({sessions:s.sessions.map(chat=>chat.id===s.activeId?{...chat,messages:[],title:'Nova conversa',updatedAt:Date.now()}:chat)})),
  deleteSession:(sessionId)=>set(s=>{
    const rest=s.sessions.filter(x=>x.id!==sessionId);
    if(rest.length)return {sessions:rest,activeId:s.activeId===sessionId?rest[0].id:s.activeId};
    const chat=empty();return {sessions:[chat],activeId:chat.id};
  }),
  setWebEnabled:(webEnabled)=>set({webEnabled}),
  setDeepThink:(deepThink)=>set({deepThink})
}),{name:'predictlm-assistant-v1'}));
