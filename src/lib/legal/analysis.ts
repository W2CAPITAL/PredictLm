import type { LegalLens, LegalMovement, LegalPublication, LegalTimelineItem } from './types';

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
