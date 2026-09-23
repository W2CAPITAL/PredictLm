import type { ChatMessage, WorkspaceFile } from './types';

export type BuildTurnKind='conversation'|'continue'|'build'|'new-project';

function currentIntent(files:WorkspaceFile[]){
  const spec=files.find(f=>f.path==='predict.spec.json');
  try{return spec?String(JSON.parse(spec.content)?.spec?.intent||''):''}catch{return ''}
}

function explicitNew(prompt:string){
  return /\b(novo projeto|nova aplicação|nova aplicacao|do zero|from scratch|recrie do zero|recomece do zero|reset project)\b/i.test(prompt);
}

function greeting(prompt:string){
  return /^(oi|ol[aá]|opa|hey|hello|bom dia|boa tarde|boa noite|e a[ií]|tudo bem)[!.?\s]*$/i.test(prompt.trim());
}

function conversationalQuestion(prompt:string){
  const p=prompt.trim();
  if(greeting(p))return true;
  if(/^(quem é você|quem e voce|o que você faz|o que voce faz|como você funciona|como voce funciona|me explique|explique|por que|porque|como funciona)\b/i.test(p))return true;
  if(p.endsWith('?')&&!/(crie|faça|faca|gere|adicione|remova|altere|mude|corrija|implemente|construa|build|fix|refactor)/i.test(p))return true;
  return false;
}

function vagueContinuation(prompt:string){
  return /^(crie|continue|continua|continuar|segue|prossiga|vai|faça|faca|melhore|aprofunde|termina|termine|faz|manda ver|go)[!.\s]*$/i.test(prompt.trim());
}

export function resolveBuildTurn(prompt:string,files:WorkspaceFile[],messages:ChatMessage[]){
  const activeIntent=currentIntent(files);
  if(explicitNew(prompt))return {kind:'new-project' as BuildTurnKind,effectivePrompt:prompt,activeIntent};

  if(conversationalQuestion(prompt)){
    return {
      kind:'conversation' as BuildTurnKind,
      effectivePrompt:prompt,
      activeIntent,
      context:activeIntent?'Projeto atual: '+activeIntent+'. Não altere arquivos nesta resposta.':'Nenhum projeto ativo precisa ser alterado nesta resposta.'
    };
  }

  if(activeIntent&&vagueContinuation(prompt)){
    const lastUser=[...messages].reverse().find(m=>m.role==='user'&&!vagueContinuation(m.content)&&!conversationalQuestion(m.content));
    const origin=lastUser?.content||('projeto '+activeIntent);
    return {
      kind:'continue' as BuildTurnKind,
      activeIntent,
      effectivePrompt:[
        'Continue desenvolvendo o projeto '+activeIntent+' atual a partir dos arquivos existentes.',
        'Não recrie App.tsx nem styles.css do zero.',
        'Revise o que já existe, preserve funcionalidades prontas e avance somente no que estiver incompleto.',
        'Priorize nesta ordem: requisitos pendentes, integração frontend/backend quando necessária, dados, estados de erro/vazio/loading, testes, segurança, responsividade e acabamento.',
        'Contexto anterior relevante: '+origin
      ].join(' ')
    };
  }

  return {kind:'build' as BuildTurnKind,effectivePrompt:prompt,activeIntent};
}
