import type { AssistantMessage } from './assistant-store';

export type ConversationKind='casual'|'context'|'factual'|'current'|'technical'|'howto'|'general';

const clean=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

export function classifyConversation(prompt:string,history:AssistantMessage[]=[]):ConversationKind{
  const p=clean(prompt);
  if(/^(oi|ola|opa|hey|hello|bom dia|boa tarde|boa noite|e ai|tudo bem)[!.?\s]*$/.test(p))return 'casual';
  if(/(voce me ama|gosta de mim|sente algo por mim|obrigad|valeu|kkk|haha|rsrs|boa|legal|bacana)/.test(p))return 'casual';
  if(/^(ja|sim|nao|isso|exato|entendi|mas ja|eu ja|esta ativo|ja esta ativo|ativei|liguei)\b/.test(p)&&history.length)return 'context';
  if(/\b(hoje|agora|atual|atualmente|ultim[ao]s?|recentes?|noticias?|cotacao|preco|placar|presidente atual|versao atual)\b/.test(p))return 'current';
  if(/^(como (posso|eu posso|fazer|criar|montar|come[cç]ar)|passo a passo|o que preciso para|quero aprender a|me ensine a)\b/.test(p))return 'howto';
  if(/^(quem (e|foi)|o que (e|foi)|defina|explique|como funciona|por que|porque|qual a diferenca|qual e|onde fica|quando nasceu|quando foi)\b/.test(p))return 'factual';
  if(/\b(codigo|programa|javascript|typescript|react|next|python|api|banco de dados|database|frontend|backend|git|github|vercel|docker|linux|windows|erro|bug|arquitetura|algoritmo)\b/.test(p))return 'technical';
  return 'general';
}

function lastAssistant(history:AssistantMessage[]){
  return [...history].reverse().find(m=>m.role==='assistant')?.content||'';
}

function startupHowTo(){
  return [
    '**Comece pelo problema, não pela empresa.** Uma startup nasce quando você tenta resolver um problema real de forma repetível e escalável.',
    '',
    '1. **Escolha um problema específico.** Defina quem sofre com ele, com que frequência e quanto custa não resolver.',
    '2. **Converse com 10–20 pessoas do público.** Não pergunte “você compraria?”. Pergunte como resolvem hoje, quanto pagam e o que mais incomoda.',
    '3. **Defina uma hipótese simples de produto.** Uma frase: “Para [público], eu resolvo [problema] com [solução]”.',
    '4. **Faça um MVP pequeno.** Pode ser landing page, planilha, serviço manual ou app mínimo. O objetivo é validar uso e pagamento, não impressionar.',
    '5. **Busque os primeiros clientes antes de escalar.** Tente conseguir 3–10 usuários realmente usando; melhor ainda se algum pagar.',
    '6. **Meça poucas coisas.** Aquisição, ativação, retenção, receita e custo para atender. Se ninguém volta, ainda não existe product-market fit.',
    '7. **Só depois formalize e automatize o que já mostrou valor.** CNPJ, contratos, contabilidade, equipe, investimento e infraestrutura entram conforme a operação exige.',
    '',
    '**Um plano de 7 dias:** dias 1–2 problema e público; dias 3–4 entrevistas; dia 5 proposta/MVP; dia 6 página ou protótipo; dia 7 tentar conseguir o primeiro usuário.',
    '',
    'Se você me disser **qual problema quer resolver, para quem e quanto pode investir**, eu consigo transformar isso em modelo de negócio, MVP, stack e plano de lançamento.'
  ].join('\n');
}

function practicalHowTo(prompt:string){
  const p=clean(prompt);
  if(/startup|start-up/.test(p))return startupHowTo();
  if(/criar.*(app|aplicativo|sistema|site)|fazer.*(app|aplicativo|sistema|site)/.test(p)){
    return [
      '**Primeiro feche o escopo mínimo.** Defina usuário, problema, ação principal e o que precisa estar funcionando no primeiro dia.',
      '',
      '1. Liste 3–5 fluxos essenciais.',
      '2. Defina dados e regras de validação antes da interface.',
      '3. Escolha frontend, backend e banco só conforme a necessidade real.',
      '4. Faça um protótipo funcional do fluxo principal.',
      '5. Adicione estados de loading, vazio, erro e sucesso.',
      '6. Teste em desktop e mobile.',
      '7. Só então conecte APIs, autenticação, pagamentos ou automações.',
      '8. Rode build/testes e empacote uma versão reproduzível.',
      '',
      'Se quiser, descreva o app em uma frase e eu estruturo requisitos, arquitetura, telas, dados, API e plano de implementação.'
    ].join('\n');
  }
  return null;
}

export function answerQuality(prompt:string,content:string){
  const p=clean(prompt);
  const text=String(content||'').trim();
  let score=0;
  if(text.length>=180)score+=2; else if(text.length>=90)score+=1;
  if(/\n|\d+\.|- |\*\*/.test(text))score+=1;
  if(/como|passo|agora|fa[cç]a|primeiro|depois|pr[oó]ximo/.test(clean(text)))score+=1;
  if(/^(como posso|como criar|como fazer|como montar)/.test(p)&&text.length<220)score-=2;
  if(/^(como posso|como criar|como fazer|como montar)/.test(p)&&/^(uma |o |a ).{0,80}\b(e|é)\b/.test(clean(text)))score-=1;
  if(/nao tenho contexto|não tenho contexto|ative neural|ative o neural|fallback/i.test(text))score-=3;
  return score;
}

