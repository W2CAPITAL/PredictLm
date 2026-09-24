'use client';

import type { WorkspaceFile } from './types';
import { answerLocally, browserCapabilities, neuralStatus } from './browser-brain';
import { centumDecisionContext, parallaxContext } from './decision-centum';

export interface ExecutableCouncilLens{
  id:string;
  name:string;
  focus:string;
  answer:string;
}

export interface ExecutableCouncilResult{
  executed:boolean;
  lenses:ExecutableCouncilLens[];
  chair:string;
  parallax:string;
  markdown:string;
  reason?:string;
}

const LENSES=[
  ['product','Product / North Star','workflow completeness, user value, missing product behavior'],
  ['architecture','Architecture / Systems','boundaries, coupling, data flow, maintainability'],
  ['builder','Builder / Implementation','real code paths, inert controls, missing wiring'],
  ['ux','UX / Taste','navigation, hierarchy, responsive states, loading/error/empty flows'],
  ['domain','Research / Domain','domain rules, validation, realistic lifecycle and edge cases'],
  ['security','Security / Abuse','secrets, auth, injection, unsafe data access, destructive actions'],
  ['failure','Failure / QA','regressions, offline behavior, retries, tests and recovery'],
  ['legal','Legal / Privacy','privacy, retention, consent and risky automation boundaries'],
  ['operations','Operations / Cost','reliability, deployability, cost, observability and rollback'],
  ['counter','Devil\'s Advocate','strongest counter-case: why this build is not actually ready']
] as const;

function digest(files:WorkspaceFile[]){
  return files
    .filter(f=>/^(App\.tsx|styles\.css|predict\.spec\.json|ARCHITECTURE\.md|PRODUCTION_READINESS\.md|src\/|server\/)/.test(f.path))
    .slice(0,18)
    .map(f=>'FILE '+f.path+'\n'+f.content.slice(0,1800))
    .join('\n\n---\n\n')
    .slice(0,18000);
}

export async function runExecutableCouncilX10(task:string,files:WorkspaceFile[]):Promise<ExecutableCouncilResult>{
  const neural=neuralStatus();
  const caps=browserCapabilities();
  if(!neural.loaded&&!caps.native){
    return {executed:false,lenses:[],chair:'',parallax:'',markdown:'',reason:'Nenhum modelo local/browser carregado para Council executável.'};
  }

  const project=digest(files);
  const lenses:ExecutableCouncilLens[]=[];
  for(const [id,name,focus] of LENSES){
    const prompt=[
      'Act as one independent review lens. Do not imitate the other reviewers.',
      'FOCUS: '+focus+'.',
      'TASK: '+task,
      'Inspect the project evidence below.',
      'Return at most 140 words with: VERDICT pass|warn|fail, FACTS, RISKS, RECOMMENDATION, TEST.',
      'Do not claim code was executed unless the evidence says so.',
      project
    ].join('\n\n');
    const reply=await answerLocally(prompt,[],{preferNative:true,knowledge:false,decisionAudit:false});
    lenses.push({id,name,focus,answer:reply.content.trim()});
  }

  const anonymous=lenses.map((x,i)=>'ADVISOR '+String.fromCharCode(65+i)+':\n'+x.answer).join('\n\n');
  const chairPrompt=[
    'You are the Chair. Synthesize anonymous independent reviews of one software build.',
    'Do not invent unanimity. Identify disagreements.',
    'Return concise sections: DECISION, CONFIRMED FACTS, DISAGREEMENTS, TOP RISK, TOP OPPORTUNITY, DECISIVE TEST, ROLLBACK, NEXT PATCH.',
    'TASK: '+task,
    anonymous
  ].join('\n\n');
  const chairReply=await answerLocally(chairPrompt,[],{preferNative:true,knowledge:false,decisionAudit:false});
  const chair=chairReply.content.trim();

  const centum=centumDecisionContext(task);
  const third=parallaxContext(task);
  const parallaxPrompt=[
    'You are PARALLAX, the third brain after FORGE/AEGIS and Council X10.',
    'Do not merely vote for or against the Chair.',
    'Find a defensible third frame: hidden variable, option C, staged/reversible experiment, second-order effect, different time horizon, or condition that reverses the conclusion.',
    'TASK: '+task,
    centum,
    'COUNCIL X10 + CHAIR:',
    anonymous,
    '',
    'CHAIR:',
    chair,
    third,
    'Return concise sections: THIRD FRAME, OPTION C, HIDDEN VARIABLE, SECOND-ORDER EFFECT, REVERSIBLE TEST, REVERSAL CONDITION, FINAL IMPACT.',
    'Do not expose chain-of-thought.'
  ].filter(Boolean).join('\n\n');
  const parallaxReply=await answerLocally(parallaxPrompt,[],{preferNative:true,knowledge:false,decisionAudit:false});
  const parallax=parallaxReply.content.trim();

  const markdown=[
    '# Council X10 — executable review',
    '',
    'Task: '+task,
    '',
    ...lenses.flatMap((x,i)=>[
      '## '+(i+1)+'. '+x.name,
      '',
      x.answer,
      ''
    ]),
    '## Chair',
    '',
    chair,
    '',
    '## Third Brain — PARALLAX',
    '',
    parallax,
    ''
  ].join('\n');

  return {executed:true,lenses,chair,parallax,markdown};
}
