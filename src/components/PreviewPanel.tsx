
'use client';

import React, { useState } from 'react';
import { RotateCw, ExternalLink, Globe, Smartphone, Tablet, Monitor } from 'lucide-react';

interface PreviewPanelProps {
  html: string;
}

export function PreviewPanel({ html }: PreviewPanelProps) {
  const [key, setKey] = useState(0);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  const viewportStyles = {
    mobile: 'w-[375px]',
    tablet: 'w-[768px]',
    desktop: 'w-full',
  };

  const handleOpenExternal = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Browser-like Toolbar */}
      <div className="h-12 border-b border-forge-border flex items-center justify-between px-4 bg-forge-surface">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
             <Globe size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest">Web Preview</span>
          </div>
          <div className="h-4 w-px bg-forge-border mx-1" />
          <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5">
            <button 
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded transition-colors ${viewport === 'mobile' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Smartphone size={12} />
            </button>
            <button 
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded transition-colors ${viewport === 'tablet' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Tablet size={12} />
            </button>
            <button 
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded transition-colors ${viewport === 'desktop' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Monitor size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setKey(k => k + 1)} 
            className="p-1.5 hover:bg-white/5 rounded-md text-zinc-500 transition-colors"
            title="Refresh Preview"
          >
            <RotateCw size={14} />
          </button>
          <button 
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-white/5 rounded-md text-zinc-500 transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 bg-forge-surface/50 p-4 flex flex-col items-center overflow-auto">
        {!html ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center mb-4">
              <Globe size={32} />
            </div>
            <p className="text-sm font-medium">Ready to Preview</p>
            <p className="text-xs">Your app will appear here once forged.</p>
          </div>
        ) : (
          <div className={`${viewportStyles[viewport]} h-full bg-white rounded-xl shadow-2xl overflow-hidden border border-forge-border transition-all duration-300 origin-top`}>
            <iframe
              key={key}
              srcDoc={html}
              title="Preview"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-modals allow-popups allow-forms"
            />
          </div>
        )}
      </div>
    </div>
  );
}
