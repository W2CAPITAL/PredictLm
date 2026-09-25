import {
  REPORT_DOSSIER_CONTRACT,
  coerceDossier,
  detectDossierKind,
  renderDossierHtml,
  renderReportHtml,
  type DossierClassification,
  type DossierKind,
  type RenderDossierOptions
} from '@/lib/predict-dossier-html';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const MAX_BYTES=600*1024;

const exampleMarkdown=[
  '# Dossiê do processo 1012345-67.2023.8.26.0100 — Cobrança contra Alfa Engenharia',
  '',
  '**Conclusão em uma frase:** A sentença foi favorável ao cliente, mas a apelação suspende a execução e o prazo para contrarrazões termina em 14/10/2026.',
  '',
  '## Sumário executivo',
  'A decisão de primeiro grau favoreceu o cliente [oficial], mas há recurso pendente e o efeito processual deve ser confirmado no inteiro teor [inferência].',
  '',
  '## Dados-chave',
  '- **Valor da causa:** R$ 482.300,00 (petição inicial)',
  '- **Próximo prazo:** 14/10/2026',
  '',
  '## Cronologia',
  '- 15/03/2023 — Distribuição da ação de cobrança [oficial] (fonte: DataJud)',
  '- 10/08/2023 — Contestação alegando vício na entrega [fornecida]',
  '',
  '## Evidências',
  '- Sentença favorável ao pedido principal [oficial].',
  '- Contrato e comprovantes apresentados pelo solicitante [fornecida].',
  '- A apelação pode alterar a possibilidade de execução imediata [inferência].',
  '',
  '## Riscos',
  '- **Alto** — Demora no julgamento da apelação. Impacto: caixa comprometido. Mitigação: revisar medidas processuais disponíveis.',
  '- **Médio** — Insolvência da ré antes do trânsito em julgado. Mitigação: avaliar pesquisa patrimonial.',
  '',
  '## Próximos passos',
  '- Protocolar contrarrazões de apelação (responsável: Dra. Marina; prazo: 14/10/2026) — urgente',
  '- Pesquisar bens em bases autorizadas (responsável: a definir) — prioridade média',
  '',
  '## Fontes',
  '- [DataJud — Processo 1012345-67.2023.8.26.0100](https://datajud-wiki.cnj.jus.br/) — CNJ, acesso em 25/09/2026 [oficial]',
  '',
  '## Limitações',
  'O exemplo é demonstrativo; valores, prazos e fatos precisam ser substituídos por dados reais antes de uso.'
].join('\n');

function optionMeta(raw:any){
  const kind=(["relatorio-executivo","relatorio-operacional","relatorio-financeiro","relatorio-equipe","relatorio-tecnico","relatorio-incidente","relatorio-projeto","relatorio-comercial","relatorio-marketing","relatorio-rh","relatorio-risco","relatorio-compliance","auditoria","comparativo","dossie-juridico","due-diligence","pesquisa","generico"].includes(String(raw?.kind))
    ? String(raw.kind)
    : undefined) as DossierKind|undefined;
  const classification=(['publico','interno','confidencial','restrito'].includes(String(raw?.classification))
    ? String(raw.classification)
    : undefined) as DossierClassification|undefined;
  return {
    ...(kind?{kind}:{}),
    ...(classification?{classification}:{}),
    ...(raw?.author?{author:String(raw.author).slice(0,120)}:{})
  };
}

export async function GET(req:Request){
  const url=new URL(req.url);
  if(url.searchParams.get('example')==='1'){
    const rendered=renderReportHtml(exampleMarkdown,{
      meta:{kind:'dossie-juridico',classification:'confidencial'}
    });
    return new Response(rendered.html,{
      headers:{
        'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'no-store'
      }
    });
  }
  return Response.json({
    name:'PredictLM Report Architect',
    endpoint:'/api/report-dossier',
    methods:['GET','POST'],
    maxBytes:MAX_BYTES,
    formats:['json','html'],
    kinds:["relatorio-executivo","relatorio-operacional","relatorio-financeiro","relatorio-equipe","relatorio-tecnico","relatorio-incidente","relatorio-projeto","relatorio-comercial","relatorio-marketing","relatorio-rh","relatorio-risco","relatorio-compliance","auditoria","comparativo","dossie-juridico","due-diligence","pesquisa","generico"],
    classifications:['publico','interno','confidencial','restrito'],
    contract:REPORT_DOSSIER_CONTRACT,
    example:'/api/report-dossier?example=1',
    studio:'/dossie-studio'
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  try{
    const declared=Number(req.headers.get('content-length')||0);
    if(declared>MAX_BYTES)return Response.json({error:'Requisição acima do limite de 600 KB.'},{status:413});

    const text=await req.text();
    if(Buffer.byteLength(text,'utf8')>MAX_BYTES)return Response.json({error:'Requisição acima do limite de 600 KB.'},{status:413});

    let body:any={};
    try{body=JSON.parse(text||'{}')}catch{
      return Response.json({error:'JSON inválido.'},{status:400});
    }

    const format=String(body?.format||'html').toLowerCase()==='json'?'json':'html';
    const download=Boolean(body?.download);
    const rawOptions=body?.options||{};
    const options:RenderDossierOptions={
      maxWordsPerSection:Math.max(120,Math.min(2000,Number(rawOptions.maxWordsPerSection)||380)),
      theme:['auto','light','dark'].includes(String(rawOptions.theme))?rawOptions.theme:'auto',
      meta:optionMeta(body?.meta||{})
    };

    let rendered;
    if(body?.dossier&&typeof body.dossier==='object'){
      const dossier=coerceDossier(body.dossier,options);
      rendered=renderDossierHtml(dossier,options);
    }else{
      const markdown=String(body?.markdown||'').trim();
      if(!markdown)return Response.json({error:'Envie "markdown" ou "dossier".'},{status:400});
      if(!options.meta?.kind)options.meta={...options.meta,kind:detectDossierKind(markdown)};
      rendered=renderReportHtml(markdown,options);
    }

    if(format==='json'){
      return Response.json({
        dossier:rendered.dossier,
        quality:rendered.quality
      },{headers:{'Cache-Control':'no-store'}});
    }

    const filename=(rendered.dossier.title||'dossie')
      .normalize('NFD').replace(/\p{M}/gu,'')
      .replace(/[^a-zA-Z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,80)
      .toLowerCase()||'dossie';

    return new Response(rendered.html,{
      headers:{
        'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'no-store',
        ...(download?{'Content-Disposition':'attachment; filename="'+filename+'.html"'}:{})
      }
    });
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha ao gerar dossiê.')},{status:500});
  }
}
