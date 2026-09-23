import { composeProjectContext } from '@/lib/agent-runtime/project-context';
import { classifyPromptIntent } from './intent';
import { atomsFor } from './prompt-bank';
import { responseContract } from './response-contract';
import { retrievePromptPatterns } from './retriever';

export function compileSystemPrompt(opts:{userText:string;hasAttachment?:boolean;extra?:string[]}){
  const intent=classifyPromptIntent(opts.userText,!!opts.hasAttachment);
  const retrieved=retrievePromptPatterns(opts.userText,3);
  return {
    intent,
    system:[
      'Você é PredictLM, um assistente geral, técnico, jurídico e de criação.',
      composeProjectContext(),
      'CONTRATO DE RESPOSTA',
      responseContract(intent),
      ...atomsFor(intent).map(x=>'- '+x),
      ...retrieved.map(x=>'- Padrão recuperado ('+x.id+'): '+x.text),
      ...(opts.extra||[]).filter(Boolean)
    ].join('\n\n')
  };
}
