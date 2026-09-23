'use client';

import React, { useState } from 'react';
import { Boxes, Download, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import JSZip from 'jszip';

interface HeaderProps {
  title: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  files: any[];
}

export function Header({ title, status, files = [] }: HeaderProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    const fileList = Array.isArray(files) ? files : [];
    if (fileList.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const srcFolder = zip.folder("src");
      
      fileList.forEach(file => {
        if (!file) return;
        const fileName = file.name || file.path || 'App.tsx';
        if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || fileName.endsWith('.js') || fileName.endsWith('.css')) {
          srcFolder?.file(fileName, file.content || '');
        } else {
          zip.file(fileName, file.content || '');
        }
      });

      const pkgJson = {
        "name": (title || 'appforge-project').toLowerCase().replace(/\s+/g, '-'),
        "version": "0.1.0",
        "private": true,
        "dependencies": {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "^0.441.0"
        },
        "scripts": {
          "dev": "next dev",
          "build": "next build",
          "start": "next start"
        }
      };

      zip.file("package.json", JSON.stringify(pkgJson, null, 2));

      const readme = `# ${title}\nEste projeto foi forjado pelo **AppForge**.\n\n## Como rodar localmente:\n1. Extraia o ZIP\n2. Execute \`npm install\`\n3. Execute \`npm run dev\`\n`;
      zip.file("README.md", readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (title || 'project').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      link.download = `${safeTitle}-clean.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const fileCount = Array.isArray(files) ? files.length : 0;

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-[#09090b] border-b border-[#27272a] shrink-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Boxes size={18} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">AppForge</span>
        </div>
        
        <div className="hidden md:flex items-center gap-2 text-zinc-500">
          <ChevronRight size={14} />
          <span className="text-sm text-zinc-300 font-medium truncate max-w-[300px]">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
          status === 'generating' 
            ? 'bg-purple-950/20 border-purple-800/30' 
            : 'bg-zinc-900/50 border-zinc-800'
        }`}>
          {status === 'generating' ? (
            <Loader2 size={12} className="animate-spin text-purple-400" />
          ) : (
            <CheckCircle2 size={12} className={`text-emerald-500 ${status === 'idle' ? 'opacity-20' : ''}`} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {status === 'generating' ? 'Forjando' : status === 'idle' ? 'Aguardando' : 'Pronto'}
          </span>
        </div>

        <div className="h-6 w-px bg-zinc-800 mx-2" />

        <button 
          onClick={handleDownload}
          disabled={fileCount === 0 || downloading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-bold shadow-lg"
        >
          {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Exportar Projeto Limpo
        </button>
      </div>
    </header>
  );
}
