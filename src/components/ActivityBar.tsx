'use client';

import React from 'react';
import { MessageSquare, Code2, Eye, Settings, Github, Boxes, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function ActivityBar() {
  const { showChat, showCode, showPreview, togglePanel, activePanel, setActivePanel } = useAppStore();

  const navItems = [
    { id: 'chat', icon: MessageSquare, active: showChat, label: 'Conversa' },
    { id: 'code', icon: Code2, active: showCode, label: 'Editor de Código' },
    { id: 'preview', icon: Eye, active: showPreview, label: 'Live Preview' },
  ];

  return (
    <div className="w-14 bg-[#09090b] border-r border-[#27272a] flex flex-col items-center py-6 gap-6 shrink-0 z-[60]">
      {/* Logo */}
      <div className="group relative">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 cursor-pointer transition-transform hover:scale-110 active:scale-95">
          <Boxes size={22} className="text-white" />
        </div>
        <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          AppForge Home
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => togglePanel(item.id as any)}
            className={`group relative p-3 rounded-xl transition-all flex items-center justify-center border ${
              item.active 
                ? 'bg-purple-600/10 text-purple-400 border-purple-500/30' 
                : 'text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-800/50'
            }`}
            title={item.label}
          >
            <item.icon size={20} />
            {item.active && <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-purple-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
            
            {/* Tooltip */}
            <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {item.label}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3 w-full px-2 pt-6 border-t border-[#27272a]">
        <button 
          onClick={() => setActivePanel('settings')}
          className={`group relative p-3 rounded-xl transition-all flex items-center justify-center border ${
            activePanel === 'settings' 
              ? 'bg-zinc-800 text-white border-zinc-700' 
              : 'text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-800/50'
          }`}
        >
          <Settings size={20} />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Configurações
          </div>
        </button>
        
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group relative p-3 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all flex items-center justify-center border border-transparent"
        >
          <Github size={20} />
          <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Repositório
          </div>
        </a>
      </div>
    </div>
  );
}
