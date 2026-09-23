export type ProviderId = 'predict-core' | 'puter' | 'local' | 'server';
export type StudioMode = 'build' | 'plan' | 'review' | 'research' | 'media';
export type PanelId = 'agent' | 'explorer' | 'browser' | 'skills' | 'memory' | 'media' | 'connectors' | 'settings';

export interface WorkspaceFile { path: string; content: string; language: string; }
export interface ChatMessage { id: string; role: 'user' | 'assistant' | 'system'; content: string; createdAt: number; }
export interface MemoryNote { id: string; title: string; body: string; tags: string[]; kind: 'note' | 'decision' | 'run'; createdAt: number; }
export interface AgentRun { id: string; title: string; status: 'running' | 'done' | 'error'; steps: string[]; createdAt: number; }
export interface SkillSpec { id: string; name: string; category: string; description: string; source: string; runtime: 'built-in' | 'bridge' | 'external'; }
