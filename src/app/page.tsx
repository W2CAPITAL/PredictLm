'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { useAppStore } from '@/lib/store';
import { buildPreviewHtml } from '@/lib/fileUtils';
import { Settings, X, Cpu, Palette, Zap } from 'lucide-react';

// Carregamento dinâmico para evitar erros de SSR com bibliotecas client-side
const ChatColumn = dynamic(() => import('@/components/ChatColumn').then(mod => mod.ChatColumn), { ssr: false });
const CodeColumn = dynamic(() => import('@/components/CodeColumn').then(mod => mod.CodeColumn), { ssr: false });
const PreviewColumn = dynamic(() => import('@/components/PreviewColumn').then(mod => mod.PreviewColumn), { ssr: false });
const ActivityBar = dynamic(() => import('@/components/ActivityBar').then(mod => mod.ActivityBar), { ssr: false });

export default function AppForge() {
  const store = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [projectTitle, setProjectTitle] = useState('Novo Projeto AppForge');

  useEffect(() => {
    setMounted(true);
    // Hidrata o store manualmente após montar para evitar erros de SSR
    useAppStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mounted && store.messages && (store.messages || []).length > 0) {
      const firstUserMsg = (store.messages || []).find(m => m.role === 'user');
      if (firstUserMsg && projectTitle === 'Novo Projeto AppForge') {
        const title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
        setProjectTitle(title);
      }
    }
  }, [store.messages, projectTitle, mounted]);

  useEffect(() => {
    if (mounted && store.files) {
      const fileList = Object.values(store.files || {});
      if (fileList.length > 0) {
        setPreviewHtml(buildPreviewHtml(fileList));
      }
    }
  }, [store.files, mounted]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Iniciando Forja...</span>
        </div>
      </div>
    );
  }

  const status = store.isGenerating 
    ? 'generating' 
    : (store.messages && (store.messages || []).length > 0) 
      ? 'done' 
      : 'idle';

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#e4e4e7] overflow-hidden">
      <Header 
        title={projectTitle} 
        status={status} 
        files={Object.values(store.files || {})} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />

        <main className="flex-1 flex bg-[#1a1a1f] gap-[1px] overflow-hidden">
          {store.showChat && (
            <div className="w-[28%] min-w-[320px] bg-[#09090b] flex flex-col shadow-xl z-10">
              <ChatColumn className="flex-1 rounded-none border-0" />
            </div>
          )}
          
          {store.showCode && (
            <div className="flex-1 min-w-[400px] bg-[#09090b] flex flex-col relative">
              <CodeColumn className="flex-1 rounded-none border-0" />
            </div>
          )}
          
          {store.showPreview && (
            <div className={`bg-[#09090b] ${store.showCode ? 'w-[38%]' : 'flex-1'} min-w-[350px] flex flex-col`}>
              <PreviewColumn 
                html={previewHtml} 
                className="flex-1 rounded-none border-0" 
              />
            </div>
          )}
        </main>
      </div>

      {store.activePanel === 'settings' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-[#111113] border border-[#27272a] rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-6 border-b border-[#27272a] bg-[#1a1a1f]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-xl">
                  <Settings size={20} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-100">Configurações</h2>
                </div>
              </div>
              <button onClick={() => store.setActivePanel('chat')} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto forge-scroll">
              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Palette size={14} className="text-zinc-500" />
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Projeto</h3>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block mb-2 px-1">Nome da Aplicação</label>
                  <input 
                    type="text" 
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu size={14} className="text-zinc-500" />
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Motor de IA</h3>
                </div>
                <div className="p-4 rounded-2xl bg-purple-600/5 border border-purple-600/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-purple-400" />
                    <div>
                      <p className="text-xs font-bold text-zinc-200">Grok Build 0.1 (via Puter)</p>
                      <p className="text-[10px] text-zinc-500">Otimizado para código de alta fidelidade</p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
              </section>
            </div>

            <div className="p-6 bg-[#09090b] border-t border-[#27272a] flex justify-end gap-3">
              <button 
                onClick={() => store.setActivePanel('chat')}
                className="px-8 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-xl transition-all shadow-lg active:scale-95"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
