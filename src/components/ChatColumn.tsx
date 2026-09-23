'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { puter } from '@heyputer/puter.js';

export function ChatColumn({ className }: { className?: string }) {
  const { 
    messages = [], 
    addMessage, 
    updateLastMessage, 
    isGenerating, 
    setIsGenerating, 
    setFiles, 
    files = {}, 
    setActiveFile 
  } = useAppStore();
  
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userPrompt = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userPrompt, images: [] });
    setIsGenerating(true);

    addMessage({ role: 'assistant', content: '', images: [] });

    try {
      const systemPrompt = `Você é um expert em criar interfaces React + Tailwind de alta qualidade através do AppForge.
Sempre gere código completo, moderno e visualmente polido. Nunca entregue interfaces pobres ou básicas.
Use espaçamentos bons, cores elegantes, bordas arredondadas e hierarquia visual clara.
Gere APENAS JavaScript + JSX (sem TypeScript).

IMPORTANTE: Toda a sua resposta deve ser um objeto JSON puro no seguinte formato, sem textos explicativos fora do JSON:
{
  "explanation": "Breve descrição das melhorias",
  "files": [
    { "path": "App.tsx", "content": "Código JSX completo aqui" }
  ]
}`;

      const currentFiles = files || {};
      const currentFilesContext = Object.keys(currentFiles).length > 0 
        ? `\nCÓDIGO ATUAL:\n${JSON.stringify(Object.entries(currentFiles).map(([p, f]) => ({ path: p, content: f.content })))}`
        : "";

      const historyContext = (messages || []).slice(-4).map(m => ({ 
        role: m.role as "user" | "assistant" | "system", 
        content: m.content,
        images: m.images || []
      }));

      const messagesForPuter = [
        { role: "system" as const, content: systemPrompt, images: [] },
        ...historyContext,
        { role: "user" as const, content: `Ação: ${userPrompt}${currentFilesContext}`, images: [] }
      ];

      const response = await puter.ai.chat(messagesForPuter, {
        model: 'x-ai/grok-build-0.1',
        stream: true,
        temperature: 0.3
      });

      let fullContent = '';
      for await (const part of response) {
        if (part.text) {
          fullContent += part.text;
          updateLastMessage(fullContent);
        }
      }

      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          const artifacts: Record<string, any> = {};
          
          if (result.files && Array.isArray(result.files)) {
            result.files.forEach((file: any) => {
              const path = file.path.replace(/^src\//, '').replace(/^\//, '');
              artifacts[path] = {
                name: path,
                content: file.content,
                language: path.endsWith('.css') ? 'css' : 'javascript'
              };
            });

            if (Object.keys(artifacts).length > 0) {
              setFiles(artifacts);
              const firstFile = Object.keys(artifacts)[0];
              if (firstFile) setActiveFile(firstFile);
            }
          }
          
          if (result.explanation) {
             updateLastMessage(result.explanation);
          }
        }
      } catch (parseErr) {
        console.warn("Falha ao parsear artefatos", parseErr);
      }

    } catch (err: any) {
      console.error(err);
      updateLastMessage(`Erro: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`flex flex-col bg-[#111113] rounded-xl border border-[#27272a] overflow-hidden shadow-2xl ${className}`}>
      <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-4 bg-[#1a1a1f]/40">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-bold uppercase tracking-widest text-[10px]">Grok Build 0.1</span>
        </div>
        {isGenerating && (
          <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold uppercase animate-pulse">
            <RefreshCw size={10} className="animate-spin" />
            Forging
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 forge-scroll">
        {((messages || []).length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 space-y-4">
            <Bot size={32} className="text-zinc-600" />
            <p className="text-sm font-bold text-zinc-200">Pronto para Forjar</p>
          </div>
        )}
        {(messages || []).map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              m.role === 'assistant' ? 'bg-[#1a1a1f] border-[#27272a]' : 'bg-purple-600 border-purple-500'
            }`}>
              {m.role === 'assistant' ? <Bot size={14} className="text-purple-400" /> : <User size={14} className="text-white" />}
            </div>
            <div className={`p-3 rounded-2xl text-[13px] max-w-[85%] leading-relaxed ${
              m.role === 'assistant' ? 'bg-[#1a1a1f] text-zinc-300' : 'bg-purple-600 text-white'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#09090b]">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSubmit(e as any); 
              } 
            }}
            placeholder="Descreva seu app..."
            className="w-full bg-[#111113] border border-[#27272a] rounded-xl px-4 py-3 pr-10 text-[13px] text-zinc-200 focus:outline-none focus:border-purple-600/50 transition-all resize-none min-h-[80px]"
          />
          <button type="submit" disabled={isGenerating || !input.trim()} className="absolute bottom-3 right-3 p-1.5 bg-purple-600 text-white rounded-lg">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
