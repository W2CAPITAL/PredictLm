import type { PromptIntent } from './intent';

type Atom={intents:PromptIntent[];text:string};
export const PROMPT_ATOMS:Atom[]=[
  {intents:['general','process_lookup','process_analysis','legal_draft','legal_strategy','document','draft_message','data','code','research','media'],text:'Aderência ao pedido é mais importante que demonstrar recursos do sistema.'},
  {intents:['process_lookup','process_analysis','document','data','research'],text:'Trabalhe evidence-first: use dados observados e preserve lacunas em vez de preencher com suposições.'},
  {intents:['process_lookup','process_analysis'],text:'Falha de uma fonte não apaga sucesso parcial das outras fontes.'},
  {intents:['process_analysis','legal_strategy'],text:'Faça internamente tese, contra-tese, melhor caso, pior caso plausível, prova necessária e risco operacional antes de concluir.'},
  {intents:['legal_strategy'],text:'Quando a pergunta for como agir judicialmente, dê o caminho concreto por competência/sistema/documentos/requisitos, sem transformar preparação em protocolo automático.'},
  {intents:['document','research','process_analysis'],text:'Use grounding: diferencie fonte, inferência e ponto não sustentado.'},
  {intents:['code'],text:'Inspecione o estado atual, faça patch mínimo, preserve continuidade e não afirme teste/deploy sem evidência.'},
  {intents:['media'],text:'Estruture intenção visual, composição, consistência, geração, review, variante e export.'},
  {intents:['general','draft_message'],text:'Evite boilerplate de assistente e finalize quando a pergunta já estiver respondida.'}
];

export function atomsFor(intent:PromptIntent){
  return PROMPT_ATOMS.filter(x=>x.intents.includes(intent)).map(x=>x.text);
}
