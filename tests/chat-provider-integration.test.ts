import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/chat/route';
import {resetProviderHealthForTests} from '../src/lib/server/provider-health';

const providerEnv=['AI_BASE_URL','AI_API_KEY','AI_MODEL','AI_GATEWAY_API_KEY','AI_GATEWAY_MODEL','OPENAI_API_KEY','OPENAI_MODEL','XAI_API_KEY','XAI_MODEL','GROQ_API_KEY','GROQ_MODEL','OPENROUTER_API_KEY','OPENROUTER_MODEL','OPENCODE_API_KEY','OPENCODE_MODEL','NVIDIA_API_KEY','NVIDIA_MODEL','DEEPSEEK_API_KEY','DEEPSEEK_MODEL','KIMI_API_KEY','KIMI_MODEL','ZAI_API_KEY','ZAI_MODEL','MINIMAX_API_KEY','MINIMAX_MODEL','GEMINI_API_KEY','GEMINI_MODEL','ANTHROPIC_API_KEY','ANTHROPIC_MODEL','ARK_API_KEY','ARK_MODEL','OLLAMA_BASE_URL','OLLAMA_MODEL'];

function isolateFreeLLM(){
  for(const key of providerEnv)delete process.env[key];
  process.env.FREELLMAPI_BASE_URL='https://freellm.test';
  process.env.FREELLMAPI_API_KEY='freellmapi-test-key';
  process.env.FREELLMAPI_MODEL='auto';
  process.env.PREDICTLM_PROVIDER_ORDER='freellmapi';
  resetProviderHealthForTests();
}

function providerAnswer(prompt:string){
  const p=prompt.toLowerCase();
  if(p.includes('bob esponja'))return 'Bob Esponja é o personagem principal da série animada SpongeBob SquarePants, criada por Stephen Hillenburg. Ele vive na Fenda do Biquíni e trabalha no Siri Cascudo.';
  if(p.includes('capital da frança'))return 'Paris.';
  if(p.includes('17')&&p.includes('23'))return '391';
  if(p.includes('tamanduá')||p.includes('tamandua'))return 'Para construir um tamanduá robô, comece por um chassi leve com rodas, dois motores com redução e uma controladora. Depois adicione sensores no focinho, servos para cabeça e cauda, bateria protegida e programe locomoção e desvio de obstáculos. Teste alimentação, motores, sensores e carenagem separadamente antes da montagem final.';
  if(p.includes('poema')&&p.includes('saudade'))return 'Na janela ficou teu nome,\nquieto na luz do fim do dia;\na distância aprende silêncio,\nmas a memória ainda caminha.';
  if(p.includes('typescript')&&p.includes('agrupe'))return 'Use reduce sem alterar a entrada:\n\nconst groupByStatus = (orders: {status:string}[]) => orders.reduce<Record<string, typeof orders>>((acc, order) => { (acc[order.status] ??= []).push({...order}); return acc; }, {});\n\nPercorre a lista uma vez: O(n) no tempo e O(n) no espaço para o resultado.';
  return 'Resposta útil e diretamente relacionada ao pedido do usuário.';
}

function mockFreeLLM(){
  const calls:{url:string;auth:string;model:string;prompt:string}[]=[];
  const original=globalThis.fetch;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    assert.equal(url,'https://freellm.test/v1/chat/completions');
    const auth=String((init?.headers as any)?.Authorization||'');
    assert.equal(auth,'Bearer freellmapi-test-key');
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,'auto');
    const messages=Array.isArray(body.messages)?body.messages:[];
    const system=messages.filter((x:any)=>x.role==='system').map((x:any)=>String(x.content||'')).join('\n');
    const prompt=[...messages].reverse().find((x:any)=>x.role==='user')?.content||'';
    calls.push({url,auth,model:String(body.model),prompt:String(prompt)});
    if(system.includes('independent answer reviewer')){
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({approved:true,confidence:0.98,issues:[],missing:[]})}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    return new Response(JSON.stringify({choices:[{message:{content:providerAnswer(String(prompt))}}]}),{status:200,headers:{'Content-Type':'application/json','X-Routed-Via':'test/free-model'}});
  };
  return {calls,restore:()=>{globalThis.fetch=original}};
}

async function ask(prompt:string,mode:'clean'|'full'='clean',messages:any[]=[]){
  const req=new Request('http://predictlm.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    ...(mode==='clean'?{mode:'clean-chat',useHistory:true}:{}),
    prompt,language:'pt-BR',messages,researchContext:'',deep:false
  })});
  const response=await POST(req);
  return {response,data:await response.json()};
}

test('FreeLLMAPI uses the OpenAI-compatible /v1 contract',async()=>{
  isolateFreeLLM();
  const mock=mockFreeLLM();
  try{
    const {response,data}=await ask('Quem é Bob Esponja?');
    assert.equal(response.status,200);
    assert.equal(data.provider,'freellmapi');
    assert.equal(data.model,'auto');
    assert.match(data.content,/Bob Esponja/i);
    assert.equal(mock.calls.length,1);
    assert.equal(mock.calls[0].url,'https://freellm.test/v1/chat/completions');
    assert.equal(mock.calls[0].auth,'Bearer freellmapi-test-key');
  }finally{mock.restore()}
});

test('clean chat accepts concise factual and arithmetic answers',async()=>{
  isolateFreeLLM();
  const mock=mockFreeLLM();
  try{
    const capital=await ask('Qual é a capital da França?');
    assert.equal(capital.response.status,200);
    assert.equal(capital.data.provider,'freellmapi');
    assert.equal(capital.data.content,'Paris.');
    const math=await ask('Quanto é 17 * 23?');
    assert.equal(math.response.status,200);
    assert.equal(math.data.provider,'freellmapi');
    assert.match(math.data.content,/391/);
  }finally{mock.restore()}
});

test('FreeLLM handles creative and procedural prompts instead of canned fallbacks',async()=>{
  isolateFreeLLM();
  const mock=mockFreeLLM();
  try{
    const creative=await ask('Escreva um poema curto sobre saudade');
    assert.equal(creative.response.status,200);
    assert.equal(creative.data.provider,'freellmapi');
    assert.match(creative.data.content,/janela|memória/i);
    const robot=await ask('Como faço um tamanduá robô?');
    assert.equal(robot.response.status,200);
    assert.equal(robot.data.provider,'freellmapi');
    assert.match(robot.data.content,/chassi|motores|sensores/i);
    assert.doesNotMatch(robot.data.content,/Defina exatamente o resultado final e a escala/);
  }finally{mock.restore()}
});

test('full PredictLM route keeps FreeLLM as the answer provider',async()=>{
  isolateFreeLLM();
  const mock=mockFreeLLM();
  try{
    const {response,data}=await ask('Escreva uma função TypeScript que agrupe uma lista de pedidos por status sem mutar o array original. Explique a complexidade.','full',[{role:'user',content:'Estou trabalhando numa lista de pedidos.'}]);
    assert.equal(response.status,200);
    assert.equal(data.provider,'freellmapi');
    assert.match(data.content,/reduce|O\(n\)/i);
    assert.ok(mock.calls.length>=1);
  }finally{mock.restore()}
});

test('provider failure remains a failure so ChatShell can continue to local/Qwen',async()=>{
  isolateFreeLLM();
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'temporary failure'}),{status:503,headers:{'Content-Type':'application/json'}});
  try{
    const {response,data}=await ask('Explique uma ideia curiosa sobre robótica');
    assert.equal(response.status,502);
    assert.equal(data.code,'NO_CLEAN_ANSWER');
    assert.equal(data.content,null);
  }finally{globalThis.fetch=original}
});
