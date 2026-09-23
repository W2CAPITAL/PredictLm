export const runtime = 'nodejs';

export async function GET(){
  return Response.json({
    ok:true,
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
    optional:{
      firecrawl:Boolean(process.env.FIRECRAWL_API_KEY),
      serverAI:Boolean(process.env.AI_BASE_URL&&process.env.AI_API_KEY&&process.env.AI_MODEL)
    },
    time:new Date().toISOString()
  });
}
