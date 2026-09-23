import type { LegalLens, LegalMovement, LegalProcessInterpretation, LegalPublication, LegalTimelineItem } from './types';

function textOf(m:LegalMovement|LegalPublication){
  if('name' in m)return (m.name+' '+(m.details||[]).join(' ')).toLowerCase();
  return (m.type+' '+m.text).toLowerCase();
}

function levelFor(text:string){
  if(/extin|senten|transit|baixa|arquiv|penhora|bloque|busca e apreens|sucumb|honor[aá]ri|custas?|prazo|intima[cç][aã]o/.test(text))return 'high' as const;
  if(/decis|despacho|conclus|audi[eê]ncia|recurso|apela|contesta|cita[cç]/.test(text))return 'attention' as const;
  return 'info' as const;
}

export function mergeTimeline(movements:LegalMovement[],publications:LegalPublication[]):LegalTimelineItem[]{
  const rows:LegalTimelineItem[]=[
    ...movements.map((m,i)=>({id:'m-'+i+'-'+m.date,date:m.date,type:'movement' as const,title:m.name,body:m.details?.join(' · '),source:m.source})),
    ...publications.map((p,i)=>({id:'p-'+(p.id||i),date:p.availableAt||p.publishedAt||'',type:'publication' as const,title:p.type||'Publicação DJEN',body:[p.courtUnit,p.recipient,p.text].filter(Boolean).join(' · '),source:'DJEN' as const}))
  ];
  return rows.filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

export function buildLegalLenses(movements:LegalMovement[],publications:LegalPublication[],meta:{className?:string;subjects?:string[];lastUpdate?:string}):LegalLens[]{
  const combined=[...movements,...publications].map(textOf).join(' ');
  const recent=mergeTimeline(movements,publications).slice(0,5);
  const critical=recent.filter(x=>levelFor((x.title+' '+(x.body||'')).toLowerCase())==='high');

  return [
    {
      id:'juridico',title:'Jurídico',
      level:/extin|senten|transit|baixa/.test(combined)?'high':'info',
      findings:[
        meta.className?'Classe pública identificada: '+meta.className+'.':'A classe processual não foi retornada pelas fontes consultadas.',
        meta.subjects?.length?'Assuntos: '+meta.subjects.slice(0,4).join(', ')+'.':'Assuntos não disponíveis na resposta.',
        critical.length?'Há evento(s) recente(s) que merecem leitura integral antes de qualquer conclusão.':'Nenhum marcador crítico foi inferido apenas pelos metadados recentes.'
      ]
    },
    {
      id:'consumidor',title:'Consumidor',
      level:/revisional|banc|financi|contrato|juros/.test((meta.className||'')+' '+(meta.subjects||[]).join(' '))?'attention':'info',
      findings:[
        'DataJud e DJEN exibem metadados/publicações; não comprovam sozinhos contratação, consentimento, publicidade ou documentos particulares.',
        'Em matéria revisional/consumerista, contratos, comprovantes e comunicações devem ser analisados junto aos autos.'
      ]
    },
    {
      id:'financeiro',title:'Financeiro',
      level:/custas?|honor[aá]ri|sucumb|valor|pagamento/.test(combined)?'attention':'info',
      findings:[
        /custas?/.test(combined)?'Foram encontrados termos relacionados a custas nas movimentações/publicações.':'Nenhuma referência explícita a custas foi detectada no recorte retornado.',
        /honor[aá]ri|sucumb/.test(combined)?'Há termos relacionados a honorários/sucumbência; conferir o inteiro teor.':'Sem referência explícita a honorários/sucumbência no recorte.'
      ]
    },
    {
      id:'operacional',title:'Operacional',
      level:publications.length?'attention':'info',
      findings:[
        'Fontes processuais: '+movements.length+' movimentação(ões) normalizada(s).',
        'DJEN: '+publications.length+' publicação(ões) encontrada(s).',
        meta.lastUpdate?'Última atualização informada pelo DataJud: '+meta.lastUpdate+'.':'Data de última atualização não retornada.'
      ]
    },
    {
      id:'risco',title:'Risco',
      level:publications.length||critical.length?'high':'info',
      findings:[
        publications.length?'Há publicação(ões) no DJEN. Publicação pode ter efeito sobre prazo; confirme o teor, a data legal e o calendário aplicável.':'Nenhuma publicação DJEN foi localizada para este número na consulta atual.',
        'A ausência de dado na API pública não prova ausência de ato no sistema do tribunal; confirme no portal oficial quando a decisão depender de prazo ou estratégia.'
      ]
    }
  ];
}


function corpusOf(movements:LegalMovement[],publications:LegalPublication[]){
  return [
    ...movements.map(m=>[m.date,m.name,...(m.details||[])].join(' ')),
    ...publications.map(p=>[p.availableAt,p.type,p.recipient,p.courtUnit,p.text].filter(Boolean).join(' '))
  ].join('\n').toLowerCase();
}

function firstMatch(text:string,re:RegExp){
  const m=text.match(re);
  return m?.[1]?.replace(/\s+/g,' ').trim();
}

function hasAfter(timeline:LegalTimelineItem[],needle:RegExp,afterNeedle:RegExp){
  const target=timeline.find(x=>needle.test((x.title+' '+(x.body||'')).toLowerCase()));
  if(!target)return false;
  const targetDate=String(target.date);
  return timeline.some(x=>String(x.date)>targetDate&&afterNeedle.test((x.title+' '+(x.body||'')).toLowerCase()));
}

export function interpretProcessState(
  movements:LegalMovement[],
  publications:LegalPublication[],
  meta:{className?:string;subjects?:string[]}
):LegalProcessInterpretation{
  const timeline=mergeTimeline(movements,publications);
  const corpus=corpusOf(movements,publications);
  const what:string[]=[];
  const impact:string[]=[];
  const next:string[]=[];
  const evidence:string[]=[];

  const author=firstMatch(corpus,/autor(?:a)?\s*:\s*([^\n·|]{3,120})/i);
  const defendant=firstMatch(corpus,/(?:r[eé]u|requerido|requerida)\s*:\s*([^\n·|]{3,120})/i);
  const gratuityDenied=/indefir\w*\s+(?:os\s+)?benef[ií]cios?\s+da\s+gratuidade|gratuidade[^.]{0,100}indefer/i.test(corpus);
  const initialCosts=/recolhimento[^.]{0,120}custas?\s+(?:processuais|iniciais)|taxa judici[aá]ria[^.]{0,100}\d+[,.]?\d*%/i.test(corpus);
  const art290=/art\.?\s*290|cancelamento\s+da\s+distribui[cç][aã]o/i.test(corpus);
  const extinction=/extin[cç][aã]o\s+(?:do\s+feito|do\s+processo)|extingu\w+\s+(?:o\s+)?feito|senten[cç]a[^.]{0,220}extin/i.test(corpus);
  const transit=/tr[aâ]nsito\s+em\s+julgado/i.test(corpus);
  const costsSatisfied=/custas?\s+satisfeitas?|custas?[^.]{0,120}(?:pagas?|quitadas?|recolhidas?)/i.test(corpus);
  const reopening=/desarquiv|reabert|prosseguimento\s+do\s+feito|receb(?:o|ida)\s+a\s+inicial|cite-se|cita[cç][aã]o\s+expedida/i.test(corpus);
  const meritDecision=/procedente|improcedente|julgo\s+(?:procedente|improcedente)|mérito|merito/i.test(corpus);
  const cancellationFee=/despesa\s+(?:pelo|de)\s+cancelamento|cancelamento[^.]{0,80}custas?/i.test(corpus);

  if(gratuityDenied){
    what.push('O pedido de gratuidade de justiça foi negado.');
    evidence.push('Publicação com indeferimento da gratuidade.');
  }
  if(initialCosts){
    what.push('Depois disso, houve determinação para recolher as custas iniciais/taxa judiciária.');
    evidence.push('Publicação com ordem de recolhimento de custas.');
  }
  if(extinction&&art290){
    what.push('Como o recolhimento não foi comprovado no prazo, a sentença extinguiu o feito com fundamento no art. 290 do CPC/cancelamento da distribuição.');
    evidence.push('Sentença menciona extinção e art. 290 do CPC.');
  }else if(extinction){
    what.push('Há sentença/evento indicando extinção do processo.');
    evidence.push('Evento/publicação de extinção.');
  }
  if(transit){
    what.push('Depois apareceu trânsito em julgado, o que indica que a decisão se tornou definitiva no processo tal como estava.');
    evidence.push('Movimentação de trânsito em julgado.');
  }
  if(costsSatisfied){
    what.push(cancellationFee||extinction
      ? 'Mais tarde apareceu “Custas Satisfeitas”. Isso indica quitação da pendência de custas, mas não significa sozinho que o processo foi reaberto.'
      : 'Há registro posterior de custas satisfeitas.');
    evidence.push('Evento/publicação posterior de custas satisfeitas.');
  }

  const closed=extinction&&transit;
  const explicitReopenAfterTransit=transit&&reopening&&hasAfter(timeline,/tr[aâ]nsito\s+em\s+julgado/i,/desarquiv|reabert|prosseguimento\s+do\s+feito|receb(?:o|ida)\s+a\s+inicial|cite-se|cita[cç][aã]o\s+expedida/i);

  let currentState='Os dados públicos não são suficientes para definir a situação processual com segurança.';
  let posture:LegalProcessInterpretation['posture']='unknown';
  let postureLabel='Inconclusivo';

  if(closed&&!explicitReopenAfterTransit){
    currentState='O processo aparenta estar encerrado/extinto. O pagamento posterior de custas resolve a pendência financeira indicada, mas não há evidência pública suficiente de reabertura do mérito.';
    posture='unfavorable';
    postureLabel='Desfavorável para a parte autora quanto ao processo principal';
    impact.push('Para a parte autora, isso é ruim no processo principal: a ação terminou antes de uma decisão favorável sobre o mérito.');
    if(!meritDecision)impact.push('O material encontrado aponta para encerramento por questão processual/custas, não para vitória ou derrota sobre o mérito da pretensão.');
    if(costsSatisfied)impact.push('O ponto positivo é que a pendência de custas parece ter sido regularizada depois.');
  }else if(extinction&&!transit){
    currentState='Há indicação de extinção, mas sem trânsito em julgado confirmado no conjunto analisado.';
    posture='unfavorable';
    postureLabel='Desfavorável para a parte autora, com situação ainda a conferir';
    impact.push('A extinção é desfavorável à continuidade da ação, embora a via recursal/pedido de reconsideração dependa das datas e do teor integral.');
  }else if(explicitReopenAfterTransit){
    currentState='Há sinal público de movimentação de retomada após o trânsito; isso precisa ser conferido no ato que determinou o prosseguimento.';
    posture='mixed';
    postureLabel='Misto: houve encerramento, mas há sinal posterior de retomada';
    impact.push('Não trate o trânsito anterior como estado final sem ler o ato posterior que retomou o processo.');
  }else if(reopening){
    currentState='Há sinal de prosseguimento ativo do processo.';
    posture='neutral';
    postureLabel='Processo em andamento';
    impact.push('O processo aparenta estar em curso; a avaliação de “bom ou ruim” depende do conteúdo das decisões e de qual parte você representa.');
  }

  if(closed&&!explicitReopenAfterTransit){
    next.push('Abrir o evento da sentença e confirmar se a extinção foi sem resolução do mérito e qual foi exatamente a base usada.');
    next.push('Conferir o evento “Custas Satisfeitas” e qualquer decisão posterior: pagar a despesa de cancelamento não reabre automaticamente a ação.');
    next.push('Se não houver reabertura e a pretensão ainda puder ser proposta, avaliar nova ação corrigindo o problema de custas/gratuidade e checando prescrição/decadência.');
  }else{
    next.push('Ler o ato mais recente que realmente altere a marcha do processo antes de definir a próxima medida.');
  }

  if(meta.subjects?.length) evidence.push('Assuntos públicos: '+meta.subjects.slice(0,4).join(', ')+'.');
  if(author) evidence.push('Parte autora identificada na publicação: '+author+'.');
  if(defendant) evidence.push('Parte ré/requerida identificada na publicação: '+defendant+'.');

  const confidence:LegalProcessInterpretation['confidence']=
    closed&&(extinction||art290)&&publications.length?'high':
    (timeline.length>=2?'medium':'low');

  return {
    confidence,
    posture,
    postureLabel,
    currentState,
    whatHappened:what.slice(0,6),
    whyItMatters:impact.slice(0,5),
    nextActions:next.slice(0,5),
    evidence:evidence.slice(0,8),
    inferredPartyRole:author?'author':defendant?'defendant':'unknown',
    inferredPartyName:author||defendant||undefined
  };
}
