import {renderReportHtml,type DossierClassification} from '@/lib/predict-dossier-html';
import {
  aegisReportPrompt,
  chairReportPrompt,
  councilReportPrompt,
  forgeReportPrompt,
  inferReportBlueprint,
  parallaxReportPrompt,
  repairReportPrompt
} from '@/lib/report-intelligence';
import {callProviderText,rankProviders} from '@/lib/server/provider-mesh';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=90;

const MAX_SOURCE=80_000;
const MAX_REQUEST=4_000;

function clean(value:any,max:number){
  return String(value??'').replace(/\u0000/g,'').trim().slice(0,max);
}

function classification(value:any):DossierClassification{
  return ['publico','interno','confidencial','restrito'].includes(String(value))
    ? String(value) as DossierClassification
    : 'confidencial';
}

async function runOne(provider:any,prompt:string,maxTokens=2200){
  return callProviderText(provider,[
    {role:'system',content:'Você é um componente interno do PredictLM Report Architect. Responda somente ao papel solicitado. Não exponha chain-of-thought privada.'},
    {role:'user',content:prompt}
  ],{deep:true,timeoutMs:28000,maxTokens,temperature:.18});
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const request=clean(body?.request||body?.prompt,MAX_REQUEST);
    const sourceText=clean(body?.sourceText||body?.context||body?.material,MAX_SOURCE);
    if(!request)return Response.json({error:'Informe o objetivo do relatório em "request".'},{status:400});

    const blueprint=inferReportBlueprint(request,sourceText);
    const providers=rankProviders(request+' relatório '+blueprint.label,true).slice(0,4);
    if(!providers.length){
      return Response.json({
        error:'Nenhum provider de IA do servidor está disponível para o Report Architect.',
        code:'NO_REPORT_PROVIDER',
        blueprint
      },{status:503});
    }

    let forge='';
    let aegis='';
    let parallax='';
    let council='';

    const highRiskKinds=new Set(['dossie-juridico','due-diligence','auditoria','relatorio-risco','relatorio-compliance','relatorio-incidente']);
    const useCouncil=body?.council===true||String(body?.depth||'auto')==='deep'||highRiskKinds.has(blueprint.kind)||sourceText.length>12000;

    if(providers.length===1){
      const bundlePrompt=[
        'Execute três lentes independentes para o mesmo relatório. Não escreva o relatório final.',
        '',
        '=== FORGE ===',
        forgeReportPrompt(request,sourceText,blueprint),
        '',
        '=== AEGIS ===',
        aegisReportPrompt(request,sourceText,blueprint),
        '',
        '=== PARALLAX ===',
        parallaxReportPrompt(request,sourceText,blueprint),
        '',
        'Responda exatamente com os marcadores:',
        '<<<FORGE>>>',
        '...',
        '<<<AEGIS>>>',
        '...',
        '<<<PARALLAX>>>',
        '...',
        ...(useCouncil?[
          '<<<COUNCIL_X10>>>',
          councilReportPrompt(request,sourceText,blueprint)
        ]:[])
      ].join('\n');
      const bundle=await runOne(providers[0],bundlePrompt,3600);
      forge=(bundle.match(/<<<FORGE>>>\s*([\s\S]*?)(?=<<<AEGIS>>>|$)/i)?.[1]||bundle).trim();
      aegis=(bundle.match(/<<<AEGIS>>>\s*([\s\S]*?)(?=<<<PARALLAX>>>|$)/i)?.[1]||'').trim();
      parallax=(bundle.match(/<<<PARALLAX>>>\s*([\s\S]*?)(?=<<<COUNCIL_X10>>>|$)/i)?.[1]||'').trim();
      council=useCouncil?(bundle.match(/<<<COUNCIL_X10>>>\s*([\s\S]*)$/i)?.[1]||'').trim():'';
    }else{
      const jobs=[
        runOne(providers[0],forgeReportPrompt(request,sourceText,blueprint)),
        runOne(providers[1]||providers[0],aegisReportPrompt(request,sourceText,blueprint)),
        runOne(providers[2]||providers[0],parallaxReportPrompt(request,sourceText,blueprint)),
        ...(useCouncil?[runOne(providers[3]||providers[0],councilReportPrompt(request,sourceText,blueprint),3400)]:[])
      ];
      const settled=await Promise.allSettled(jobs);
      forge=settled[0].status==='fulfilled'?settled[0].value:'FORGE indisponível nesta execução.';
      aegis=settled[1].status==='fulfilled'?settled[1].value:'AEGIS indisponível nesta execução.';
      parallax=settled[2].status==='fulfilled'?settled[2].value:'PARALLAX indisponível nesta execução.';
      council=useCouncil&&settled[3]
        ? settled[3].status==='fulfilled'?settled[3].value:'Council X10 indisponível nesta execução.'
        : '';
    }

    const chairProvider=providers[0];
    let markdown=await runOne(chairProvider,chairReportPrompt({
      request,sourceText,blueprint,forge,aegis,parallax,council
    }),5200);
    markdown=markdown
      .replace(/^\s*```(?:markdown|md)?\s*/i,'')
      .replace(/\s*```\s*$/,'')
      .trim();

    let rendered=renderReportHtml(markdown,{
      maxWordsPerSection:Math.max(160,Math.min(900,Number(body?.maxWordsPerSection)||420)),
      theme:['auto','light','dark'].includes(String(body?.theme))?body.theme:'auto',
      meta:{
        kind:blueprint.kind,
        classification:classification(body?.classification),
        author:clean(body?.author,120)||'PredictLM Report Architect'
      }
    });

    let repaired=false;
    if((rendered.quality.score<85||rendered.quality.errors>0)&&rendered.quality.issues.length){
      const issues=rendered.quality.issues.map(x=>x.level.toUpperCase()+': '+x.message).slice(0,14);
      try{
        let fixed=await runOne(chairProvider,repairReportPrompt(markdown,issues,request),5200);
        fixed=fixed.replace(/^\s*```(?:markdown|md)?\s*/i,'').replace(/\s*```\s*$/,'').trim();
        const candidate=renderReportHtml(fixed,{
          maxWordsPerSection:Math.max(160,Math.min(900,Number(body?.maxWordsPerSection)||420)),
          theme:['auto','light','dark'].includes(String(body?.theme))?body.theme:'auto',
          meta:{
            kind:blueprint.kind,
            classification:classification(body?.classification),
            author:clean(body?.author,120)||'PredictLM Report Architect'
          }
        });
        if(candidate.quality.score>=rendered.quality.score){
          markdown=fixed;
          rendered=candidate;
          repaired=true;
        }
      }catch{}
    }

    return Response.json({
      markdown,
      html:rendered.html,
      dossier:rendered.dossier,
      quality:rendered.quality,
      blueprint,
      brains:{
        forge:!!forge,
        aegis:!!aegis,
        parallax:!!parallax,
        councilX10:!!council,
        chair:true,
        repaired
      }
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return Response.json({error:String(error?.message||'Falha ao gerar relatório com IA.')},{status:500});
  }
}
