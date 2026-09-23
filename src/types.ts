
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: number;
  images?: any[]; 
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: 'tsx' | 'ts' | 'js' | 'jsx' | 'css' | 'html' | 'json' | 'md';
}

export interface Project {
  id: string;
  title: string;
  files: GeneratedFile[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type GenerationStatus = 'idle' | 'thinking' | 'generating' | 'done' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  error: string | null;
  rawResponse: string;
}
