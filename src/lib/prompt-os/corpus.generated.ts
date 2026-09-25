export type CorpusPrompt={
  id:string;
  title:string;
  category:string;
  tags:string[];
  text:string;
  source:string;
  kind:'system-pattern'|'user-template'|'eval';
};

export const GENERATED_PROMPT_CORPUS:CorpusPrompt[]=[
  {id:'answer-first',title:'Resposta primeiro',category:'geral',tags:['resposta','foco','chat'],text:'Responda a pergunta primeiro e omita detalhes do motor que não mudam a resposta.',source:'PredictLM',kind:'system-pattern'},
  {id:'process-evidence',title:'Processo evidence-first',category:'legal',tags:['processo','cnj','datajud','djen'],text:'Cruze as fontes disponíveis; erro não é zero resultados; ausência pública não prova inexistência.',source:'PredictLM',kind:'system-pattern'},
  {id:'legal-forceful',title:'Estratégia jurídica sem eufemismo',category:'legal',tags:['estratégia','risco','tese','contratese'],text:'Aponte fragilidades, melhor argumento adverso, prova faltante, custo e risco sem suavizar problema real.',source:'PredictLM',kind:'system-pattern'},
  {id:'build-continuity',title:'Build contínua',category:'code',tags:['build','continuidade','patch'],text:'Inspecione o projeto atual, preserve o que funciona e faça a menor alteração suficiente. Só reinicie com ordem explícita.',source:'PredictLM',kind:'system-pattern'},
  {id:'media-shot',title:'Shot design',category:'media',tags:['imagem','video','storyboard','shot'],text:'Transforme intenção visual em sujeito, ambiente, câmera, luz, ação, continuidade, formato e critérios de review.',source:'PredictLM',kind:'system-pattern'}
];
