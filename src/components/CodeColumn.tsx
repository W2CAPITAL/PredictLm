'use client';

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';
import { useAppStore } from '@/lib/store';
import { FileCode, FileText, FolderOpen, Save } from 'lucide-react';

export function CodeColumn({ className }: { className?: string }) {
  const { files = {}, activeFile, setActiveFile, updateFile } = useAppStore();
  const currentFile = activeFile && files ? files[activeFile] : null;
  const filePaths = files ? Object.keys(files) : [];

  return (
    <div className={`flex flex-col bg-[#09090b] h-full ${className}`}>
      <div className="h-12 border-b border-[#27272a] flex items-center px-4 gap-4 bg-[#09090b]">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-purple-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Editor</span>
        </div>
        
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[60%]">
          {filePaths.map((path) => (
            <button
              key={path}
              onClick={() => setActiveFile(path)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-[11px] font-medium transition-all whitespace-nowrap border-b-2 ${
                activeFile === path 
                  ? 'bg-zinc-900 text-purple-400 border-purple-500' 
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}
            >
              <span className="truncate">{path}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 bg-zinc-800/30 px-2 py-0.5 rounded border border-zinc-700/30">
            <Save size={10} />
            SYNCED
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-52 border-r border-[#27272a] bg-[#09090b] flex flex-col shrink-0">
          <div className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <FolderOpen size={10} />
            Arquivos
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 forge-scroll">
            {filePaths.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center">
                <FileCode size={24} className="mb-2" />
                <span className="text-[10px]">Vazio</span>
              </div>
            ) : (
              filePaths.map((path) => (
                <button
                  key={path}
                  onClick={() => setActiveFile(path)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] transition-all group ${
                    activeFile === path 
                      ? 'bg-purple-600/10 text-purple-400' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                  }`}
                >
                  {path.endsWith('.css') ? <FileText size={12} /> : <FileCode size={12} />}
                  <span className="truncate">{path}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#09090b] overflow-hidden">
          {currentFile ? (
            <div className="flex-1 overflow-hidden relative">
              <CodeMirror
                value={currentFile.content || ''}
                theme={oneDark}
                height="100%"
                extensions={[
                  activeFile?.endsWith('.css') ? css() : javascript({ jsx: true, typescript: true })
                ]}
                onChange={(val) => updateFile(activeFile!, val)}
                basicSetup={{ 
                  lineNumbers: true, 
                  foldGutter: true, 
                  highlightActiveLine: true,
                  tabSize: 2,
                  indentOnInput: true,
                  syntaxHighlighting: true
                }}
                className="h-full text-[13px] manual-editor"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-zinc-500">
              <FileCode size={40} className="mb-4" />
              <p className="text-sm font-medium">Selecione um arquivo para editar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}