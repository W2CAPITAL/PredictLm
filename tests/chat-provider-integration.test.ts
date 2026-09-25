import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/chat/route';
import {resetProviderHealthForTests} from '../src/lib/server/provider-health';
import {conversationAnswerIssue} from '../src/lib/chat-intelligence';

const providerEnv=['AI_BASE_URL','AI_API_KEY','AI_MODEL','AI_GATEWAY_API_KEY','AI_GATEWAY_MODEL','OPENAI_API_KEY','OPENAI_MODEL','XAI_API_KEY','XAI_MODEL','GROQ_API_KEY','GROQ_MODEL','OPENROUTER_API_KEY','OPENROUTER_MODEL','OPENCODE_API_KEY','OPENCODE_MODEL','NVIDIA_API_KEY','NVIDIA_MODEL','NVIDIA_BASE_URL','DEEPSEEK_API_KEY','DEEPSEEK_MODEL','DEEPSEEK_BASE_URL','KIMI_API_KEY','KIMI_MODEL','ZAI_API_KEY','ZAI_MODEL','MINIMAX_API_KEY','MINIMAX_MODEL','GEMINI_API_KEY','GEMINI_MODEL','GEMINI_BASE_URL','ANTHROPIC_API_KEY','ANTHROPIC_MODEL','ANTHROPIC_BASE_URL','ARK_API_KEY','ARK_MODEL','OLLAMA_BASE_URL','OLLAMA_MODEL','FREELLMAPI_BASE_URL','FREELLMAPI_API_KEY','FREELLMAPI_MODEL','PREDICTLM_PROVIDER_ORDER','VERCEL_OIDC_TOKEN'];

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


function isolateSingleProvider(name:'nvidia'|'gemini'|'anthropic'|'deepseek'){
  for(const key of providerEnv)delete process.env[key];
  if(name==='nvidia'){
    process.env.NVIDIA_API_KEY='nvidia-test-key';
    process.env.NVIDIA_BASE_URL='https://integrate.api.nvidia.com/v1';
    process.env.NVIDIA_MODEL='nvidia/nemotron-3.5-lightning-30b-a3b';
  }else if(name==='gemini'){
    process.env.GEMINI_API_KEY='gemini-test-key';
    process.env.GEMINI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai';
    process.env.GEMINI_MODEL='gemini-3.8-flash';
  }else if(name==='anthropic'){
    process.env.ANTHROPIC_API_KEY='anthropic-test-key';
    process.env.ANTHROPIC_BASE_URL='https://api.anthropic.com/v1';
    process.env.ANTHROPIC_MODEL='claude-sonnet-4-6';
  }else{
    process.env.DEEPSEEK_API_KEY='deepseek-test-key';
    process.env.DEEPSEEK_BASE_URL='https://api.deepseek.com/v1'; // legacy value: route must normalize it
    process.env.DEEPSEEK_MODEL='deepseek-flash';
  }
  process.env.PREDICTLM_PROVIDER_ORDER=name;
  resetProviderHealthForTests();
}

