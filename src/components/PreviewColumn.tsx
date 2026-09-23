'use client';

import React, { useState } from 'react';
import { Eye, RotateCw, Globe, Smartphone, Tablet, Monitor, ExternalLink, Maximize2 } from 'lucide-react';

export function PreviewColumn({ html, className }: { html: string; className?: string }) {
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [key, setKey] = useState(0);

  const viewportSizes = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-full',
  };

  const handleOpenExternal = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className={`flex flex-col bg-[#111113] shadow-2xl ${className}`}>
      <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-4 bg-[#1a1a1f]/40">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Live Preview</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50">
            <button 
              onClick={() => setViewport('mobile')} 
              className={`p-1 rounded-md transition-colors ${viewport === 'mobile' ? 'text-purple-400 bg-purple-400/10' : 'text-zinc-600 hover:text-zinc-300'}`}
              title="Mobile"
            >
              <Smartphone size={13} />
            </button>
            <button 
              onClick={() => setViewport('tablet')} 
              className={`p-1 rounded-md transition-colors ${viewport === 'tablet' ? 'text-purple-400 bg-purple-400/10' : 'text-zinc-600 hover:text-zinc-300'}`}
              title="Tablet"
            >
              <Tablet size={13} />
            </button>
            <button 
              onClick={() => setViewport('desktop')} 
              className={`p-1 rounded-md transition-colors ${viewport === 'desktop' ? 'text-purple-400 bg-purple-400/10' : 'text-zinc-600 hover:text-zinc-300'}`}
              title="Desktop"
            >
              <Monitor size={13} />
            </button>
          </div>
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <button 
            onClick={() => setKey(k => k + 1)} 
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Recarregar"
          >
            <RotateCw size={13} />
          </button>
          <button 
            onClick={handleOpenExternal} 
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Abrir em Nova Aba"
          >
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#09090b] flex flex-col items-center p-4 overflow-hidden">
        {!html ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
            <Globe size={40} className="mb-4 text-zinc-600" />
            <p className="text-sm">Aguardando artefatos forjados...</p>
          </div>
        ) : (
          <div className={`w-full h-full ${viewportSizes[viewport]} bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 border border-zinc-200/50 relative group`}>
            <iframe
              key={key}
              srcDoc={html}
              title="Preview"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-modals allow-popups allow-forms"
            />
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] text-white flex items-center gap-1 pointer-events-none">
                  <Maximize2 size={10} /> Active View
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
