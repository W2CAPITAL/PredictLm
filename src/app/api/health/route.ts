import { runPredictCore } from '@/lib/predict-core';
import { runLocalSmokeTest } from '@/lib/local-tools';

export const runtime = 'nodejs';

export async function GET(){
  const generated=runPredictCore('crie uma calculadora premium',[],'max');
  const calculatorSmoke=runLocalSmokeTest(generated.files);
  return Response.json({
    ok:calculatorSmoke.ok,
    service:'predictlm-studio',
    version:4,
    mode:'local-first',
    zeroApi:{
      deepThink:true,
      council:true,
      knowledgeGraph:true,
      visualInspect:true,
      projectImportExport:true,
      freeResearch:true
    },
    selfTest:{
      intent:generated.spec?.intent,
      calculatorScore:calculatorSmoke.score,
      checks:calculatorSmoke.checks
    },
    optional:{
      firecrawl:Boolean(process.env.FIRECRAWL_API_KEY),
      serverAI:Boolean(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL)
    },
    time:new Date().toISOString()
  });
}
