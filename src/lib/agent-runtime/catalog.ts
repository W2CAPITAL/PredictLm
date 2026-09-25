export const PREDICT_AGENTS=[
  {id:'predict-orchestrator',name:'Predict Orchestrator',role:'rotear, preservar contexto e verificar'},
  {id:'scanner-processual',name:'Scanner Processual',role:'DataJud + DJEN + portal oficial + recovery'},
  {id:'legal-review',name:'Legal Review',role:'fatos, prova, tese, contra-tese, requisitos e riscos'},
  {id:'research',name:'Research',role:'fontes atuais e cruzamento de evidência'},
  {id:'document',name:'Document',role:'extração e grounding em arquivos'},
  {id:'codebase-investigator',name:'Codebase Investigator',role:'arquitetura, dependências e hot files'},
  {id:'error-recovery',name:'Error Recovery',role:'timeout, geo-block, rate limit e upstream'},
  {id:'qa',name:'QA',role:'build, testes, segurança e regressão'},
  {id:'self-improve',name:'Self Improve',role:'feedback → hipótese → patch → eval → PR'},
  {id:'media',name:'Media',role:'imagem, storyboard, motion e vídeo'}
] as const;