function mockOpenAICompatible(spec:{
  provider:'nvidia'|'gemini'|'deepseek';
  url:string;
  key:string;
  model:string;
}){
  const calls:any[]=[];
  const original=globalThis.fetch;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    assert.equal(url,spec.url);
    const headers=init?.headers as Record<string,string>;
    assert.equal(String(headers?.Authorization||''),'Bearer '+spec.key);
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,spec.model);
    assert.equal(body.stream,false);
    assert.ok(Array.isArray(body.messages));
    if(spec.provider==='nvidia'){
      assert.deepEqual(body.chat_template_kwargs,{enable_thinking:false});
    }
    const prompt=[...body.messages].reverse().find((x:any)=>x.role==='user')?.content||'';
    calls.push({url,headers,body,prompt});
    return new Response(JSON.stringify({
      choices:[{message:{content:'A Lua apresenta fases porque vemos porções diferentes de sua metade iluminada pelo Sol enquanto ela orbita a Terra.'}}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  return {calls,restore:()=>{globalThis.fetch=original}};
}

function mockAnthropic(){
  const calls:any[]=[];
  const original=globalThis.fetch;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    const url=String(input);
    assert.equal(url,'https://api.anthropic.com/v1/messages');
    const headers=init?.headers as Record<string,string>;
    assert.equal(String(headers?.['x-api-key']||''),'anthropic-test-key');
    assert.equal(String(headers?.['anthropic-version']||''),'2023-06-01');
    assert.equal(String(headers?.Authorization||''),'');
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,'claude-sonnet-4-6');
    assert.ok(typeof body.system==='string'&&body.system.length>20);
    assert.ok(Array.isArray(body.messages));
    assert.equal(body.messages.some((x:any)=>x.role==='system'),false);
    calls.push({url,headers,body});
    return new Response(JSON.stringify({
      content:[{type:'text',text:'A Lua apresenta fases porque vemos porções diferentes de sua metade iluminada pelo Sol enquanto ela orbita a Terra.'}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  return {calls,restore:()=>{globalThis.fetch=original}};
}

test('NVIDIA Nemotron adapter uses NVIDIA OpenAI-compatible chat completions',async()=>{
  isolateSingleProvider('nvidia');
  const mock=mockOpenAICompatible({
    provider:'nvidia',
    url:'https://integrate.api.nvidia.com/v1/chat/completions',
    key:'nvidia-test-key',
    model:'nvidia/nemotron-3.5-lightning-30b-a3b'
  });
  try{
    const {response,data}=await ask('Explique por que a Lua tem fases.');
    assert.equal(response.status,200);
    assert.equal(data.provider,'nvidia');
    assert.equal(data.model,'nvidia/nemotron-3.5-lightning-30b-a3b');
    assert.match(data.content,/Lua|Sol|Terra/i);
    assert.equal(mock.calls.length,1);
  }finally{mock.restore()}
});

test('Gemini adapter uses Google OpenAI compatibility endpoint',async()=>{
  isolateSingleProvider('gemini');
  const mock=mockOpenAICompatible({
    provider:'gemini',
    url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key:'gemini-test-key',
    model:'gemini-3.8-flash'
  });
  try{
    const {response,data}=await ask('Explique por que a Lua tem fases.');
    assert.equal(response.status,200);
    assert.equal(data.provider,'gemini');
    assert.equal(data.model,'gemini-3.8-flash');
    assert.match(data.content,/Lua|Sol|Terra/i);
    assert.equal(mock.calls.length,1);
  }finally{mock.restore()}
});

test('DeepSeek adapter uses OpenAI-compatible chat completions',async()=>{
  isolateSingleProvider('deepseek');
  const mock=mockOpenAICompatible({
    provider:'deepseek',
    url:'https://api.deepseek.com/chat/completions',
    key:'deepseek-test-key',
    model:'deepseek-flash'
  });
  try{
    const {response,data}=await ask('Explique por que a Lua tem fases.');
    assert.equal(response.status,200);
    assert.equal(data.provider,'deepseek');
    assert.equal(data.model,'deepseek-flash');
    assert.match(data.content,/Lua|Sol|Terra/i);
    assert.equal(mock.calls.length,1);
  }finally{mock.restore()}
});

test('Claude adapter uses Anthropic Messages API contract',async()=>{
  isolateSingleProvider('anthropic');
  const mock=mockAnthropic();
  try{
    const {response,data}=await ask('Explique por que a Lua tem fases.');
    assert.equal(response.status,200);
    assert.equal(data.provider,'anthropic');
    assert.equal(data.model,'claude-sonnet-4-6');
    assert.match(data.content,/Lua|Sol|Terra/i);
    assert.equal(mock.calls.length,1);
  }finally{mock.restore()}
});


test('NVIDIA Nemotron DeepThink uses thinking_token_budget with room for visible output',async()=>{
  isolateSingleProvider('nvidia');
  const original=globalThis.fetch;
  let seen=false;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://integrate.api.nvidia.com/v1/chat/completions');
    const headers=init?.headers as Record<string,string>;
    assert.equal(String(headers?.Authorization||''),'Bearer nvidia-test-key');
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,'nvidia/nemotron-3.5-lightning-30b-a3b');
    assert.deepEqual(body.chat_template_kwargs,{enable_thinking:true});
    assert.equal(typeof body.thinking_token_budget,'number');
    assert.ok(body.thinking_token_budget>0);
    assert.ok(body.max_tokens>body.thinking_token_budget);
    assert.equal('reasoning_budget' in body,false);
    seen=true;
    return new Response(JSON.stringify({
      choices:[{message:{content:'A Lua apresenta fases porque vemos porções diferentes de sua metade iluminada pelo Sol enquanto ela orbita a Terra.'}}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const req=new Request('http://predictlm.test/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        prompt:'Explique por que a Lua tem fases.',
        language:'pt-BR',
        messages:[],
        researchContext:'',
        deep:true
      })
    });
    const response=await POST(req);
    const data=await response.json();
    assert.equal(response.status,200);
    assert.equal(data.provider,'nvidia');
    assert.equal(seen,true);
  }finally{globalThis.fetch=original}
});


test('Vercel OIDC keeps online chat on an API when no manual provider key exists',async()=>{
  for(const key of providerEnv)delete process.env[key];
  process.env.VERCEL_OIDC_TOKEN='oidc-test-token';
  process.env.PREDICTLM_PROVIDER_ORDER='vercel-gateway';
  resetProviderHealthForTests();

  const original=globalThis.fetch;
  const calls:any[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://ai-gateway.vercel.sh/v1/chat/completions');
    const headers=init?.headers as Record<string,string>;
    assert.equal(String(headers?.Authorization||''),'Bearer oidc-test-token');
    const body=JSON.parse(String(init?.body||'{}'));
    assert.equal(body.model,'nvidia/nemotron-3.5-lightning');
    const prompt=[...body.messages].reverse().find((x:any)=>x.role==='user')?.content||'';
    calls.push({body,prompt});
    return new Response(JSON.stringify({
      choices:[{message:{content:'Moscas se comunicam principalmente por sinais químicos, movimentos e vibrações. Feromônios ajudam a sinalizar reprodução e outros estados, enquanto postura e movimento também transmitem informação.'}}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const {response,data}=await ask('Como uma mosca se comunica?');
    assert.equal(response.status,200);
    assert.equal(data.provider,'vercel-gateway');
    assert.equal(data.model,'nvidia/nemotron-3.5-lightning');
    assert.match(data.content,/químic|moviment|vibra/i);
    assert.equal(calls.length,1);
  }finally{globalThis.fetch=original}
});

test('purchase-location wording stays a direct provider turn instead of encyclopedia retrieval',async()=>{
  for(const key of providerEnv)delete process.env[key];
  process.env.VERCEL_OIDC_TOKEN='oidc-test-token';
  process.env.PREDICTLM_PROVIDER_ORDER='vercel-gateway';
  resetProviderHealthForTests();

  const original=globalThis.fetch;
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://ai-gateway.vercel.sh/v1/chat/completions');
    const body=JSON.parse(String(init?.body||'{}'));
    const prompt=[...body.messages].reverse().find((x:any)=>x.role==='user')?.content||'';
    assert.match(String(prompt),/Onde compro um McDonald/i);
    return new Response(JSON.stringify({
      choices:[{message:{content:'Se você quer comprar comida do McDonald’s, use o app/site oficial ou procure a unidade mais próxima. Se quis dizer comprar uma franquia McDonald’s, é outro processo e envolve candidatura à rede.'}}]
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const {response,data}=await ask('Onde compro um McDonald\'s?');
    assert.equal(response.status,200);
    assert.equal(data.provider,'vercel-gateway');
    assert.match(data.content,/comida|unidade|franquia/i);
    assert.doesNotMatch(data.content,/fundad[ao] em 1940|Richard|Maurice/i);
  }finally{globalThis.fetch=original}
});


test('normal game conversation stays on clean provider chat with history and no RAG dump',async()=>{
  for(const key of providerEnv)delete process.env[key];
  process.env.VERCEL_OIDC_TOKEN='oidc-test-token';
  process.env.PREDICTLM_PROVIDER_ORDER='vercel-gateway';
  resetProviderHealthForTests();

  const original=globalThis.fetch;
  const seen:any[]=[];
  globalThis.fetch=async(input:any,init?:RequestInit)=>{
    assert.equal(String(input),'https://ai-gateway.vercel.sh/v1/chat/completions');
    const body=JSON.parse(String(init?.body||'{}'));
    const messages=Array.isArray(body.messages)?body.messages:[];
    const prompt=[...messages].reverse().find((x:any)=>x.role==='user')?.content||'';
    seen.push(messages);

    let content='Você pode começar pequeno: escolha uma engine, faça um protótipo com movimento, uma mecânica principal e uma fase curta; depois adicione arte, som e progressão.';
    if(String(prompt).includes('quadradão')){
      const hasGameContext=messages.some((x:any)=>/jogo|game/i.test(String(x.content||'')));
      assert.equal(hasGameContext,true);
      content='Se você quer o visual todo quadradão, dá para seguir uma estética voxel/blocky: personagem cúbico, cenário em blocos, texturas simples e animações curtas. Isso combina bem com um jogo estilizado.';
    }else if(/tycoon/i.test(String(prompt))){
      content='Para um game tycoon, faça o loop básico ganhar dinheiro → investir → desbloquear melhorias → aumentar produção. Comece com uma loja ou fábrica simples e uma interface clara de caixa, upgrades e metas.';
    }else if(/terror/i.test(String(prompt))){
      content='Para um jogo de terror, comece por uma mecânica central simples, como explorar um local enquanto algo persegue o jogador. Trabalhe iluminação, som, ritmo, pistas e momentos de tensão antes de aumentar o mapa.';
    }

    return new Response(JSON.stringify({choices:[{message:{content}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  };

  try{
    const a=await ask('Como posso criar um jogo');
    assert.equal(a.response.status,200);
    assert.equal(a.data.provider,'vercel-gateway');
    assert.deepEqual(a.data.sources,[]);
    assert.doesNotMatch(a.data.content,/Relacionado:|Skill|GitHub Knowledge/i);

    const history=[
      {role:'user',content:'Como posso criar um jogo'},
      {role:'assistant',content:a.data.content}
    ];
    const b=await ask('Eu queria ser todo quadradão','clean',history);
    assert.equal(b.response.status,200);
    assert.match(b.data.content,/voxel|blocky|cúbico/i);
    assert.doesNotMatch(b.data.content,/Relacionado:|Neo4j|Terraform|Skill/i);

    const c1=await ask('Como posso criar um game tycoon');
    assert.equal(c1.response.status,200);
    assert.match(c1.data.content,/dinheiro|investir|produção|upgrades/i);
    assert.doesNotMatch(c1.data.content,/Cross-Engine Agents|Higgsfield|Relacionado:/i);

    const d=await ask('Como posso criar um jogo de terror');
    assert.equal(d.response.status,200);
    assert.match(d.data.content,/terror|tensão|iluminação|som/i);
    assert.doesNotMatch(d.data.content,/SuperWEIRD|Relacionado:|Life Simulation Skill/i);

    assert.ok(seen.length>=4);
  }finally{globalThis.fetch=original}
});

test('normal chat rejects internal context leakage',()=>{
  const leak='Relacionado: Tasks\nPredictLM Life Simulation Skill\nCross-Engine Agents';
  assert.equal(conversationAnswerIssue('Como posso criar um jogo',leak),'internal-context-leak');
});


test('clean chat without server providers returns a real failure instead of fake internal success',async()=>{
  for(const key of providerEnv)delete process.env[key];
  resetProviderHealthForTests();
  const {response,data}=await ask('Eu gosto de batatas');
  assert.equal(response.status,503);
  assert.equal(data.code,'NO_REMOTE_PROVIDER');
  assert.equal(data.content,null);
  assert.doesNotMatch(JSON.stringify(data),/knowledge packs|providers externos permanecem opcionais/i);
});
