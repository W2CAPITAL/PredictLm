import {FUSION_SOURCES,REQUESTED_FUSION_REPOS,type FusionSurface} from '@/lib/fusion/capability-fabric';

const SURFACE_MODULES:Record<FusionSurface,string[]>={
  chat:[
    'src/app/api/chat/route.ts',
    'src/lib/agent-runtime/agentic-fabric.ts',
    'src/lib/predictlm-master.ts'
  ],
  build:[
    'src/app/api/agent/route.ts',
    'src/lib/build-orchestrator.ts',
    'src/lib/build-reference-playbook.ts',
    'src/lib/unity-fabric.ts'
  ],
  research:[
    'src/app/api/research/route.ts',
    'src/app/api/research/watch/route.ts',
    'src/lib/research-policy.ts',
    'src/lib/web-intelligence.ts'
  ],
  memory:[
    'src/lib/fusion/knowledge-fabric.ts',
    'src/lib/assistant-store.ts',
    'src/lib/cognitive/cognitive-memory.ts'
  ],
  documents:[
    'src/app/api/documents/parse/route.ts',
    'src/lib/documents/pipeline.ts'
  ],
  media:[
    'src/app/api/media/generate/route.ts',
    'src/app/api/media/stylize/route.ts',
    'src/app/api/media/upscale/route.ts',
    'src/lib/media/postprocess-pipeline.ts',
    'src/lib/unity-fabric.ts'
  ],
  video:[
    'src/app/api/media/video/route.ts',
    'src/lib/media/video-pipelines.ts',
    'src/lib/media/postprocess-pipeline.ts',
    'src/lib/unity-fabric.ts'
  ],
  simulation:[
    'src/components/GrokSimulationPanel.tsx',
    'src/components/MinecraftSimulationPanel.tsx',
    'src/lib/game-studio-fabric.ts',
    'src/lib/simulation/emergent-swarm.ts',
    'src/lib/simulation/mirofish-fabric.ts',
    'src/lib/simulation/minecraft-sandbox.ts',
    'src/lib/simulation/minecraft-reference-fabric.ts',
    'src/lib/life-simulation-engine.ts',
    'src/lib/life-simulation-agent.ts',
    'src/lib/unity-fabric.ts',
    'unity/PredictLMSimulation'
  ],
  voice:[
    'src/app/api/voice/route.ts',
    'src/lib/voice/browser-voice.ts',
    'src/lib/fusion/runtime-adapters.ts'
  ],
  browser:[
    'src/app/api/research/route.ts',
    'src/lib/fusion/capability-fabric.ts',
    'src/lib/agent-runtime/agentic-fabric.ts'
  ]
};

export function fusionImplementationAudit(){
  const byRepo=new Map(FUSION_SOURCES.map(source=>[source.repo,source]));
  const rows=REQUESTED_FUSION_REPOS.map(repo=>{
    const source=byRepo.get(repo);
    if(!source){
      return {
        repo,
        registered:false,
        mode:'missing',
        surfaces:[],
        modules:[],
        effect:'missing from capability fabric'
      };
    }
    const modules=Array.from(new Set(source.areas.flatMap(area=>SURFACE_MODULES[area]||[])));
    return {
      repo,
      registered:true,
      mode:source.mode,
      surfaces:source.areas,
      modules,
      effect:source.ideas.slice(0,4).join('; ')
    };
  });
  const missing=rows.filter(row=>!row.registered).map(row=>row.repo);
  const surfaceCoverage=Object.fromEntries(
    (Object.keys(SURFACE_MODULES) as FusionSurface[]).map(surface=>[
      surface,
      {
        sources:FUSION_SOURCES.filter(source=>source.areas.includes(surface)).length,
        modules:SURFACE_MODULES[surface]
      }
    ])
  );
  return {
    expected:REQUESTED_FUSION_REPOS.length,
    registered:rows.length-missing.length,
    complete:missing.length===0,
    missing,
    rows,
    surfaceCoverage
  };
}
