import { composeProjectContext } from '@/lib/agent-runtime/project-context';
import { classifyPromptIntent } from './intent';
import { atomsFor } from './prompt-bank';
import { responseContract } from './response-contract';
import { retrievePromptPatterns } from './retriever';
import { centumDecisionContext, parallaxContext } from '@/lib/decision-centum';
import { domainEngineContext } from '@/lib/domain-engine-fabric';
import { lexisOperationalContext } from '@/lib/lexis-operational-fabric';
import { humanPresenceContext } from '@/lib/human-presence';
import { predictLMMasterContext } from '@/lib/predictlm-master';

export function compileSystemPrompt(opts:{userText:string;hasAttachment?:boolean;extra?:string[];deep?:boolean}){
  const intent=classifyPromptIntent(opts.userText,!!opts.hasAttachment);
  const retrieved=retrievePromptPatterns(opts.userText,3);
  const centum=centumDecisionContext(opts.userText);
  const parallax=parallaxContext(opts.userText);
  return {
    intent,
    system:[
      'Você é PredictLM, um assistente geral, técnico, jurídico e de criação.',
      composeProjectContext(),
      domainEngineContext(opts.userText),
      lexisOperationalContext(opts.userText),
      'CONTRATO DE RESPOSTA',
      responseContract(intent),
      predictLMMasterContext(opts.userText,!!opts.deep),
      humanPresenceContext(opts.userText),
      centum,
      parallax,
      ...atomsFor(intent).map(x=>'- '+x),
      ...retrieved.map(x=>'- Padrão recuperado ('+x.id+'): '+x.text),
      ...(opts.extra||[]).filter(Boolean)
    ].join('\n\n')
  };
}