export function directConversationReply(prompt:string,history:AssistantMessage[],neural:{loaded:boolean;tier:string|null}):string|null{
  const p=clean(prompt);
  if(/^(oi|ola|opa|hey|hello|bom dia|boa tarde|boa noite|e ai|tudo bem)[!.?\s]*$/.test(p)){
    return 'Olá. O que você quer fazer? Posso conversar normalmente, explicar algo, pesquisar quando precisar de informação atual ou abrir o **Build** para continuar um projeto.';
  }
  if(/voce me ama|gosta de mim|sente algo por mim/.test(p)){
    return 'Eu não sinto amor do jeito que uma pessoa sente, mas posso conversar com carinho, prestar atenção no que você diz e estar presente na conversa. Se você perguntou de um jeito mais afetivo: eu posso entrar na brincadeira sem fingir que tenho sentimentos humanos.';
  }
  if(/^(qual (e|é) (seu )?nome|como voce se chama|como você se chama)/i.test(prompt.trim()))return 'Meu nome é **PredictLM**.';
  if(/^(como voce funciona|como você funciona)/i.test(prompt.trim()))return 'Eu combino conversa com histórico, DeepThink, memória, pesquisa quando necessária, knowledge packs e um modelo neural local opcional. No **Build**, também leio o estado atual do projeto e continuo a partir dele em vez de recriar tudo.';
  const howto=practicalHowTo(prompt);
  if(howto)return howto;
  if(/^(obrigad|valeu|vlw|thanks)/.test(p))return 'De nada. Pode continuar.';
  if(/^(kkk|haha|rsrs|kkkk+)/.test(p))return 'Hahaha. Manda a próxima.';
  if(/^(ja|sim|nao|isso|exato|entendi|mas ja|eu ja|esta ativo|ja esta ativo|ativei|liguei)\b/.test(p)&&history.length){
    const prev=clean(lastAssistant(history));
    if(/neural local|modelo local|qwen/.test(prev)){
      if(neural.loaded)return 'Entendi. Se o **Neural Local já está ativo**, então eu não devo continuar pedindo para ativá-lo. Se uma resposta aparecer como fallback, significa que a geração neural falhou naquela mensagem; vou sinalizar isso explicitamente e usar o contexto da conversa em vez de disparar uma busca aleatória.';
      return 'Entendi — você está dizendo que já ativou o Neural Local. Se o indicador ainda não aparece como ativo, então houve falha no carregamento ou o estado não foi mantido. Eu não vou tratar sua frase como uma pesquisa; ela é continuação do que estávamos falando.';
    }
    if(/web|pesquisa/.test(prev))return 'Entendi. Então considero a pesquisa já ativada e continuo a partir do contexto anterior.';
    return 'Entendi. Vou considerar isso como continuação da mensagem anterior, não como uma nova pesquisa.';
  }
  return null;
}

export function shouldSearchConversation(kind:ConversationKind,webEnabled:boolean){
  if(kind==='casual'||kind==='context')return false;
  if(kind==='current'||kind==='factual')return true;
  if(kind==='howto')return webEnabled;
  return webEnabled;
}

export interface ResearchItem{
  title:string;
  description?:string;
  summary?:string;
  url:string;
  source?:string;
  site?:string;
}

function trimSentence(text:string,max=1150){
  const cleanText=String(text||'').replace(/\s+/g,' ').trim();
  if(cleanText.length<=max)return cleanText;
  const cut=cleanText.slice(0,max);
  const last=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? '));
  return (last>300?cut.slice(0,last+1):cut+'…');
}

export function synthesizeResearch(prompt:string,items:ResearchItem[]){
  const useful=items.filter(x=>(x.summary||x.description)?.trim()).slice(0,5);
  if(!useful.length)return null;
  const kind=classifyConversation(prompt);
  const first=useful[0];
  const primary=trimSentence(first.summary||first.description||'');
  const sources=useful.slice(0,4).map(x=>({title:x.title,source:x.url}));

  if(kind==='factual'){
    const extra=useful.slice(1,3).map(x=>trimSentence(x.summary||x.description||'',360)).filter(Boolean);
    return {content:primary+(extra.length?'\n\n'+extra.join('\n\n'):''),sources};
  }
  if(kind==='current'){
    return {
      content:useful.slice(0,4).map(x=>'**'+x.title+'**\n'+trimSentence(x.summary||x.description||'',560)).join('\n\n'),
      sources
    };
  }
  if(kind==='howto'){
    const local=practicalHowTo(prompt);
    if(local)return {content:local,sources};
    const evidence=useful.slice(0,3).map((x,i)=>(i+1)+'. '+trimSentence(x.summary||x.description||'',320)).join('\n');
    return {
      content:[
        '**Caminho prático**',
        '1. Defina o resultado exato que você quer atingir.',
        '2. Liste pré-requisitos, restrições e recursos que já possui.',
        '3. Comece pela menor versão que produz um resultado verificável.',
        '4. Teste com um caso real antes de ampliar.',
        '5. Corrija o que falhar e só depois automatize ou escale.',
        '',
        '**Contexto encontrado nas fontes**',
        evidence
      ].join('\n'),
      sources
    };
  }
  const snippets=useful.slice(0,3).map(x=>trimSentence(x.summary||x.description||'',380)).filter(Boolean);
  return {
    content:snippets.join('\n\n'),
    sources
  };
}
