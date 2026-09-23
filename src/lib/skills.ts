import type { SkillSpec } from './types';

export const skills: SkillSpec[] = [
  { id:'second-brain', name:'Segundo Cérebro', category:'Memory', description:'Recall → execute → capture. Memória local-first para decisões, notas e runs.', source:'uploaded:segundo-cerebro', runtime:'built-in' },
  { id:'vercel-skills', name:'Vercel Agent Skills', category:'Build', description:'Padrões de skill packaging, deploy e agentes para projetos web.', source:'vercel-labs/skills + agent-skills', runtime:'built-in' },
  { id:'agent-browser', name:'Agent Browser', category:'Browser', description:'Bridge para navegação e validação browser-driven quando um runtime local/MCP estiver conectado.', source:'vercel-labs/agent-browser', runtime:'bridge' },
  { id:'impeccable', name:'Impeccable UI Audit', category:'Design', description:'Checklist de consistência visual, densidade, contraste e qualidade antes do ship.', source:'pbakaus/impeccable', runtime:'built-in' },
  { id:'datajud', name:'DataJud + DJEN', category:'Legal', description:'Conector de pesquisa processual pública e diário eletrônico.', source:'rvsanches/skills-datajud-djen + abjur/datajudScraper + ulisses-jurisdev/datajud-process-scraper', runtime:'external' },
  { id:'djen', name:'DJEN Workflow', category:'Legal', description:'Workflow para publicação, extração e triagem do DJEN.', source:'sobeitnow0/extensao-djen-advogado', runtime:'external' },
  { id:'apk', name:'APK Inspector', category:'Mobile', description:'Pipeline de inspeção de APK e artefatos Android em ambiente local.', source:'SyscallX-18113/Apkx-Hunter', runtime:'bridge' },
  { id:'llamacpp', name:'llama.cpp Local', category:'AI', description:'Runtime local opcional para modelos GGUF em máquinas compatíveis.', source:'PrismML-Eng/llama.cpp', runtime:'bridge' },
  { id:'bonsai', name:'Bonsai Local Vision', category:'AI', description:'Bridge experimental para geração/visão local quando disponível.', source:'PrismML-Eng/Bonsai-Image-Demo + Bonsai-demo', runtime:'bridge' },
  { id:'heygen', name:'HeyGen Production', category:'Media', description:'Skills, CLI e padrões de vídeo/avatar para pipelines externos.', source:'heygen-com/skills + heygen-cli + hyperframes + liveavatar demos', runtime:'external' },
  { id:'davinci', name:'DaVinci Resolve MCP', category:'Media', description:'Bridge para edição e automação no DaVinci Resolve instalado localmente.', source:'hiteshK03/davinci-resolve-mcp', runtime:'bridge' },
  { id:'cinema', name:'AI Cinema Studio', category:'Media', description:'Planejamento de cenas, shots, render e montagem.', source:'poptechstudio/ai-cinema-studio-engine + ClipMakeAI/ClipMake.ai', runtime:'external' },
  { id:'nano', name:'Image Prompt Lab', category:'Media', description:'Biblioteca de prompts e recipes para geração de imagem.', source:'YouMind-OpenLab/awesome-nano-banana-pro-prompts + Kenosis01/Nano-Banana', runtime:'built-in' },
  { id:'snov', name:'Snov Connector', category:'Growth', description:'Conector opcional para workflows comerciais quando o usuário fornece credenciais próprias.', source:'api-evangelist/snov-io', runtime:'external' },
  { id:'browser-ext', name:'Browser Extension Target', category:'Build', description:'Blueprint para gerar extensões Chrome/Edge com Manifest V3.', source:'OpenAnalystInc/10x-Browser-Extension', runtime:'built-in' },
  { id:'grey', name:'GREY Agent Bridge', category:'AI', description:'Ponto de integração com agentes/serviços do ecossistema GREY.', source:'W1CAPITAL/GREY', runtime:'bridge' },
  { id:'redink', name:'RedInk Review', category:'Review', description:'Padrões de crítica, revisão e refinamento orientado a artefatos.', source:'HisMax/RedInk', runtime:'built-in' },
  { id:'promptgen', name:'Prompt Generator', category:'Prompting', description:'Recipes para compor prompts por objetivo e ferramenta.', source:'soulteary/docker-prompt-generator', runtime:'built-in' }
];
