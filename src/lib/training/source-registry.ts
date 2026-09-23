export type TrainingUse='train'|'distill'|'reference';

export interface TrainingSource{
  repo:string;
  license:string;
  use:TrainingUse;
  domains:string[];
  lessons:string[];
}

export const TRAINING_SOURCES:TrainingSource[]=[
  {repo:'assistant-ui/assistant-ui',license:'MIT',use:'train',domains:['chat','ui','tools'],lessons:['composable chat primitives','streaming/retry/attachments','typed tools and human approvals']},
  {repo:'OvidijusParsiunas/deep-chat',license:'MIT',use:'train',domains:['chat','browser-model','session'],lessons:['provider-neutral chat','browser model hosting','browser session recovery','speech/files']},
  {repo:'EniasCailliau/GirlfriendGPT',license:'unverified',use:'reference',domains:['persona','memory'],lessons:['persona and memory architecture only; no source-code training without a license']},
  {repo:'LiveHelperChat/livehelperchat',license:'Apache-2.0',use:'train',domains:['support','chat','operations'],lessons:['operator queues','multi-channel support','high-volume chat operations']},
  {repo:'nextlevelbuilder/ui-ux-pro-max-skill',license:'MIT',use:'train',domains:['design','ui','ux'],lessons:['design hierarchy','spacing/typography','stateful polished UI']},
  {repo:'snorkelingcode/Embody-Unreal-Engine-Source',license:'unverified',use:'reference',domains:['embodiment','realtime'],lessons:['real-time embodied interaction architecture only']},
  {repo:'Someshdiwan/How-Transformer-LLMs-Work',license:'Apache-2.0',use:'train',domains:['llm','training','transformers'],lessons:['transformer mechanics','token generation','training workflow']},
  {repo:'Matrixxboy/Psymitrix',license:'MIT',use:'train',domains:['conversation','emotion','product'],lessons:['emotion-aware UX','supportive conversation state','history and personalization']},
  {repo:'24kchengYe/human-skill-tree',license:'NOASSERTION',use:'reference',domains:['curriculum','skills','learning'],lessons:['skill graph and curriculum structure only']},
  {repo:'cporter202/automate-for-growth',license:'unverified',use:'reference',domains:['automation','content','growth'],lessons:['automation workflow decomposition only']},
  {repo:'microsoft/AI-For-Beginners',license:'MIT',use:'train',domains:['ai','ml','fundamentals'],lessons:['AI foundations','neural networks','responsible AI']},
  {repo:'fjosue4/deprecated-google-gemini-ui',license:'MIT',use:'train',domains:['chat','gemini','ui'],lessons:['simple provider chat UI','message lifecycle','model adapter boundaries']},
  {repo:'ruvnet/ruflo',license:'MIT',use:'train',domains:['agents','memory','federation','rag'],lessons:['agent orchestration','adaptive memory','self-improvement','federation','vector/RAG patterns']},
  {repo:'truongnh1992/gemini-ai-code-reviewer',license:'MIT',use:'train',domains:['code-review','github','quality'],lessons:['automated code review','PR context','actionable findings']},
  {repo:'Addy-shetty/Vibe-Prompting',license:'MIT',use:'train',domains:['prompting','streaming','supabase'],lessons:['prompt transformation','specialized prompt modes','streaming UX']},
  {repo:'siddharthsky/AI-Video-Summarizer',license:'MIT',use:'train',domains:['video','summarization','multimodal'],lessons:['video-to-summary pipeline','timestamps','provider abstraction']},
  {repo:'ishara-madu/gemini-watermark-remover',license:'MIT',use:'distill',domains:['media','client-processing'],lessons:['client-side image/video pixel processing and worker patterns; provenance/watermarks remain protected']},
  {repo:'lcandy2/enable-chrome-ai',license:'MIT',use:'distill',domains:['browser-ai','capability-detection'],lessons:['browser-native AI capability discovery and graceful feature gating; do not patch eligibility or bypass browser controls']},
  {repo:'google/langextract',license:'Apache-2.0',use:'train',domains:['extraction','grounding','documents'],lessons:['source-grounded extraction','schema outputs','chunking/parallel passes','traceable spans']},
  {repo:'PublicAffairs/openai-gemini',license:'MIT',use:'train',domains:['providers','openai-compatible','gemini'],lessons:['OpenAI-compatible adapter','serverless provider proxy','tool/media mapping']},
  {repo:'raizamartin/gemini-code',license:'unverified',use:'reference',domains:['coding-agent','tools','terminal'],lessons:['terminal coding-assistant architecture','automatic file/command/test tool loop; no source-code training without a declared license']},
  {repo:'iamakashpc/Gemini-Clone',license:'unverified',use:'reference',domains:['chat','gemini','ui'],lessons:['basic conversational shell and typing feedback; architecture reference only until licensing is declared']},
  {repo:'RanitManik/Gemini-Clone',license:'MIT',use:'train',domains:['chat','gemini','ui'],lessons:['responsive conversational shell','typing/streaming feedback','provider-key setup boundary']},
  {repo:'GourangaDasSamrat/Gemini-Clone',license:'MIT',use:'train',domains:['chat','gemini','markdown','ui'],lessons:['responsive AI chat','markdown/code rendering','error feedback and cross-platform interaction']},
  {repo:'C0deNe0/gemini-clone',license:'unverified',use:'reference',domains:['chat','vite','ui'],lessons:['minimal Vite/React shell reference only; no source-code training without a declared license']},
  {repo:'MAHMOUDELSAYED7/Dr.Ai',license:'unverified',use:'reference',domains:['assistant','mobile','firebase','privacy'],lessons:['multi-surface assistant architecture, local history, auth/data boundaries and emergency UX as reference only']},
  {repo:'srtab/daiv',license:'Apache-2.0',use:'train',domains:['coding-agent','git','mcp','sandbox','ci'],lessons:['issue-to-PR execution loop','review-comment repair','CI failure repair','sandbox and egress policy','skills and MCP endpoints']},
  {repo:'ekramasif/GeminiCoder',license:'unverified',use:'reference',domains:['app-builder','gemini','preview'],lessons:['idea-to-code and live-preview flow as architecture reference only until licensing is declared']},
  {repo:'assistants-hub/assistantshub.ai',license:'MIT',use:'train',domains:['assistants','multi-provider','analytics','documents','functions'],lessons:['assistant management portal','streaming and conversation logs','multi-provider model catalog','document/function integration','assistant analytics']},
  {repo:'user/PredictLm-fixes-only',license:'user-owned',use:'train',domains:['build','validation','media','packaging'],lessons:['backend validation','real CRUD/API boundaries','smoke tests','high-quality media regeneration with unique variants']}
];

export function trainingSourceStats(){
  const stats={total:TRAINING_SOURCES.length,train:0,distill:0,reference:0};
  for(const source of TRAINING_SOURCES)stats[source.use]++;
  return stats;
}
